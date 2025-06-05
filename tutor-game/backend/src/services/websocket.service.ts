import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken as authVerifyToken } from './auth.service';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: 'STUDENT' | 'TEACHER';
  };
}

class WebSocketService {
  private io: Server;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.initializeMiddleware();
    this.initializeConnection();
  }

  private initializeMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = authVerifyToken(token) as { userId: string; role: 'STUDENT' | 'TEACHER' } | null;
        if (!decoded || !decoded.userId || !decoded.role) {
          return next(new Error('Invalid token'));
        }

        // Attach user to socket for later use
        socket.user = {
          userId: decoded.userId,
          role: decoded.role
        };
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
      console.log(`User connected: ${userId} (${role})`);

      // Store the socket ID for this user
      this.connectedUsers.set(userId, socket.id);

      // Notify all clients about the updated user list
      this.broadcastUserList();

      // Handle private messages
      socket.on('sendMessage', async (data: { recipientId: string; content: string }) => {
        try {
          const { recipientId, content } = data;
          const senderId = socket.user?.userId;

          if (!senderId || !recipientId || !content) return;

          // Save message to database
          const message = await prisma.message.create({
            data: {
              content,
              sender: { connect: { id: senderId } },
              recipient: { connect: { id: recipientId } },
              read: false,
            },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, role: true },
              },
            },
          });

          // Emit to recipient if online
          const recipientSocketId = this.connectedUsers.get(recipientId);
          if (recipientSocketId) {
            this.io.to(recipientSocketId).emit('message', {
              id: message.id,
              senderId: message.senderId,
              senderName: `${message.sender.firstName} ${message.sender.lastName}`,
              senderRole: message.sender.role,
              content: message.content,
              timestamp: message.createdAt,
              read: message.read,
            });
          }

          // Also emit back to sender for UI update
          socket.emit('message', {
            id: message.id,
            senderId: message.senderId,
            senderName: `${message.sender.firstName} ${message.sender.lastName}`,
            senderRole: message.sender.role,
            content: message.content,
            timestamp: message.createdAt,
            read: message.read,
          });
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });

      // Handle message read receipts
      socket.on('markAsRead', async (data: { messageId: string }) => {
        try {
          const { messageId } = data;
          const userId = socket.user?.userId;

          if (!userId) return;

          // Update message as read in the database
          await prisma.message.updateMany({
            where: {
              id: messageId,
              recipientId: userId,
              read: false,
            },
            data: {
              read: true,
              readAt: new Date(),
            },
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      // Handle get messages request
      socket.on('getMessages', async (data: { userId: string }) => {
        try {
          const { userId } = data;
          const currentUserId = socket.user?.userId;

          if (!currentUserId) return;

          // Get conversation between the two users
          const messages = await prisma.message.findMany({
            where: {
              OR: [
                { senderId: currentUserId, recipientId: userId },
                { senderId: userId, recipientId: currentUserId },
              ],
            },
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, role: true },
              },
            },
          });

          // Mark messages as read when they are loaded
          await prisma.message.updateMany({
            where: {
              senderId: userId,
              recipientId: currentUserId,
              read: false,
            },
            data: {
              read: true,
              readAt: new Date(),
            },
          });

          // Format and send messages to the client
          const formattedMessages = messages.map((msg: {
            id: string;
            senderId: string;
            sender: { firstName: string; lastName: string; role: string };
            content: string;
            createdAt: Date;
            read: boolean;
          }) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
            senderRole: msg.sender.role,
            content: msg.content,
            timestamp: msg.createdAt,
            read: msg.read,
          }));

          socket.emit('messages', formattedMessages);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      });

      // Handle get users request
      socket.on('getUsers', async () => {
        try {
          const currentUser = socket.user;
          if (!currentUser) return;

          // Get all users except the current user
          const users = await prisma.user.findMany({
            where: {
              id: { not: currentUser.userId },
              // If teacher, show only students, if student, show only teachers
              ...(currentUser.role === 'TEACHER' 
                ? { role: 'STUDENT' } 
                : { role: 'TEACHER' }),
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              lastActive: true,
            },
          });

          // Format users with online status
          const usersWithStatus = users.map((user: { id: string; firstName: string; lastName: string; role: string; lastActive: Date | null }) => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            isOnline: this.connectedUsers.has(user.id),
            lastSeen: user.lastActive,
          }));

          socket.emit('users', usersWithStatus);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.user) {
          console.log(`User disconnected: ${socket.user.userId}`);
          this.connectedUsers.delete(socket.user.userId);
          this.broadcastUserList();
        }
      });
    });
  }

  private broadcastUserList() {
    // Broadcast updated user list to all connected clients
    const users = Array.from(this.connectedUsers.entries()).map(([userId, socketId]) => ({
      userId,
      socketId,
      isOnline: true,
    }));

    this.io.emit('userList', users);
  }

  public getIO(): Server {
    return this.io;
  }
}

export default WebSocketService;
