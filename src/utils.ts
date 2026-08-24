import type { Plot } from './types.ts';

export function formatCurrency(cents: number | undefined | null) {
  const num = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num / 100);
}

export function getUserId() {
  let userId = localStorage.getItem('take_the_spot_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('take_the_spot_user_id', userId);
  }
  return userId;
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getDaysLeft(startOrExpiry: string | null, durationDays?: number) {
  if (!startOrExpiry) return 0;
  const start = new Date(startOrExpiry).getTime();
  const end = durationDays != null
    ? start + durationDays * 24 * 60 * 60 * 1000
    : start;
  const diff = end - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function hydratePlots(raw: unknown[]): Plot[] {
  return raw.map((item) => {
    const p = item as Partial<Plot>;
    return {
      id: String(p.id ?? ""),
      row: Number(p.row ?? 0),
      col: Number(p.col ?? 0),
      status: p.status === "owned" ? "owned" : "available",
      ownerId: p.ownerId ?? null,
      brandName: p.brandName ?? null,
      logo: p.logo ?? null,
      websiteUrl: p.websiteUrl ?? null,
      currentPrice: Number(p.currentPrice ?? 0),
      purchasedAt: p.purchasedAt ?? null,
      expiresAt: p.expiresAt ?? null,
    };
  });
}

/** Shrink logos before they are stored as data URLs in the board JSON. */
export function compressImageFile(file: File, maxPx = 96, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not compress logo"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read logo"));
    };
    img.src = objectUrl;
  });
}

export function extractDomain(rawUrl: string): string {
  try {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function getInitials(nameOrDomain: string): string {
  if (!nameOrDomain) return 'TTS';
  const clean = nameOrDomain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0];
  const parts = clean.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export interface SiteIdentityResult {
  success: boolean;
  domain: string;
  title: string;
  logoUrl: string | null;
  appleTouchIcon?: string | null;
  faviconUrl?: string | null;
  ogImage?: string | null;
}

export async function fetchSiteIdentity(rawUrl: string): Promise<SiteIdentityResult> {
  const domain = extractDomain(rawUrl);
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  try {
    const res = await fetch(`/api/extract-metadata?url=${encodeURIComponent(rawUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        domain: data.domain || domain,
        title: data.title || domain,
        logoUrl: data.logoUrl || googleFavicon,
        appleTouchIcon: data.appleTouchIcon,
        faviconUrl: data.faviconUrl || googleFavicon,
        ogImage: data.ogImage,
      };
    }
  } catch (e) {
    console.warn('Could not fetch server-side metadata, using favicon fallback', e);
  }

  return {
    success: true,
    domain,
    title: domain,
    logoUrl: googleFavicon,
    faviconUrl: googleFavicon,
  };
}

