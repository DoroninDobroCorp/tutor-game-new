import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken as authVerifyToken } from './auth.service';
import { Role } from '@prisma/client';
import { config } from '../config/env';
import prisma from '../db';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: Role;
  };
}

export class WebSocketService {
  private io: Server;
  private connectedUsers: Map<string, string> = new Map();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/',
    });

    this.initializeMiddleware();
    this.initializeConnection();
  }

  private initializeMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));
        const decoded = await authVerifyToken(token);
        if (!decoded) return next(new Error('Invalid token'));
        socket.user = { userId: decoded.userId, role: decoded.role };
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private initializeConnection() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.user) return;

      const { userId, role } = socket.user;
      this.connectedUsers.set(userId, socket.id);
      this.io.emit('user_status_change', { userId, status: 'online' });

      socket.on('getUsers', async () => {
        if (!socket.user) return;
        
        try {
          const userSelection = { 
            id: true, 
            email: true, 
            firstName: true, 
            lastName: true, 
            role: true, 
            lastActive: true 
          };
          
          let usersFromDb: any[] = [];
          
          if (socket.user.role === 'TEACHER') {
            const students = await prisma.student.findMany({
              where: { teachers: { some: { userId: socket.user.userId } } },
              select: { user: { select: userSelection } },
            });
            usersFromDb = students.map((s) => s.user);
          } else {
            const teachers = await prisma.teacher.findMany({
              where: { students: { some: { userId: socket.user.userId } } },
              select: { user: { select: userSelection } },
            });
            usersFromDb = teachers.map((t) => t.user);
          }
          
          const usersWithStatus = usersFromDb.map((user) => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role.toLowerCase(),
            isOnline: this.connectedUsers.has(user.id),
            lastSeen: user.lastActive,
          }));
          
          socket.emit('users', usersWithStatus);
        } catch (error) {
          console.error('Error in getUsers:', error);
        }
      });

      socket.on('getMessages', async (data: { userId: string }) => {
        if (!socket.user || !data.userId) return;
        
        try {
          const messages = await prisma.message.findMany({
            where: {
              OR: [
                { senderId: socket.user.userId, recipientId: data.userId },
                { senderId: data.userId, recipientId: socket.user.userId },
              ],
            },
            orderBy: { createdAt: 'asc' },
            include: { 
              sender: { 
                select: { 
                  id: true, 
                  firstName: true, 
                  lastName: true, 
                  role: true 
                } 
              } 
            },
          });
          
          await prisma.message.updateMany({
            where: { 
              senderId: data.userId, 
              recipientId: socket.user.userId, 
              read: false 
            },
            data: { 
              read: true, 
              readAt: new Date() 
            },
          });
          
          const formattedMessages = messages.map((msg) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim(),
            senderRole: msg.sender.role.toLowerCase(),
            content: msg.content,
            timestamp: msg.createdAt,
            read: msg.read,
          }));
          
          socket.emit('messages', formattedMessages);
        } catch (error) {
          console.error('Error in getMessages:', error);
        }
      });

      socket.on('sendMessage', async (data: { recipientId: string; content: string }, callback: (response: any) => void) => {
        const senderId = socket.user?.userId;
        const { recipientId, content } = data;
        
        if (!senderId || !recipientId || !content) {
          console.error('Missing required fields for sendMessage');
          if (callback) callback({ success: false, error: 'Missing required fields' });
          return;
        }

        try {
          const newMessage = await prisma.message.create({
            data: {
              content,
              senderId,
              recipientId,
            },
            include: {
              sender: { 
                select: { 
                  id: true, 
                  firstName: true, 
                  lastName: true, 
                  role: true 
                } 
              },
            },
          });
          
          const formattedMessage = {
            id: newMessage.id,
            recipientId: newMessage.recipientId, // Add recipient ID for client-side routing
            senderId: newMessage.senderId,
            senderName: `${newMessage.sender.firstName || ''} ${newMessage.sender.lastName || ''}`.trim(),
            senderRole: newMessage.sender.role.toLowerCase(),
            content: newMessage.content,
            timestamp: newMessage.createdAt,
            read: newMessage.read,
          };

          // Send to recipient if online
          const recipientSocketId = this.connectedUsers.get(recipientId);
          if (recipientSocketId) {
            this.io.to(recipientSocketId).emit('message', formattedMessage);
          }
          
          // Send back to sender
          socket.emit('message', formattedMessage);
          
          // Send success callback
          if (callback) callback({ success: true });
          
        } catch (error) {
          console.error('Error sending message:', error);
          if (callback) callback({ success: false, error: 'Failed to send message' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.user) {
          this.connectedUsers.delete(socket.user.userId);
          this.io.emit('user_status_change', { 
            userId: socket.user.userId, 
            status: 'offline',
            lastSeen: new Date()
          });
        }
      });
    });
  }

  // Helper method to get socket.io instance
  public getIO(): Server {
    return this.io;
  }
}
