import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Recreate the cached client after `prisma generate` adds/removes fields.
const schemaStamp = Object.values(Prisma.BracketRoomScalarFieldEnum).join(",");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaSchemaStamp?: string;
};

function createPrisma() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  return { prisma: new PrismaClient({ adapter: new PrismaPg(pool) }), pool };
}

if (!globalForPrisma.prisma || globalForPrisma.prismaSchemaStamp !== schemaStamp) {
  void globalForPrisma.prisma?.$disconnect();
  void globalForPrisma.prismaPool?.end();
  const created = createPrisma();
  globalForPrisma.prisma = created.prisma;
  globalForPrisma.prismaPool = created.pool;
  globalForPrisma.prismaSchemaStamp = schemaStamp;
}

const prisma = globalForPrisma.prisma;

export default prisma;
