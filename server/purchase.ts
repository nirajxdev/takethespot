import type { MarketConfig, Plot, Transaction } from "../src/types.ts";
import { refreshExpirations } from "./market.ts";
import { getStore } from "./store.ts";

export type PurchaseInput = {
  plotIds: string[];
  ownerId: string;
  brandName: string;
  logo: string;
  websiteUrl: string;
};

export type PurchaseOk = {
  ok: true;
  updatedPlots: Plot[];
  totalCost: number;
};

export type PurchaseErr = {
  ok: false;
  status: number;
  error: string;
};

export type PurchaseResult = PurchaseOk | PurchaseErr;

async function loadConfig(merge: (saved: Partial<MarketConfig> | null) => MarketConfig) {
  const store = await getStore();
  return merge(await store.getConfig());
}

export async function completePurchase(
  input: PurchaseInput,
  mergeConfig: (saved: Partial<MarketConfig> | null) => MarketConfig,
): Promise<PurchaseResult> {
  const { plotIds, ownerId, brandName, logo, websiteUrl } = input;

  if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
    return { ok: false, status: 400, error: "No plots selected" };
  }
  if (!ownerId || typeof ownerId !== "string") {
    return { ok: false, status: 400, error: "ownerId is required" };
  }

  const store = await getStore();
  const config = await loadConfig(mergeConfig);
  const existing = await store.getPlots();
  const plots = existing ?? [];
  refreshExpirations(plots);

  const alreadyOurs = plotIds.every((id) => {
    const p = plots.find((plot) => plot.id === id);
    return p && p.ownerId === ownerId && p.status === "owned";
  });
  if (alreadyOurs) {
    const updatedPlots = plotIds
      .map((id) => plots.find((p) => p.id === id))
      .filter((p): p is Plot => Boolean(p));
    const totalCost = updatedPlots.reduce((sum, p) => sum + p.currentPrice, 0);
    return { ok: true, updatedPlots, totalCost };
  }

  const userOwnedCount = plots.filter((p) => p.ownerId === ownerId).length;

  const initialPurchasePlots = plotIds.filter((id: string) => {
    const p = plots.find((plot) => plot.id === id);
    return (
      p && p.status === "available" && p.currentPrice === config.initialPrice
    );
  });

  if (initialPurchasePlots.length > 0) {
    if (
      userOwnedCount + initialPurchasePlots.length >
      config.maxInitialPlotsPerUser
    ) {
      return {
        ok: false,
        status: 400,
        error: `Launch limit: You can own up to ${config.maxInitialPlotsPerUser} plots right now.`,
      };
    }
  }

  let totalCost = 0;
  const plotsToUpdate: Plot[] = [];

  for (const id of plotIds) {
    const plot = plots.find((p) => p.id === id);
    if (!plot) {
      return { ok: false, status: 400, error: `Plot ${id} not found.` };
    }
    if (plot.ownerId === ownerId) {
      return { ok: false, status: 400, error: `You already own plot ${id}.` };
    }

    let cost = 0;
    if (plot.status === "available") {
      cost = plot.currentPrice;
    } else if (plot.status === "owned") {
      cost = Math.round(plot.currentPrice * config.takeoverMultiplier);
    }

    totalCost += cost;
    plotsToUpdate.push(plot);
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.ownershipDurationDays * 24 * 60 * 60 * 1000,
  );

  for (const plot of plotsToUpdate) {
    let transactionAmount = 0;
    let newPrice = plot.currentPrice;

    if (plot.status === "available") {
      transactionAmount = plot.currentPrice;
    } else {
      transactionAmount = Math.round(
        plot.currentPrice * config.takeoverMultiplier,
      );
      newPrice = transactionAmount;
    }

    const tx: Transaction = {
      id: crypto.randomUUID(),
      plotId: plot.id,
      previousOwner: plot.ownerId,
      newOwner: ownerId,
      previousPrice: plot.currentPrice,
      newPrice,
      transactionAmount,
      platformFee: Math.round(transactionAmount * 0.1),
      timestamp: now.toISOString(),
    };

    const txs = await store.getTransactions();
    txs.push(tx);
    await store.setTransactions(txs);

    plot.status = "owned";
    plot.ownerId = ownerId;
    plot.brandName = brandName;
    plot.logo = logo;
    plot.websiteUrl = websiteUrl;
    plot.currentPrice = newPrice;
    plot.purchasedAt = now.toISOString();
    plot.expiresAt = expiresAt.toISOString();
  }

  await store.setPlots(plots);

  return { ok: true, updatedPlots: plotsToUpdate, totalCost };
}

export async function quotePurchaseTotal(
  plotIds: string[],
  ownerId: string,
  mergeConfig: (saved: Partial<MarketConfig> | null) => MarketConfig,
): Promise<PurchaseResult> {
  if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
    return { ok: false, status: 400, error: "No plots selected" };
  }

  const store = await getStore();
  const config = await loadConfig(mergeConfig);
  const existing = await store.getPlots();
  const plots = existing ?? [];
  refreshExpirations(plots);

  const userOwnedCount = plots.filter((p) => p.ownerId === ownerId).length;
  const initialPurchasePlots = plotIds.filter((id: string) => {
    const p = plots.find((plot) => plot.id === id);
    return (
      p && p.status === "available" && p.currentPrice === config.initialPrice
    );
  });

  if (initialPurchasePlots.length > 0) {
    if (
      userOwnedCount + initialPurchasePlots.length >
      config.maxInitialPlotsPerUser
    ) {
      return {
        ok: false,
        status: 400,
        error: `Launch limit: You can own up to ${config.maxInitialPlotsPerUser} plots right now.`,
      };
    }
  }

  let totalCost = 0;
  const plotsToUpdate: Plot[] = [];

  for (const id of plotIds) {
    const plot = plots.find((p) => p.id === id);
    if (!plot) {
      return { ok: false, status: 400, error: `Plot ${id} not found.` };
    }
    if (plot.ownerId === ownerId) {
      return { ok: false, status: 400, error: `You already own plot ${id}.` };
    }

    let cost = 0;
    if (plot.status === "available") {
      cost = plot.currentPrice;
    } else if (plot.status === "owned") {
      cost = Math.round(plot.currentPrice * config.takeoverMultiplier);
    }

    totalCost += cost;
    plotsToUpdate.push(plot);
  }

  return { ok: true, updatedPlots: plotsToUpdate, totalCost };
}
