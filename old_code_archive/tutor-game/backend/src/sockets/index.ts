import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export const attachSockets = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('joinStudentRoom', (studentId: string) => {
      socket.join(studentId);
      console.log(`Student ${studentId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return {
    emitProgress: (studentId: string, payload: any) => {
      io.to(studentId).emit('progress', payload);
    },
  };
};

export type SocketIO = ReturnType<typeof attachSockets>;
