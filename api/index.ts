import type { IncomingMessage, ServerResponse } from "node:http";
import { createApiApp } from "../server/app.ts";

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "/";
  if (!url.startsWith("/api")) {
    req.url = url === "/" ? "/api" : `/api${url.startsWith("/") ? url : `/${url}`}`;
  }
  app(req, res);
}
