import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let initialized = false;

const requiredEnvMessage =
  "DATABASE_URL is not configured. Set DATABASE_URL to a valid PostgreSQL connection string.";

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(requiredEnvMessage);
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl:
        process.env.NODE_ENV === "production"
          ? {
              rejectUnauthorized: false
            }
          : false
    });
  }

  return pool;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const activePool = getPool();
  return activePool.query<T>(text, params);
}

export async function initDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS access_grants (
      email TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_event_id TEXT
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'gpt-4.1',
      temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NOT NULL DEFAULT 'system',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE(prompt_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version_a_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
      version_b_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'draft',
      traffic_split INTEGER NOT NULL DEFAULT 50,
      winner_version_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      CONSTRAINT valid_traffic_split CHECK (traffic_split > 0 AND traffic_split < 100)
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
      selected_version TEXT NOT NULL,
      input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      output_text TEXT NOT NULL DEFAULT '',
      score NUMERIC(6,2),
      latency_ms INTEGER,
      token_usage INTEGER,
      cost_usd NUMERIC(10,6),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT selected_version_enum CHECK (selected_version IN ('A', 'B'))
    );

    CREATE TABLE IF NOT EXISTS performance_events (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version_id TEXT NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      score NUMERIC(6,2),
      latency_ms INTEGER,
      token_usage INTEGER,
      cost_usd NUMERIC(10,6),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_ab_tests_prompt_id ON ab_tests(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_id ON test_runs(test_id);
    CREATE INDEX IF NOT EXISTS idx_performance_prompt_id ON performance_events(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_performance_version_id ON performance_events(version_id);
    CREATE INDEX IF NOT EXISTS idx_performance_created_at ON performance_events(created_at);
  `);

  initialized = true;
}

export function createId(prefix: string): string {
  const random = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${random}`;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initialized = false;
  }
}
