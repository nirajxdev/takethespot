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

async function createNeonStore(url: string): Promise<AppStore> {
  // Dynamic import: Vercel often compiles /api as CJS, and
  // @neondatabase/serverless is ESM-only. A static import becomes
  // require() and crashes the whole function (FUNCTION_INVOCATION_FAILED).
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  let tableReady = false;

  async function ensureTable() {
    if (tableReady) return;
    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    tableReady = true;
  }

  async function getJson<T>(key: string): Promise<T | null> {
    await ensureTable();
    const rows = await sql`SELECT value FROM app_state WHERE key = ${key}`;
    if (!rows.length) return null;
    return rows[0].value as T;
  }

  async function setJson(key: string, value: unknown) {
    await ensureTable();
    const payload = JSON.stringify(value);
    await sql`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (${key}, ${payload}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `;
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
  if (!pending) pending = initStore();
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
