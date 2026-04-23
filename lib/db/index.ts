import { Pool, QueryResult, QueryResultRow } from "pg";

import { schemaStatements } from "@/lib/db/schema";

type GlobalWithPg = typeof globalThis & {
  promptTrackerPool?: Pool;
  promptTrackerSchemaReady?: boolean;
};

const globalForPg = globalThis as GlobalWithPg;

const connectionString = process.env.DATABASE_URL;

export const dbPool =
  globalForPg.promptTrackerPool ??
  new Pool({
    connectionString,
    max: 10,
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false
          }
        : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.promptTrackerPool = dbPool;
}

export async function ensureSchema(): Promise<void> {
  if (globalForPg.promptTrackerSchemaReady) {
    return;
  }

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for prompt-version-tracker.");
  }

  for (const statement of schemaStatements) {
    await dbPool.query(statement);
  }

  globalForPg.promptTrackerSchemaReady = true;
}

export async function sql<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureSchema();
  return dbPool.query<T>(text, values);
}
