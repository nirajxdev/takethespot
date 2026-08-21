"use client";

import { useMemo, useState } from "react";

import { BoardCanvas, type SelectionBounds } from "@/components/board/board-canvas";
import { BoardHint } from "@/components/board/board-hint";
import {
  InvalidSelectionPanel,
  SpotPanel,
} from "@/components/board/spot-panel";
import { UrgencyPanel } from "@/components/board/urgency-panel";
import { snapClaimPosition } from "@/lib/territories";
import type { BoardTerritory } from "@/lib/mock-territories";
import { classifySelection } from "@/lib/selection";
import type { ClassifySelectionResult } from "@/types/selection";

type BoardViewProps = {
  territories: BoardTerritory[];
};

function toSelectionTerritories(territories: BoardTerritory[]) {
  return territories.map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    currentPrice: t.currentPrice,
    status: t.status,
  }));
}

function territoryFromClassification(
  classification: ClassifySelectionResult,
  bounds: SelectionBounds,
  territories: BoardTerritory[],
): BoardTerritory | null {
  if (!classification.isValidPurchase) return null;

  const matching = classification.matchingTerritory;
  if (matching && classification.purchaseType === "mixed") {
    const existing = territories.find((t) => t.id === matching.id);
    return {
      id: `claim-${bounds.x}-${bounds.y}-${bounds.width}x${bounds.height}`,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      currentPrice: classification.price ?? 0,
      status: "OWNED",
      product: existing?.product,
    };
  }

  if (matching) {
    const existing = territories.find((t) => t.id === matching.id);
    if (existing) return existing;
  }

  return {
    id: `claim-${bounds.x}-${bounds.y}-${bounds.width}x${bounds.height}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    currentPrice: classification.price ?? 0,
    status: "AVAILABLE",
  };
}

export function BoardView({ territories }: BoardViewProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<BoardTerritory | null>(
    null,
  );
  const [classification, setClassification] =
    useState<ClassifySelectionResult | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(
    null,
  );

  const selectionTerritories = useMemo(
    () => toSelectionTerritories(territories),
    [territories],
  );

  function classifyBounds(bounds: SelectionBounds): ClassifySelectionResult {
    const snapped = {
      ...bounds,
      ...snapClaimPosition(bounds.x, bounds.y, bounds.width, bounds.height),
    };

    return classifySelection({
      x: snapped.x,
      y: snapped.y,
      width: snapped.width,
      height: snapped.height,
      territories: selectionTerritories,
    });
  }

  function applyClassification(
    bounds: SelectionBounds,
    result: ClassifySelectionResult,
  ) {
    setSelectionBounds(bounds);
    setClassification(result);

    if (result.isValidPurchase) {
      const territory = territoryFromClassification(result, bounds, territories);
      setSelectedTerritory(territory);
      return;
    }

    setSelectedTerritory(null);
  }

  function handleSelectionComplete(bounds: SelectionBounds) {
    const result = classifyBounds(bounds);
    applyClassification(bounds, result);
  }

  function handleTerritorySelect(territory: BoardTerritory) {
    const bounds: SelectionBounds = {
      x: territory.x,
      y: territory.y,
      width: territory.width,
      height: territory.height,
    };
    const result = classifyBounds(bounds);
    applyClassification(bounds, result);
    if (result.isValidPurchase) {
      setSelectedTerritory(territory);
    }
  }

  function handleViewOverlappingSpot() {
    if (!classification || classification.overlappingTerritoryIds.length === 0) {
      return;
    }

    const territoryId = classification.overlappingTerritoryIds[0];
    const territory = territories.find((t) => t.id === territoryId);
    if (!territory) return;

    handleTerritorySelect(territory);
  }

  function clearSelection() {
    setSelectedTerritory(null);
    setClassification(null);
    setSelectionBounds(null);
  }

  const selectionOverlay =
    selectionBounds && classification
      ? {
          bounds: selectionBounds,
          isValid: classification.isValidPurchase,
        }
      : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-200 bg-white">
        <BoardCanvas
          territories={territories}
          onSelectTerritory={handleTerritorySelect}
          onSelectionComplete={handleSelectionComplete}
          selectionOverlay={selectionOverlay}
        />
        <UrgencyPanel />
        <BoardHint />
        {classification && !classification.isValidPurchase ? (
          <InvalidSelectionPanel
            classification={classification}
            onClose={clearSelection}
            onSelectAnother={clearSelection}
            onViewExistingSpot={
              classification.overlappingTerritoryIds.length > 0
                ? handleViewOverlappingSpot
                : undefined
            }
          />
        ) : null}
        {selectedTerritory && classification?.isValidPurchase ? (
          <SpotPanel
            territory={selectedTerritory}
            classification={classification}
            onClose={clearSelection}
          />
        ) : null}
      </div>
    </div>
  );
}
