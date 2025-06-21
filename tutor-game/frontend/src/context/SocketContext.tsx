import { createContext, useContext } from 'react';
import { Socket } from 'socket.io-client';

// Create context with initial null value
export const SocketContext = createContext<Socket | null>(null);

// Custom hook for easy socket access
export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) {
    // This is expected if the user is not authenticated
    console.warn("useSocket hook was called outside of the SocketProvider. This is expected if the user is not logged in.");
  }
  return socket;
};
