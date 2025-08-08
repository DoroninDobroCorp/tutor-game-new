"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const auth_service_1 = require("./auth.service");
const env_1 = require("../config/env");
const db_1 = __importDefault(require("../db"));
class WebSocketService {
    constructor(server) {
        this.connectedUsers = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: env_1.config.corsOrigin,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            path: '/socket.io/',
        });
        this.initializeMiddleware();
        this.initializeConnection();
    }
    initializeMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token)
                    return next(new Error('Authentication error'));
                const decoded = await (0, auth_service_1.verifyAccessToken)(token);
                if (!decoded)
                    return next(new Error('Invalid token'));
                socket.user = { userId: decoded.userId, role: decoded.role };
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }
    /**
     * Emits an event to a specific user if they are connected
     * @param userId The ID of the user to send the event to
     * @param event The event name
     * @param data The data to send with the event
     */
    emitToUser(userId, event, data) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
            console.log(`[WebSocket] Emitted event '${event}' to user ${userId} on socket ${socketId}`);
        }
        else {
            console.log(`[WebSocket] User ${userId} not connected. Cannot emit event '${event}'.`);
        }
    }
    initializeConnection() {
        this.io.on('connection', (socket) => {
            if (!socket.user)
                return;
            const { userId, role } = socket.user;
            this.connectedUsers.set(userId, socket.id);
            this.io.emit('user_status_change', { userId, status: 'online' });
            socket.on('getUsers', async () => {
                if (!socket.user)
                    return;
                try {
                    const userSelection = {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        lastActive: true
                    };
                    let usersFromDb = [];
                    if (socket.user.role === 'TEACHER') {
                        const students = await db_1.default.student.findMany({
                            where: { teachers: { some: { userId: socket.user.userId } } },
                            select: { user: { select: userSelection } },
                        });
                        usersFromDb = students.map((s) => s.user);
                    }
                    else {
                        const teachers = await db_1.default.teacher.findMany({
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
                }
                catch (error) {
                    console.error('Error in getUsers:', error);
                }
            });
            socket.on('getMessages', async (data) => {
                if (!socket.user || !data.userId)
                    return;
                try {
                    const messages = await db_1.default.message.findMany({
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
                    await db_1.default.message.updateMany({
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
                        recipientId: msg.recipientId,
                        senderName: `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim(),
                        senderRole: msg.sender.role.toLowerCase(),
                        content: msg.content,
                        timestamp: msg.createdAt,
                        read: msg.read,
                    }));
                    socket.emit('messages', formattedMessages);
                }
                catch (error) {
                    console.error('Error in getMessages:', error);
                }
            });
            socket.on('sendMessage', async (data) => {
                const senderId = socket.user?.userId;
                const { recipientId, content } = data;
                if (!senderId || !recipientId || !content) {
                    return;
                }
                try {
                    const newMessage = await db_1.default.message.create({
                        data: { content, senderId, recipientId },
                        include: {
                            sender: { select: { id: true, firstName: true, lastName: true, role: true } },
                        },
                    });
                    const formattedMessage = {
                        id: newMessage.id,
                        recipientId: newMessage.recipientId,
                        senderId: newMessage.senderId,
                        senderName: `${newMessage.sender.firstName || ''} ${newMessage.sender.lastName || ''}`.trim(),
                        senderRole: newMessage.sender.role.toLowerCase(),
                        content: newMessage.content,
                        timestamp: newMessage.createdAt.toISOString(),
                        read: newMessage.read,
                    };
                    const recipientSocketId = this.connectedUsers.get(recipientId);
                    if (recipientSocketId) {
                        this.io.to(recipientSocketId).emit('message', formattedMessage);
                    }
                    socket.emit('message', formattedMessage);
                }
                catch (error) {
                    console.error('Error sending message:', error);
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
    getIO() {
        return this.io;
    }
}
exports.WebSocketService = WebSocketService;
