"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Включаем подробное логирование всех событий, включая SQL-запросы
const prisma = new client_1.PrismaClient({
    log: [
        {
            emit: 'stdout',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
    ],
});
exports.default = prisma;
