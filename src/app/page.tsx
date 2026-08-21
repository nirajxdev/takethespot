import { BoardView } from "@/components/board/board-view";
import { getBoardCells } from "@/lib/board-data";

export default async function HomePage() {
  const cells = await getBoardCells();

  return <BoardView cells={cells} />;
}
