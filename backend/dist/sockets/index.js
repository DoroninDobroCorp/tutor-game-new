"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSockets = void 0;
const socket_io_1 = require("socket.io");
const attachSockets = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log('New client connected');
        socket.on('joinStudentRoom', (studentId) => {
            socket.join(studentId);
            console.log(`Student ${studentId} joined their room`);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });
    return {
        emitProgress: (studentId, payload) => {
            io.to(studentId).emit('progress', payload);
        },
    };
};
exports.attachSockets = attachSockets;
