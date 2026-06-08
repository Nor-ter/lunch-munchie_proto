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
// connect_timeout(초)을 짧게 두어, DB가 일시정지/차단된 경우 API가 오래 멈추지
// 않고 빠르게 멜버른 샘플 데이터 폴백으로 넘어가도록 한다.
const client = postgres(connectionString || "", {
  prepare: false,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });
