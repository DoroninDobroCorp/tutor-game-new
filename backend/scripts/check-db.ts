import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function checkDatabase() {
  try {
    console.log("Checking database connection...");
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    console.log("\nListing all tables in the database:");
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log(tables);

    console.log("\nSchema version:");
    const version = await prisma.$queryRaw`SELECT version()`;
    console.log(version);
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
