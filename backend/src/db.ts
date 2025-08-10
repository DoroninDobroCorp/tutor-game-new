import { PrismaClient, Prisma } from "@prisma/client";

// Extend NodeJS global type with prisma client
declare global {
  var prisma: PrismaClient | undefined;
}

// Enable detailed logging in development
const prismaOptions: Prisma.PrismaClientOptions = {
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "info", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
};

// Prevent multiple instances of Prisma Client in development
const prisma = global.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;

  // Add type for the query event
  prisma.$on("query" as never, (e: any) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });
}

export { prisma };
export default prisma;
