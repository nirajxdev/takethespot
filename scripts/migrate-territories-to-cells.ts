/**
 * One-time migration: expand legacy Territory rectangles into Cell rows.
 * Run with: npx tsx scripts/migrate-territories-to-cells.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const territories = await prisma.territory.findMany({
    where: { status: "OWNED" },
    include: { product: true },
  });

  let created = 0;

  for (const territory of territories) {
    for (let dy = 0; dy < territory.height; dy += 1) {
      for (let dx = 0; dx < territory.width; dx += 1) {
        const x = territory.x + dx;
        const y = territory.y + dy;

        await prisma.cell.upsert({
          where: { x_y: { x, y } },
          create: {
            x,
            y,
            productId: territory.productId,
            ownerId: territory.product?.userId ?? null,
            currentValueInCents: territory.currentPrice,
            status: "OWNED",
          },
          update: {
            productId: territory.productId,
            ownerId: territory.product?.userId ?? null,
            currentValueInCents: territory.currentPrice,
            status: "OWNED",
          },
        });
        created += 1;
      }
    }
  }

  console.log(`Migrated ${created} cells from ${territories.length} territories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
