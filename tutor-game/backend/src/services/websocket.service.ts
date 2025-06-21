// tutor-game/backend/src/services/websocket.service.ts (НОВАЯ ВЕРСИЯ)

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
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  // Конструктор теперь публичный и принимает сервер
  constructor(server: HttpServer) {
    console.log('✅ Initializing new WebSocketService instance...');

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
        if (!decoded || !decoded.userId || !decoded.role) {
          return next(new Error('Invalid token'));
        }

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
        console.log(`[WebSocket Server] User connected: ${userId} (${role})`);
        this.connectedUsers.set(userId, socket.id);

        this.io.emit('user_status_change', { userId, status: 'online' });

        // ----- ОБРАБОТЧИКИ СОБЫТИЙ -----

        socket.on('getUsers', async () => {
            try {
                if (!socket.user) return;
                console.log(`[WebSocket Server] Received "getUsers" for ${socket.user.role} ID: ${socket.user.userId}`);
                
                const userSelection = { id: true, email: true, firstName: true, lastName: true, role: true, lastActive: true };
                let usersFromDb: any[] = [];

                if (socket.user.role === 'TEACHER') {
                    const students = await prisma.student.findMany({
                        where: { teachers: { some: { userId: socket.user.userId } } },
                        select: { user: { select: userSelection } },
                    });
                    usersFromDb = students.map((s) => s.user);
                } else { // STUDENT
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
                
                console.log(`[WebSocket Server] Emitting "users" with ${usersWithStatus.length} users.`);
                socket.emit('users', usersWithStatus);
            } catch (error) {
                console.error('[WebSocket Server] CRITICAL ERROR in "getUsers":', error);
            }
        });

        // ==========================================================
        // ВОТ КОД, КОТОРЫЙ МЫ ДОБАВЛЯЕМ
        // ==========================================================
        
        socket.on('getMessages', async (data: { userId: string }) => {
            try {
                const currentUserId = socket.user?.userId;
                const otherUserId = data.userId;
                if (!currentUserId || !otherUserId) return;

                console.log(`[WebSocket Server] Received "getMessages" between ${currentUserId} and ${otherUserId}`);

                const messages = await prisma.message.findMany({
                    where: {
                        OR: [
                            { senderId: currentUserId, recipientId: otherUserId },
                            { senderId: otherUserId, recipientId: currentUserId },
                        ],
                    },
                    orderBy: { createdAt: 'asc' },
                    include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
                });

                // Помечаем сообщения как прочитанные
                await prisma.message.updateMany({
                    where: { senderId: otherUserId, recipientId: currentUserId, read: false },
                    data: { read: true, readAt: new Date() },
                });

                const formattedMessages = messages.map(msg => ({
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
                console.error('[WebSocket Server] CRITICAL ERROR in "getMessages":', error);
            }
        });

        socket.on('sendMessage', async (data: { recipientId: string; content: string }) => {
            const senderId = socket.user?.userId;
            const { recipientId, content } = data;

            if (!senderId || !recipientId || !content) {
                console.error('[WebSocket Server] "sendMessage" aborted: Missing data.');
                return;
            }

            try {
                console.log(`[WebSocket Server] Starting transaction to send message from ${senderId} to ${recipientId}`);

                // ШАГ 1: Выполняем запись и чтение в ОДНОЙ АТОМАРНОЙ ТРАНЗАКЦИИ
                const messageWithSender = await prisma.$transaction(async (tx) => {
                    // Внутри этой функции все команды - это часть одной транзакции
                    
                    // 1. Создаем сообщение
                    const newMessage = await tx.message.create({
                        data: {
                            content,
                            senderId: senderId,
                            recipientId: recipientId,
                        },
                    });

                    // 2. Сразу же находим его вместе с данными отправителя
                    const foundMessage = await tx.message.findUnique({
                        where: { id: newMessage.id },
                        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
                    });
                    
                    if (!foundMessage) {
                        // Если мы не нашли сообщение, которое только что создали,
                        // транзакция автоматически откатится.
                        throw new Error(`Transaction failed: Could not find message ${newMessage.id}`);
                    }

                    // 3. Возвращаем результат из транзакции
                    return foundMessage;
                });
                
                // Если мы дошли до сюда, значит транзакция УСПЕШНО ЗАВЕРШЕНА И ЗАФИКСИРОВАНА (COMMIT)
                console.log(`[WebSocket Server] Transaction successful. Message ${messageWithSender.id} is permanently saved.`);

                // ШАГ 2: Форматируем и отправляем клиентам
                const formattedMessage = {
                    id: messageWithSender.id,
                    senderId: messageWithSender.senderId,
                    senderName: `${messageWithSender.sender.firstName} ${messageWithSender.sender.lastName}`,
                    senderRole: messageWithSender.sender.role.toLowerCase(),
                    content: messageWithSender.content,
                    timestamp: messageWithSender.createdAt,
                    read: messageWithSender.read,
                };

                const recipientSocketId = this.connectedUsers.get(recipientId);
                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('message', formattedMessage);
                }
                socket.emit('message', formattedMessage);
                console.log(`[WebSocket Server] Message ${messageWithSender.id} sent to clients.`);

            } catch (error) {
                // Если транзакция провалилась, мы поймаем ошибку здесь
                console.error('[WebSocket Server] CRITICAL ERROR: Transaction failed and was rolled back.', error);
            }
        });

        // ==========================================================
        // КОНЕЦ ДОБАВЛЕННОГО КОДА
        // ==========================================================
        
        socket.on('disconnect', () => {
            if (socket.user) {
                console.log(`[WebSocket Server] User disconnected: ${socket.user.userId}`);
                this.connectedUsers.delete(socket.user.userId);
                this.io.emit('user_status_change', { userId: socket.user.userId, status: 'offline' });
            }
        });
    });
  }

  public getIO(): Server {
    return this.io;
  }
}

export default WebSocketService;