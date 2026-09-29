import fs from "fs/promises";
import path from "path";
import type { MarketConfig, PendingCheckout, Plot, Transaction } from "../src/types.ts";

const CONFIG_FILE = path.join(process.cwd(), "config.json");
const DATA_FILE = path.join(process.cwd(), "plots.json");
const TRANSACTIONS_FILE = path.join(process.cwd(), "transactions.json");
const CHECKOUTS_FILE = path.join(process.cwd(), "checkouts.json");

export type PersistenceMode = "file" | "neon" | "memory";

export interface AppStore {
  getConfig(): Promise<MarketConfig | null>;
  setConfig(config: MarketConfig): Promise<void>;
  getPlots(): Promise<Plot[] | null>;
  setPlots(plots: Plot[]): Promise<void>;
  getTransactions(): Promise<Transaction[]>;
  setTransactions(txs: Transaction[]): Promise<void>;
  getCheckouts(): Promise<Record<string, PendingCheckout>>;
  setCheckouts(checkouts: Record<string, PendingCheckout>): Promise<void>;
}

async function fileExists(filename: string) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function createFileStore(): AppStore {
  return {
    async getConfig() {
      if (!(await fileExists(CONFIG_FILE))) return null;
      const data = await fs.readFile(CONFIG_FILE, "utf-8");
      return JSON.parse(data) as MarketConfig;
    },
    async setConfig(config) {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    },
    async getPlots() {
      if (!(await fileExists(DATA_FILE))) return null;
      const data = await fs.readFile(DATA_FILE, "utf-8");
      return JSON.parse(data) as Plot[];
    },
    async setPlots(plots) {
      await fs.writeFile(DATA_FILE, JSON.stringify(plots, null, 2));
    },
    async getTransactions() {
      if (!(await fileExists(TRANSACTIONS_FILE))) return [];
      const data = await fs.readFile(TRANSACTIONS_FILE, "utf-8");
      return JSON.parse(data) as Transaction[];
    },
    async setTransactions(txs) {
      await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(txs, null, 2));
    },
    async getCheckouts() {
      if (!(await fileExists(CHECKOUTS_FILE))) return {};
      const data = await fs.readFile(CHECKOUTS_FILE, "utf-8");
      return JSON.parse(data) as Record<string, PendingCheckout>;
    },
    async setCheckouts(checkouts) {
      await fs.writeFile(CHECKOUTS_FILE, JSON.stringify(checkouts, null, 2));
    },
  };
}

function createMemoryStore(): AppStore {
  let config: MarketConfig | null = null;
  let plots: Plot[] | null = null;
  let transactions: Transaction[] = [];
  let checkouts: Record<string, PendingCheckout> = {};

  return {
    async getConfig() {
      return config;
    },
    async setConfig(next) {
      config = next;
    },
    async getPlots() {
      return plots;
    },
    async setPlots(next) {
      plots = next;
    },
    async getTransactions() {
      return transactions;
    },
    async setTransactions(txs) {
      transactions = txs;
    },
    async getCheckouts() {
      return checkouts;
    },
    async setCheckouts(next) {
      checkouts = next;
    },
  };
}

const KEYS = {
  config: "config",
  plots: "plots",
  transactions: "transactions",
  checkouts: "checkouts",
} as const;

function neonConnectionString(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

// Neon Free meters CU-hours and egress, not query count. The board is a
// single ~60 KB JSONB row, so an 8s poll per visitor re-pulls it constantly
// and keeps the compute awake (it only scales to zero after 5 min idle).
// A short per-instance cache collapses concurrent reads into one round trip.
const CACHE_TTL_MS = 5_000;

function isMissingTable(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "42P01") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist/i.test(message) && /app_state|relation/i.test(message);
}

function clone<T>(value: T): T {
  return value === null || value === undefined
    ? value
    : (structuredClone(value) as T);
}

async function createNeonStore(url: string): Promise<AppStore> {
  // Dynamic import: Vercel often compiles /api as CJS, and
  // @neondatabase/serverless is ESM-only. A static import becomes
  // require() and crashes the whole function (FUNCTION_INVOCATION_FAILED).
  const loaded = await import("@neondatabase/serverless");
  const sql = loaded.neon(neonConnectionString(url));
  let tableReady = false;

  // The table is created lazily on the first read that reports it missing,
  // instead of on every cold start. DDL cannot be served by a read replica,
  // so running it unconditionally woke the primary compute on each cold boot.
  async function createTable() {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        tableReady = true;
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  async function selectValue(key: string): Promise<unknown> {
    try {
      const rows = await sql`SELECT value FROM app_state WHERE key = ${key}`;
      if (!rows.length) return null;
      return rows[0].value;
    } catch (error) {
      if (!isMissingTable(error) || tableReady) throw error;
      await createTable();
      const rows = await sql`SELECT value FROM app_state WHERE key = ${key}`;
      if (!rows.length) return null;
      return rows[0].value;
    }
  }

  // Canonical cached values, plus in-flight dedupe so a burst of concurrent
  // requests issues one query rather than one per request.
  const cache = new Map<string, { value: unknown; expires: number }>();
  const inflight = new Map<string, Promise<unknown>>();

  async function getJson<T>(key: string): Promise<T | null> {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return clone(hit.value) as T;

    let pending = inflight.get(key);
    if (!pending) {
      pending = selectValue(key).then((value) => {
        cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
        return value;
      });
      inflight.set(key, pending);
      // Clear only our own entry so a newer in-flight read is not discarded.
      pending.catch(() => {}).finally(() => {
        if (inflight.get(key) === pending) inflight.delete(key);
      });
    }
    return clone((await pending) as T);
  }

  async function setJson(key: string, value: unknown) {
    const payload = JSON.stringify(value);
    try {
      await sql`
        INSERT INTO app_state (key, value, updated_at)
        VALUES (${key}, ${payload}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `;
    } catch (error) {
      if (!isMissingTable(error) || tableReady) throw error;
      await createTable();
      await sql`
        INSERT INTO app_state (key, value, updated_at)
        VALUES (${key}, ${payload}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `;
    }
    // Write through so a read immediately after a purchase is never stale.
    // Cloned because callers keep mutating the object they handed us.
    cache.set(key, { value: clone(value), expires: Date.now() + CACHE_TTL_MS });
  }

  return {
    getConfig: () => getJson<MarketConfig>(KEYS.config),
    setConfig: (config) => setJson(KEYS.config, config),
    getPlots: () => getJson<Plot[]>(KEYS.plots),
    setPlots: (plots) => setJson(KEYS.plots, plots),
    async getTransactions() {
      return (await getJson<Transaction[]>(KEYS.transactions)) ?? [];
    },
    setTransactions: (txs) => setJson(KEYS.transactions, txs),
    async getCheckouts() {
      return (
        (await getJson<Record<string, PendingCheckout>>(KEYS.checkouts)) ?? {}
      );
    },
    setCheckouts: (checkouts) => setJson(KEYS.checkouts, checkouts),
  };
}

let cached: AppStore | null = null;
let pending: Promise<AppStore> | null = null;
let persistenceMode: PersistenceMode = "file";
let persistenceWarning: string | null = null;

export function getPersistence() {
  return { mode: persistenceMode, warning: persistenceWarning };
}

export async function getStore(): Promise<AppStore> {
  if (cached) return cached;
  if (!pending) {
    pending = initStore().catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function initStore(): Promise<AppStore> {
  if (process.env.VERCEL) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      persistenceMode = "memory";
      persistenceWarning =
        "DATABASE_URL is not set on Vercel. The grid is running in memory and will reset on every deploy or cold start. Add a Neon connection string in the Vercel project Environment Variables.";
      console.error(persistenceWarning);
      cached = createMemoryStore();
      return cached;
    }
    persistenceMode = "neon";
    persistenceWarning = null;
    cached = await createNeonStore(url);
    return cached;
  }

  persistenceMode = "file";
  persistenceWarning = null;
  cached = createFileStore();
  return cached;
}
