import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL environment variable is not defined! Make sure it is set in your .env or Vercel dashboard.");
}

// Initialize postgres client (prepare: false is recommended for pooling like PgBouncer)
const client = postgres(connectionString || "", { prepare: false });

export const db = drizzle(client, { schema });
