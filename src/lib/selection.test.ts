import { describe, expect, it } from "vitest";

import { classifySelection } from "@/lib/selection";
import type { SelectionTerritory } from "@/types/selection";

const ownedTerritory: SelectionTerritory = {
  id: "owned-1",
  x: 10,
  y: 10,
  width: 10,
  height: 10,
  currentPrice: 799,
  status: "OWNED",
};

const availableTerritory: SelectionTerritory = {
  id: "avail-1",
  x: 30,
  y: 8,
  width: 5,
  height: 5,
  currentPrice: 299,
  status: "AVAILABLE",
};

const secondOwned: SelectionTerritory = {
  id: "owned-2",
  x: 50,
  y: 15,
  width: 2,
  height: 2,
  currentPrice: 99,
  status: "OWNED",
};

const reservedTerritory: SelectionTerritory = {
  id: "reserved-1",
  x: 70,
  y: 12,
  width: 10,
  height: 10,
  currentPrice: 799,
  status: "RESERVED",
};

describe("classifySelection", () => {
  it("classifies completely available space as AVAILABLE", () => {
    const result = classifySelection({
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      territories: [ownedTerritory, availableTerritory, secondOwned],
    });

    expect(result.type).toBe("AVAILABLE");
    expect(result.isValidPurchase).toBe(true);
    expect(result.purchaseType).toBe("claim");
    expect(result.price).toBe(99);
  });

  it("classifies exact owned match as EXACT_TERRITORY_MATCH takeover", () => {
    const result = classifySelection({
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      territories: [ownedTerritory, availableTerritory],
    });

    expect(result.type).toBe("EXACT_TERRITORY_MATCH");
    expect(result.isValidPurchase).toBe(true);
    expect(result.purchaseType).toBe("takeover");
    expect(result.matchingTerritory?.id).toBe("owned-1");
    expect(result.price).toBe(1199);
  });

  it("classifies exact available match as AVAILABLE claim", () => {
    const result = classifySelection({
      x: 30,
      y: 8,
      width: 5,
      height: 5,
      territories: [ownedTerritory, availableTerritory],
    });

    expect(result.type).toBe("AVAILABLE");
    expect(result.isValidPurchase).toBe(true);
    expect(result.purchaseType).toBe("claim");
    expect(result.matchingTerritory?.id).toBe("avail-1");
    expect(result.price).toBe(299);
  });

  it("rejects partial overlap with one territory", () => {
    const result = classifySelection({
      x: 10,
      y: 10,
      width: 5,
      height: 5,
      territories: [ownedTerritory],
    });

    expect(result.type).toBe("PARTIAL_OVERLAP");
    expect(result.isValidPurchase).toBe(false);
    expect(result.overlappingTerritoryIds).toEqual(["owned-1"]);
  });

  it("rejects selection spanning territory and free space", () => {
    const result = classifySelection({
      x: 8,
      y: 10,
      width: 5,
      height: 5,
      territories: [ownedTerritory],
    });

    expect(result.type).toBe("PARTIAL_OVERLAP");
    expect(result.isValidPurchase).toBe(false);
  });

  it("rejects multiple territory overlap", () => {
    const territoryA: SelectionTerritory = {
      id: "a",
      x: 10,
      y: 10,
      width: 5,
      height: 5,
      currentPrice: 299,
      status: "OWNED",
    };
    const territoryB: SelectionTerritory = {
      id: "b",
      x: 12,
      y: 12,
      width: 5,
      height: 5,
      currentPrice: 299,
      status: "OWNED",
    };

    const result = classifySelection({
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      territories: [territoryA, territoryB],
    });

    expect(result.type).toBe("MULTIPLE_OVERLAP");
    expect(result.isValidPurchase).toBe(false);
    expect(result.overlappingTerritoryIds.length).toBeGreaterThanOrEqual(2);
  });

  it("does not treat edge-touching rectangles as overlapping", () => {
    const result = classifySelection({
      x: 20,
      y: 10,
      width: 2,
      height: 2,
      territories: [ownedTerritory],
    });

    expect(result.type).toBe("AVAILABLE");
    expect(result.isValidPurchase).toBe(true);
  });

  it("rejects out-of-bounds selections", () => {
    const result = classifySelection({
      x: 99,
      y: 99,
      width: 2,
      height: 2,
      territories: [],
    });

    expect(result.type).toBe("OUT_OF_BOUNDS");
    expect(result.isValidPurchase).toBe(false);
  });

  it("rejects overlap with reserved territory", () => {
    const result = classifySelection({
      x: 70,
      y: 12,
      width: 10,
      height: 10,
      territories: [reservedTerritory],
    });

    expect(result.type).toBe("RESERVED");
    expect(result.isValidPurchase).toBe(false);
  });

  it("rejects overlap with active reservation records", () => {
    const result = classifySelection({
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      territories: [],
      reservations: [{ x: 0, y: 0, width: 2, height: 2 }],
    });

    expect(result.type).toBe("RESERVED");
    expect(result.isValidPurchase).toBe(false);
  });

  it("rejects non-standard territory dimensions", () => {
    const result = classifySelection({
      x: 0,
      y: 0,
      width: 3,
      height: 3,
      territories: [],
    });

    expect(result.type).toBe("MAX_SIZE_EXCEEDED");
    expect(result.isValidPurchase).toBe(false);
  });
});
