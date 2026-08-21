"use client";

import { useState } from "react";

import { BoardCanvas } from "@/components/board/board-canvas";
import { BoardHint } from "@/components/board/board-hint";
import { SpotPanel } from "@/components/board/spot-panel";
import { UrgencyPanel } from "@/components/board/urgency-panel";
import {
  createTerritoryFromSize,
  canPlaceTerritory,
  snapClaimPosition,
} from "@/lib/territories";
import type { BoardTerritory } from "@/lib/mock-territories";
import type { TerritorySizeKey } from "@/lib/pricing";

type BoardViewProps = {
  territories: BoardTerritory[];
};

const DEFAULT_CLAIM_SIZE: TerritorySizeKey = "small";

function createCustomClaim(
  cellX: number,
  cellY: number,
  sizeKey: TerritorySizeKey,
  territories: BoardTerritory[],
): BoardTerritory | null {
  const { width, height, currentPrice } = createTerritoryFromSize(sizeKey, {
    x: cellX,
    y: cellY,
  });
  const { x, y } = snapClaimPosition(cellX, cellY, width, height);

  const occupied = territories.map((t) => ({
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
  }));

  if (!canPlaceTerritory(x, y, width, height, occupied)) {
    return null;
  }

  return {
    id: `claim-${x}-${y}-${sizeKey}`,
    x,
    y,
    width,
    height,
    currentPrice,
    status: "AVAILABLE",
    sizeKey,
  };
}

function findTerritoryAtCell(
  cellX: number,
  cellY: number,
  territories: BoardTerritory[],
): BoardTerritory | undefined {
  return territories.find(
    (t) =>
      cellX >= t.x &&
      cellX < t.x + t.width &&
      cellY >= t.y &&
      cellY < t.y + t.height,
  );
}

export function BoardView({ territories }: BoardViewProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<BoardTerritory | null>(
    null,
  );
  const [claimError, setClaimError] = useState<string | null>(null);

  function handleEmptyCellClick(cellX: number, cellY: number) {
    setClaimError(null);

    const existing = findTerritoryAtCell(cellX, cellY, territories);
    if (existing) {
      setSelectedTerritory(existing);
      return;
    }

    const claim = createCustomClaim(
      cellX,
      cellY,
      DEFAULT_CLAIM_SIZE,
      territories,
    );

    if (!claim) {
      setClaimError(
        "No space for a 2×2 territory here. Try another open area or pick a green highlighted spot.",
      );
      setSelectedTerritory(null);
      return;
    }

    setSelectedTerritory(claim);
  }

  function handleTerritorySelect(territory: BoardTerritory) {
    setClaimError(null);
    setSelectedTerritory(territory);
  }

  function handleSizeChange(sizeKey: TerritorySizeKey) {
    if (!selectedTerritory || !selectedTerritory.id.startsWith("claim-")) {
      return;
    }

    const claim = createCustomClaim(
      selectedTerritory.x,
      selectedTerritory.y,
      sizeKey,
      territories,
    );

    if (!claim) {
      setClaimError(
        `A ${sizeKey === "small" ? "2×2" : sizeKey === "medium" ? "5×5" : "10×10"} territory doesn't fit here.`,
      );
      return;
    }

    setClaimError(null);
    setSelectedTerritory(claim);
  }

  const isCustomClaim =
    selectedTerritory?.id.startsWith("claim-") ?? false;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-4">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-md">
        <BoardCanvas
          territories={territories}
          onSelectTerritory={handleTerritorySelect}
          onEmptyCellClick={handleEmptyCellClick}
        />
        <UrgencyPanel />
        <BoardHint />
        {claimError ? (
          <div className="absolute bottom-4 right-4 z-10 max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm">
            {claimError}
          </div>
        ) : null}
        {selectedTerritory ? (
          <SpotPanel
            territory={selectedTerritory}
            onClose={() => {
              setSelectedTerritory(null);
              setClaimError(null);
            }}
            isCustomClaim={isCustomClaim}
            onSizeChange={isCustomClaim ? handleSizeChange : undefined}
            canPlaceSize={(sizeKey) => {
              if (!selectedTerritory) return false;
              const { width, height } = createTerritoryFromSize(sizeKey, {
                x: selectedTerritory.x,
                y: selectedTerritory.y,
              });
              const occupied = territories.map((t) => ({
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
              }));
              return canPlaceTerritory(
                selectedTerritory.x,
                selectedTerritory.y,
                width,
                height,
                occupied,
              );
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
