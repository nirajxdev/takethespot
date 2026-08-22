import fs from "fs/promises";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { MarketConfig, Plot, Transaction } from "../src/types.ts";

const CONFIG_FILE = path.join(process.cwd(), "config.json");
const DATA_FILE = path.join(process.cwd(), "plots.json");
const TRANSACTIONS_FILE = path.join(process.cwd(), "transactions.json");

export interface AppStore {
  getConfig(): Promise<MarketConfig | null>;
  setConfig(config: MarketConfig): Promise<void>;
  getPlots(): Promise<Plot[] | null>;
  setPlots(plots: Plot[]): Promise<void>;
  getTransactions(): Promise<Transaction[]>;
  setTransactions(txs: Transaction[]): Promise<void>;
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
  };
}

const KEYS = {
  config: "config",
  plots: "plots",
  transactions: "transactions",
} as const;

function createNeonStore(): AppStore {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required on Vercel. Create a Neon database and add the connection string in the Vercel project settings.",
    );
  }

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
  };
}

let cached: AppStore | null = null;

export function getStore(): AppStore {
  if (cached) return cached;
  // Local `npm run dev` keeps JSON files. Vercel uses Neon (leftover DATABASE_URL).
  cached = process.env.VERCEL ? createNeonStore() : createFileStore();
  return cached;
}
