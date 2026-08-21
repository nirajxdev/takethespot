import { BoardView } from "@/components/board/board-view";
import { getBoardTerritories } from "@/lib/board-data";

export default async function HomePage() {
  const territories = await getBoardTerritories();

  return <BoardView territories={territories} />;
}
