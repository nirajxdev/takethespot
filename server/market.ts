import type { MarketConfig, Plot, Transaction } from "../src/types.ts";

export const DEFAULT_CONFIG: MarketConfig = {
  totalRows: 12,
  totalColumns: 24,
  initialPrice: 100, // 100 cents = $1.00
  maxInitialPlotsPerUser: 2,
  ownershipDurationDays: 90,
  takeoverMultiplier: 2.5,
};

/** Drop nulls on empty plots so /api/board stays small (288 cells). */
export function compactPlotsForClient(plots: Plot[]) {
  return plots.map((plot) => {
    if (plot.status !== "owned") {
      return {
        id: plot.id,
        row: plot.row,
        col: plot.col,
        status: plot.status,
        currentPrice: plot.currentPrice,
      };
    }
    return {
      id: plot.id,
      row: plot.row,
      col: plot.col,
      status: plot.status,
      ownerId: plot.ownerId,
      brandName: plot.brandName,
      logo: plot.logo,
      websiteUrl: plot.websiteUrl,
      currentPrice: plot.currentPrice,
      purchasedAt: plot.purchasedAt,
      expiresAt: plot.expiresAt,
    };
  });
}

export function createEmptyPlots(config: MarketConfig): Plot[] {
  const plots: Plot[] = [];
  for (let r = 0; r < config.totalRows; r++) {
    for (let c = 0; c < config.totalColumns; c++) {
      plots.push({
        id: `${String.fromCharCode(65 + r)}${c + 1}`,
        row: r,
        col: c,
        status: "available",
        ownerId: null,
        brandName: null,
        logo: null,
        websiteUrl: null,
        currentPrice: config.initialPrice,
        purchasedAt: null,
        expiresAt: null,
      });
    }
  }
  return plots;
}

export function refreshExpirations(plots: Plot[]): boolean {
  const now = Date.now();
  let changed = false;
  plots.forEach((plot) => {
    if (plot.status === "owned" && plot.expiresAt) {
      if (new Date(plot.expiresAt).getTime() < now) {
        plot.status = "available";
        plot.ownerId = null;
        plot.brandName = null;
        plot.logo = null;
        plot.websiteUrl = null;
        changed = true;
      }
    }
  });
  return changed;
}

export function mergeConfig(saved: Partial<MarketConfig> | null): MarketConfig {
  const src = saved ?? {};
  return {
    totalRows: src.totalRows ?? DEFAULT_CONFIG.totalRows,
    totalColumns: src.totalColumns ?? DEFAULT_CONFIG.totalColumns,
    initialPrice: src.initialPrice ?? DEFAULT_CONFIG.initialPrice,
    maxInitialPlotsPerUser:
      src.maxInitialPlotsPerUser ?? DEFAULT_CONFIG.maxInitialPlotsPerUser,
    ownershipDurationDays:
      src.ownershipDurationDays ?? DEFAULT_CONFIG.ownershipDurationDays,
    takeoverMultiplier:
      src.takeoverMultiplier ?? DEFAULT_CONFIG.takeoverMultiplier,
  };
}

export type { Plot, MarketConfig, Transaction };
