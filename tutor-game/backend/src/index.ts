import 'dotenv/config';
import { createServer } from './app';
import { attachSockets } from './sockets';

const PORT = process.env.PORT || '3002'; // Изменено на 3002, чтобы соответствовать .env

// Create and configure the server with Express app and WebSocket
const { server } = createServer();

// Initialize WebSocket
attachSockets(server);

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
