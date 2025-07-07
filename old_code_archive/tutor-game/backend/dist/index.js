"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const PORT = process.env.PORT || '3002';
// Create and configure the server with Express app and WebSocket
const { server } = (0, app_1.createServer)();
// WebSocket is already initialized inside createServer() via WebSocketService
// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
