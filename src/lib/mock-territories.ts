import type { TerritorySizeKey } from "@/lib/pricing";
import { getTakeoverPrice } from "@/lib/pricing";

export type BoardTerritoryStatus = "AVAILABLE" | "OWNED";

export type BoardTerritory = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  currentPrice: number;
  status: BoardTerritoryStatus;
  sizeKey?: TerritorySizeKey;
  product?: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
  };
};

const MOCK_TERRITORIES: BoardTerritory[] = [
  {
    id: "mock-1",
    x: 10,
    y: 10,
    width: 10,
    height: 10,
    currentPrice: 799,
    status: "OWNED",
    sizeKey: "large",
    product: {
      name: "LaunchPad",
      description: "Ship your startup faster with curated launch tools.",
      websiteUrl: "https://launchpad.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=launchpad",
    },
  },
  {
    id: "mock-2",
    x: 30,
    y: 8,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "OWNED",
    sizeKey: "medium",
    product: {
      name: "PixelForge",
      description: "Design assets for indie hackers.",
      websiteUrl: "https://pixelforge.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=pixelforge",
    },
  },
  {
    id: "mock-3",
    x: 50,
    y: 15,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "OWNED",
    sizeKey: "small",
    product: {
      name: "TinyAPI",
      description: "Micro-SaaS for API monitoring.",
      websiteUrl: "https://tinyapi.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=tinyapi",
    },
  },
  {
    id: "mock-4",
    x: 70,
    y: 12,
    width: 10,
    height: 10,
    currentPrice: 799,
    status: "AVAILABLE",
    sizeKey: "large",
  },
  {
    id: "mock-5",
    x: 15,
    y: 35,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "AVAILABLE",
    sizeKey: "medium",
  },
  {
    id: "mock-6",
    x: 40,
    y: 40,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-7",
    x: 60,
    y: 35,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "OWNED",
    sizeKey: "medium",
    product: {
      name: "StackBoard",
      description: "Showcase your tech stack on a living board.",
      websiteUrl: "https://stackboard.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=stackboard",
    },
  },
  {
    id: "mock-8",
    x: 85,
    y: 50,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
];

export function getMockTerritories(): BoardTerritory[] {
  return MOCK_TERRITORIES;
}

export function getTakeoverPriceForTerritory(territory: BoardTerritory): number {
  return getTakeoverPrice(territory.currentPrice);
}
