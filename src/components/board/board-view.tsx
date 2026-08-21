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
    <div className="relative h-[calc(100vh-4rem)] w-full">
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
  );
}
