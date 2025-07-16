import 'dotenv/config';
import { createServer } from './app';
import { logger } from './utils/logger'; // This import also registers the global error handlers

const PORT = process.env.PORT || '3002';

// Create and configure the server with Express app and WebSocket
const { server } = createServer();

// WebSocket is already initialized inside createServer()

// This handles server startup errors (like EADDRINUSE). Without this, the
// process would hang instead of exiting, preventing the restart script from working.
server.on('error', (error: NodeJS.ErrnoException) => {
    logger.error('Server startup error:', { code: error.code, message: error.message });
    process.exit(1); // Exit to allow start.sh to restart
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Note: Global unhandled exceptions are caught by handlers in 'utils/logger.ts'
