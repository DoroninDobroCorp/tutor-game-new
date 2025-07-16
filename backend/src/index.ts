import 'dotenv/config';
import { createServer } from './app';
import './utils/logger'; // Import to register global exception handlers

const PORT = process.env.PORT || '3002';

// Create and configure the server with Express app and WebSocket
const { server } = createServer();

// WebSocket is already initialized inside createServer() via WebSocketService

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Unhandled exception handlers are now moved to utils/logger.ts
