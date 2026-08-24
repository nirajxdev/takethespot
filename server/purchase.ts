import type { MarketConfig, Plot, Transaction, CheckoutQuote, QuoteItem } from "../src/types.ts";
import { refreshExpirations } from "./market.ts";
import { getStore } from "./store.ts";

export type PurchaseInput = {
  plotIds: string[];
  ownerId: string;
  brandName: string;
  logo: string;
  websiteUrl: string;
  manageToken?: string;
};

export type PurchaseOk = {
  ok: true;
  updatedPlots: Plot[];
  totalCost: number;
  manageToken: string;
  quote: CheckoutQuote;
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

export async function quotePurchaseDetails(
  plotIds: string[],
  ownerId: string,
  mergeConfig: (saved: Partial<MarketConfig> | null) => MarketConfig,
): Promise<{ ok: true; quote: CheckoutQuote; plotsToUpdate: Plot[] } | PurchaseErr> {
  if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
    return { ok: false, status: 400, error: "No plots selected." };
  }

  const store = await getStore();
  const config = await loadConfig(mergeConfig);
  const existing = await store.getPlots();
  const plots = existing ?? [];
  refreshExpirations(plots, config.initialPrice);

  let availableCount = 0;
  let availableTotal = 0;
  let takeoverCount = 0;
  let takeoverTotal = 0;
  let totalCost = 0;

  const items: QuoteItem[] = [];
  const plotsToUpdate: Plot[] = [];

  for (const id of plotIds) {
    const plot = plots.find((p) => p.id === id);
    if (!plot) {
      return { ok: false, status: 400, error: `Plot ${id} not found.` };
    }

    let priceDue = 0;
    if (plot.status === "available") {
      priceDue = plot.currentPrice || config.initialPrice;
      availableCount++;
      availableTotal += priceDue;
    } else {
      // Occupied spot takeover at 2.5x
      priceDue = Math.round(plot.currentPrice * config.takeoverMultiplier);
      takeoverCount++;
      takeoverTotal += priceDue;
    }

    totalCost += priceDue;
    items.push({
      plotId: plot.id,
      status: plot.status,
      currentPrice: plot.currentPrice,
      priceDue,
      brandName: plot.brandName,
    });
    plotsToUpdate.push(plot);
  }

  const quote: CheckoutQuote = {
    availableCount,
    availableTotal,
    takeoverCount,
    takeoverTotal,
    totalCost,
    items,
  };

  return { ok: true, quote, plotsToUpdate };
}

export async function quotePurchaseTotal(
  plotIds: string[],
  ownerId: string,
  mergeConfig: (saved: Partial<MarketConfig> | null) => MarketConfig,
): Promise<{ ok: true; totalCost: number; quote: CheckoutQuote } | PurchaseErr> {
  const res = await quotePurchaseDetails(plotIds, ownerId, mergeConfig);
  if (res.ok === false) return res;
  return { ok: true, totalCost: res.quote.totalCost, quote: res.quote };
}

export async function completePurchase(
  input: PurchaseInput,
  mergeConfig: (saved: Partial<MarketConfig> | null) => MarketConfig,
): Promise<PurchaseResult> {
  const { plotIds, ownerId, brandName, logo, websiteUrl } = input;

  if (!plotIds || !Array.isArray(plotIds) || plotIds.length === 0) {
    return { ok: false, status: 400, error: "No plots selected." };
  }
  if (!ownerId || typeof ownerId !== "string") {
    return { ok: false, status: 400, error: "ownerId is required." };
  }

  const store = await getStore();
  const config = await loadConfig(mergeConfig);
  const existing = await store.getPlots();
  const plots = existing ?? [];
  refreshExpirations(plots, config.initialPrice);

  const quoteRes = await quotePurchaseDetails(plotIds, ownerId, mergeConfig);
  if (quoteRes.ok === false) {
    return quoteRes;
  }

  const { quote, plotsToUpdate } = quoteRes;
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.ownershipDurationDays * 24 * 60 * 60 * 1000,
  );

  const manageToken = input.manageToken || crypto.randomUUID();
  const newTransactions: Transaction[] = [];

  const updatedPlotsList: Plot[] = [];

  for (const id of plotIds) {
    const plot = plots.find((p) => p.id === id);
    if (!plot) continue;

    const itemQuote = quote.items.find((i) => i.plotId === plot.id);
    const transactionAmount = itemQuote ? itemQuote.priceDue : (
      plot.status === "available" ? plot.currentPrice : Math.round(plot.currentPrice * config.takeoverMultiplier)
    );
    const newPrice = transactionAmount;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      plotId: plot.id,
      previousOwner: plot.status === "owned" ? plot.ownerId : null,
      newOwner: brandName || ownerId,
      previousPrice: plot.currentPrice,
      newPrice,
      transactionAmount,
      platformFee: Math.round(transactionAmount * 0.1),
      timestamp: now.toISOString(),
    };
    newTransactions.push(tx);

    plot.status = "owned";
    plot.ownerId = ownerId;
    plot.brandName = brandName;
    plot.logo = logo;
    plot.websiteUrl = websiteUrl;
    plot.currentPrice = newPrice;
    plot.purchasedAt = now.toISOString();
    plot.expiresAt = expiresAt.toISOString();
    plot.manageToken = manageToken;
    plot.takeoverCount = (plot.takeoverCount || 0) + (tx.previousOwner ? 1 : 0);

    updatedPlotsList.push(plot);
  }

  // Save transactions
  const txs = await store.getTransactions();
  txs.push(...newTransactions);
  await store.setTransactions(txs);

  // Save all plots atomically
  await store.setPlots(plots);

  return {
    ok: true,
    updatedPlots: updatedPlotsList,
    totalCost: quote.totalCost,
    manageToken,
    quote,
  };
}
