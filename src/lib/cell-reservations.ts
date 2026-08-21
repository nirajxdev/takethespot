import { iterateSelectionCells } from "@/lib/cells";
import { prisma } from "@/lib/prisma";
import type { SelectionBounds } from "@/types/cells";

const RESERVATION_TTL_MS = 10 * 60 * 1000;

export async function createCellReservation(input: {
  reservationId: string;
  userId: string;
  bounds: SelectionBounds;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
  const coords = Array.from(iterateSelectionCells(input.bounds));

  await prisma.$transaction(async (tx) => {
    for (const { x, y } of coords) {
      const conflict = await tx.cellReservation.findFirst({
        where: {
          cellX: x,
          cellY: y,
          expiresAt: { gt: new Date() },
          userId: { not: input.userId },
        },
      });

      if (conflict) {
        throw new Error(
          "Some cells in this selection are reserved by another user.",
        );
      }
    }

    await tx.cellReservation.deleteMany({
      where: {
        reservationId: input.reservationId,
        userId: input.userId,
      },
    });

    await tx.cellReservation.createMany({
      data: coords.map(({ x, y }) => ({
        reservationId: input.reservationId,
        userId: input.userId,
        cellX: x,
        cellY: y,
        expiresAt,
      })),
    });
  });
}

export async function releaseCellReservation(
  reservationId: string,
): Promise<void> {
  await prisma.cellReservation.deleteMany({
    where: { reservationId },
  });
}

export async function cleanupExpiredReservations(): Promise<number> {
  const result = await prisma.cellReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export async function getActiveReservationsInSelection(
  bounds: SelectionBounds,
  excludeUserId?: string,
): Promise<Array<{ x: number; y: number }>> {
  await cleanupExpiredReservations();

  const maxX = bounds.x + bounds.width;
  const maxY = bounds.y + bounds.height;

  const reservations = await prisma.cellReservation.findMany({
    where: {
      expiresAt: { gt: new Date() },
      cellX: { gte: bounds.x, lt: maxX },
      cellY: { gte: bounds.y, lt: maxY },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { cellX: true, cellY: true },
  });

  return reservations.map((r) => ({ x: r.cellX, y: r.cellY }));
}
