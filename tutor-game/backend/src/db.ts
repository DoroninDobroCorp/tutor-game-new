import { PrismaClient } from '@prisma/client';

// Create a single PrismaClient instance that will be shared across the application
const prisma = new PrismaClient();

export default prisma;
