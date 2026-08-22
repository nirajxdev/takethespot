import type { IncomingMessage, ServerResponse } from "node:http";
import { createApiApp } from "../server/app.ts";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const app = createApiApp();

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function restoreApiUrl(req: IncomingMessage) {
  const raw = req.url ?? "/";
  try {
    const parsed = new URL(raw, "http://localhost");
    const fromQuery = parsed.searchParams.get("__path");
    if (fromQuery) {
      parsed.searchParams.delete("__path");
      const search = parsed.searchParams.toString();
      req.url = fromQuery + (search ? `?${search}` : "");
      return;
    }
  } catch {
    // keep raw url
  }

  const invoke = header(req, "x-invoke-path");
  if (invoke && invoke.startsWith("/api")) {
    const qIndex = raw.indexOf("?");
    req.url = invoke + (qIndex >= 0 ? raw.slice(qIndex) : "");
    return;
  }

  if (!raw.startsWith("/api")) {
    req.url = raw === "/" || raw.startsWith("?") ? `/api${raw === "/" ? "" : raw}` : `/api${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    restoreApiUrl(req);
    app(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : "API handler failed",
        }),
      );
    }
  }
}
