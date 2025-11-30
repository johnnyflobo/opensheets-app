import * as schema from "@/db/schema";
import { drizzle, type PgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  db?: PgDatabase<typeof schema>;
  pool?: Pool;
};

let _db: PgDatabase<typeof schema> | undefined;
let _pool: Pool | undefined;

function getDb() {
  if (_db) return _db;

  const { DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL env variable is not set");
  }

  // Configuração do pool com suporte a SSL para Supabase
  const poolConfig: ConstructorParameters<typeof Pool>[0] = {
    connectionString: DATABASE_URL,
  };

  // Se for Supabase (URL contém supabase.co), adicionar SSL
  if (DATABASE_URL.includes("supabase.co")) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // Supabase usa certificados válidos
    };
  }

  _pool = globalForDb.pool ?? new Pool(poolConfig);
  _db = globalForDb.db ?? drizzle(_pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pool = _pool;
    globalForDb.db = _db;
  }

  return _db;
}

export const db = new Proxy({} as PgDatabase<typeof schema>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };
