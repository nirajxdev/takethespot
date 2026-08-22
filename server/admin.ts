import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function adminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value || undefined;
}

function tokenForPassword(password: string) {
  return createHmac("sha256", password).update("takethespot-admin").digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const password = adminPassword();
  if (!password) {
    return res.status(503).json({
      error: "Admin is not configured. Set ADMIN_PASSWORD in the environment.",
    });
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !safeEqual(token, tokenForPassword(password))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function handleAdminLogin(req: Request, res: Response) {
  const password = adminPassword();
  if (!password) {
    return res.status(503).json({
      error: "Admin is not configured. Set ADMIN_PASSWORD in the environment.",
    });
  }

  const submitted = String(req.body?.password ?? "");
  if (!submitted || !safeEqual(submitted, password)) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.json({ success: true, token: tokenForPassword(password) });
}
