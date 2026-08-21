"use client";

import { useState } from "react";

import { BoardCanvas } from "@/components/board/board-canvas";
import { SpotPanel } from "@/components/board/spot-panel";
import { UrgencyPanel } from "@/components/board/urgency-panel";
import type { BoardTerritory } from "@/lib/mock-territories";

type BoardViewProps = {
  territories: BoardTerritory[];
};

export function BoardView({ territories }: BoardViewProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<BoardTerritory | null>(
    null,
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col p-3 sm:p-4">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-md">
        <BoardCanvas
          territories={territories}
          onSelectTerritory={setSelectedTerritory}
        />
        <UrgencyPanel />
        {selectedTerritory ? (
          <SpotPanel
            territory={selectedTerritory}
            onClose={() => setSelectedTerritory(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
