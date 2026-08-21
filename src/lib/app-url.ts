function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return normalizeOrigin(configured);
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getAuthorizedParties(): string[] | undefined {
  const appUrl = getAppUrl();

  if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    return undefined;
  }

  const parties = new Set<string>([appUrl]);

  try {
    const url = new URL(appUrl);
    const hostname = url.hostname;

    if (hostname.startsWith("www.")) {
      parties.add(`${url.protocol}//${hostname.slice(4)}`);
    } else {
      parties.add(`${url.protocol}//www.${hostname}`);
    }
  } catch {
    // Keep the primary origin only.
  }

  return [...parties];
}
