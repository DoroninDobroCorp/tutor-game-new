import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import { json } from "body-parser";
import path from "path";
import fs from "fs";
import { errorHandler } from "./utils/errors";
import authRoutes from "./routes/auth.routes";
import teacherRoutes from "./routes/teacher.routes";
import studentRoutes from "./routes/student.routes";
import chatRoutes from "./routes/chat.routes";
import goalRoutes from "./routes/goal.routes";
import lessonRoutes from "./routes/lesson.routes";
import roadmapRoutes from "./routes/roadmap.routes";
import characterRoutes from "./routes/character.routes";
import storyRoutes from "./routes/story.routes";
import imageRoutes from "./routes/image.routes";
import { config } from "./config/env";
import { WebSocketService } from "./services/websocket.service";

interface ServerWithWebSocket extends http.Server {
  wsService: WebSocketService;
}

export const createServer = () => {
  const app = express();
  const server = http.createServer(app) as ServerWithWebSocket;

  // Initialize WebSocket service with the server instance
  server.wsService = new WebSocketService(server);

  // Make WebSocketService available to controllers via app
  app.set("wsService", server.wsService);

  // Enhanced CORS configuration
  const corsOptions = {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3003",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3003",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Auth-Token",
    ],
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar", "Authorization"],
    maxAge: 86400, // 24 hours
  };

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Apply middlewares
  app.use(cors(corsOptions));
  app.use(json({ limit: "10mb" }));
  app.use(morgan("dev"));

  // Serve static files from uploads directory
  app.use("/uploads", express.static(uploadsDir));

  // Handle favicon.ico requests
  app.get("/favicon.ico", (req, res) => res.status(204).end());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: config.env,
      websockets: server.wsService ? "active" : "inactive",
    });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/teacher", teacherRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/chat", chatRoutes);

  // НОВАЯ, ПРАВИЛЬНАЯ ГРУППИРОВКА
  // Роуты, которые являются дочерними для "goals"
  app.use("/api/goals", goalRoutes); // GET /api/goals, POST /api/goals
  app.use("/api/goals", roadmapRoutes); // POST /api/goals/:goalId/generate-roadmap
  app.use("/api/goals", characterRoutes); // POST /api/goals/:goalId/generate-character

  // Роуты, которые логически относятся к "lessons"
  app.use("/api/lessons", lessonRoutes); // POST /api/lessons/:lessonId/generate-content
  app.use("/api/lessons", storyRoutes); // POST /api/lessons/:lessonId/story/generate

  // Routes for image operations
  app.use("/api/story", imageRoutes); // GET /api/story/generation/:generationId

  // Serve static files from frontend build
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

  // 1. Serve static files (JS, CSS, images)
  app.use(express.static(frontendDistPath));

  // 2. For all other GET requests (except API), serve index.html
  app.get("*", (req, res, next) => {
    // Skip API requests
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });

  // 404 handler (now only for API routes)
  app.use((req, res) => {
    // Only handle API paths
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Cannot ${req.method} ${req.path}`,
      });
    }
    // For all other cases, we've already sent index.html
    // No need to call next() as we've handled all cases
  });

  // Error handling
  app.use(errorHandler);

  // Return both the Express app and HTTP server
  return { app, server };
};
