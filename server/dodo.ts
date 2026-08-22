import DodoPayments from "dodopayments";

export type DodoEnv = "test_mode" | "live_mode";

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getDodoApiKey(): string | undefined {
  return firstEnv("DODO_PAYMENTS_API_KEY", "DODO_API_KEY");
}

export function getDodoWebhookSecret(): string | undefined {
  return firstEnv(
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "DODO_WEBHOOK_SECRET",
    "DODO_WEBHOOK_KEY",
  );
}

export function getDodoProductId(): string | undefined {
  return firstEnv("DODO_PRODUCT_ID", "DODO_PAYMENTS_PRODUCT_ID");
}

export function getDodoEnvironment(): DodoEnv {
  const raw = (
    firstEnv("DODO_PAYMENTS_ENVIRONMENT", "DODO_ENVIRONMENT") ?? "test_mode"
  ).toLowerCase();
  if (raw === "live" || raw === "live_mode" || raw === "production") {
    return "live_mode";
  }
  return "test_mode";
}

export function dodoCheckoutMissing(): string | null {
  if (!getDodoApiKey()) {
    return "Dodo Payments is not configured (missing DODO_PAYMENTS_API_KEY or DODO_API_KEY).";
  }
  if (!getDodoProductId()) {
    return "Dodo Payments is not configured (missing DODO_PRODUCT_ID). Create a one-time Pay What You Want product in the Dodo dashboard.";
  }
  return null;
}

export function getDodoClient(): DodoPayments | null {
  const apiKey = getDodoApiKey();
  if (!apiKey) return null;
  return new DodoPayments({
    bearerToken: apiKey,
    environment: getDodoEnvironment(),
    webhookKey: getDodoWebhookSecret() ?? null,
  });
}

export function getAppBaseUrl(req: { headers: { [key: string]: unknown } }): string {
  const fromEnv = firstEnv("APP_URL", "DODO_RETURN_URL", "PUBLIC_APP_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const protoHeader = req.headers["x-forwarded-proto"];
  const hostHeader =
    req.headers["x-forwarded-host"] ?? req.headers["host"];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : typeof protoHeader === "string"
      ? protoHeader.split(",")[0]?.trim()
      : "http";
  const host = Array.isArray(hostHeader)
    ? hostHeader[0]
    : typeof hostHeader === "string"
      ? hostHeader.split(",")[0]?.trim()
      : "";
  if (host) return `${proto === "https" ? "https" : "http"}://${host}`;
  return "http://localhost:3000";
}

export function headerValue(
  headers: { [key: string]: unknown },
  name: string,
): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] ?? "");
  return typeof value === "string" ? value : "";
}
