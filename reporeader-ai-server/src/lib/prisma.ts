import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// 1. Create a PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString
});

// 2. Create the Prisma Adapter using that pool
const adapter = new PrismaPg(pool);

// 3. Instantiate PrismaClient with the adapter
const prisma = new PrismaClient({
    adapter
});

export default prisma;