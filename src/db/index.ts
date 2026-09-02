import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL, 
        max: 10,
        family: 4,
        ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('sslmode=require') 
          ? { rejectUnauthorized: false } 
          : undefined
      }
    : {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
      }
);

export const db = drizzle(pool, { schema });
