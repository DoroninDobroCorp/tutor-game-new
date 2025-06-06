"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const sockets_1 = require("./sockets");
const PORT = process.env.PORT || '3002'; // Изменено на 3002, чтобы соответствовать .env
// Create and configure the server with Express app and WebSocket
const { server } = (0, app_1.createServer)();
// Initialize WebSocket
(0, sockets_1.attachSockets)(server);
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
