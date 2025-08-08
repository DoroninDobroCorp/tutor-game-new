"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = require("body-parser");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errors_1 = require("./utils/errors");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const teacher_routes_1 = __importDefault(require("./routes/teacher.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const goal_routes_1 = __importDefault(require("./routes/goal.routes"));
const lesson_routes_1 = __importDefault(require("./routes/lesson.routes"));
const roadmap_routes_1 = __importDefault(require("./routes/roadmap.routes"));
const character_routes_1 = __importDefault(require("./routes/character.routes"));
const story_routes_1 = __importDefault(require("./routes/story.routes"));
const image_routes_1 = __importDefault(require("./routes/image.routes"));
const env_1 = require("./config/env");
const websocket_service_1 = require("./services/websocket.service");
const createServer = () => {
    const app = (0, express_1.default)();
    const server = http_1.default.createServer(app);
    // Initialize WebSocket service with the server instance
    server.wsService = new websocket_service_1.WebSocketService(server);
    // Make WebSocketService available to controllers via app
    app.set('wsService', server.wsService);
    // Enhanced CORS configuration
    const corsOptions = {
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3003',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3003'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Content-Length',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-Auth-Token'
        ],
        exposedHeaders: [
            'Content-Length',
            'X-Foo',
            'X-Bar',
            'Authorization'
        ],
        maxAge: 86400 // 24 hours
    };
    // Create uploads directory if it doesn't exist
    const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    // Apply middlewares
    app.use((0, cors_1.default)(corsOptions));
    app.use((0, body_parser_1.json)({ limit: '10mb' }));
    app.use((0, morgan_1.default)('dev'));
    // Serve static files from uploads directory
    app.use('/uploads', express_1.default.static(uploadsDir));
    // Handle favicon.ico requests
    app.get('/favicon.ico', (req, res) => res.status(204).end());
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: env_1.config.env,
            websockets: server.wsService ? 'active' : 'inactive',
        });
    });
    // API Routes
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/teacher', teacher_routes_1.default);
    app.use('/api/student', student_routes_1.default);
    app.use('/api/chat', chat_routes_1.default);
    // НОВАЯ, ПРАВИЛЬНАЯ ГРУППИРОВКА
    // Роуты, которые являются дочерними для "goals"
    app.use('/api/goals', goal_routes_1.default); // GET /api/goals, POST /api/goals
    app.use('/api/goals', roadmap_routes_1.default); // POST /api/goals/:goalId/generate-roadmap
    app.use('/api/goals', character_routes_1.default); // POST /api/goals/:goalId/generate-character
    // Роуты, которые логически относятся к "lessons"
    app.use('/api/lessons', lesson_routes_1.default); // POST /api/lessons/:lessonId/generate-content
    app.use('/api/lessons', story_routes_1.default); // POST /api/lessons/:lessonId/story/generate
    // Routes for image operations
    app.use('/api/story', image_routes_1.default); // GET /api/story/generation/:generationId
    // Serve static files from frontend build
    const frontendDistPath = path_1.default.resolve(__dirname, '../../frontend/dist');
    // 1. Serve static files (JS, CSS, images)
    app.use(express_1.default.static(frontendDistPath));
    // 2. For all other GET requests (except API), serve index.html
    app.get('*', (req, res, next) => {
        // Skip API requests
        if (req.path.startsWith('/api/')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
    });
    // 404 handler (now only for API routes)
    app.use((req, res) => {
        // Only handle API paths
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Cannot ${req.method} ${req.path}`,
            });
        }
        // For all other cases, we've already sent index.html
        // No need to call next() as we've handled all cases
    });
    // Error handling
    app.use(errors_1.errorHandler);
    // Return both the Express app and HTTP server
    return { app, server };
};
exports.createServer = createServer;
