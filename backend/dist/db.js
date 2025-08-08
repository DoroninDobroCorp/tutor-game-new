"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Enable detailed logging in development
const prismaOptions = {
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
};
// Prevent multiple instances of Prisma Client in development
const prisma = global.prisma || new client_1.PrismaClient(prismaOptions);
exports.prisma = prisma;
if (process.env.NODE_ENV === 'development') {
    global.prisma = prisma;
    // Add type for the query event
    prisma.$on('query', (e) => {
        console.log('Query: ' + e.query);
        console.log('Params: ' + e.params);
        console.log('Duration: ' + e.duration + 'ms');
    });
}
exports.default = prisma;
