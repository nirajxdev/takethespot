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
  // Additional territories spread across the board
  {
    id: "mock-9",
    x: 2,
    y: 2,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-10",
    x: 2,
    y: 25,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "OWNED",
    sizeKey: "medium",
    product: {
      name: "SeedKit",
      description: "Templates for early-stage founders.",
      websiteUrl: "https://seedkit.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=seedkit",
    },
  },
  {
    id: "mock-11",
    x: 25,
    y: 55,
    width: 10,
    height: 10,
    currentPrice: 799,
    status: "AVAILABLE",
    sizeKey: "large",
  },
  {
    id: "mock-12",
    x: 45,
    y: 8,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-13",
    x: 55,
    y: 55,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "AVAILABLE",
    sizeKey: "medium",
  },
  {
    id: "mock-14",
    x: 75,
    y: 35,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "OWNED",
    sizeKey: "small",
    product: {
      name: "QuickPoll",
      description: "Instant feedback for product teams.",
      websiteUrl: "https://quickpoll.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=quickpoll",
    },
  },
  {
    id: "mock-15",
    x: 82,
    y: 8,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "AVAILABLE",
    sizeKey: "medium",
  },
  {
    id: "mock-16",
    x: 8,
    y: 70,
    width: 10,
    height: 10,
    currentPrice: 799,
    status: "OWNED",
    sizeKey: "large",
    product: {
      name: "CloudNest",
      description: "Deploy apps in seconds.",
      websiteUrl: "https://cloudnest.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=cloudnest",
    },
  },
  {
    id: "mock-17",
    x: 35,
    y: 75,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-18",
    x: 50,
    y: 70,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "OWNED",
    sizeKey: "medium",
    product: {
      name: "MetricDash",
      description: "Analytics for indie SaaS.",
      websiteUrl: "https://metricdash.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=metricdash",
    },
  },
  {
    id: "mock-19",
    x: 65,
    y: 75,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-20",
    x: 75,
    y: 65,
    width: 10,
    height: 10,
    currentPrice: 799,
    status: "AVAILABLE",
    sizeKey: "large",
  },
  {
    id: "mock-21",
    x: 90,
    y: 75,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-22",
    x: 20,
    y: 20,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "AVAILABLE",
    sizeKey: "small",
  },
  {
    id: "mock-23",
    x: 38,
    y: 55,
    width: 2,
    height: 2,
    currentPrice: 99,
    status: "OWNED",
    sizeKey: "small",
    product: {
      name: "FormFlow",
      description: "Beautiful forms without code.",
      websiteUrl: "https://formflow.example",
      logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=formflow",
    },
  },
  {
    id: "mock-24",
    x: 88,
    y: 30,
    width: 5,
    height: 5,
    currentPrice: 299,
    status: "AVAILABLE",
    sizeKey: "medium",
  },
];

export function getMockTerritories(): BoardTerritory[] {
  return MOCK_TERRITORIES;
}

export function getTakeoverPriceForTerritory(territory: BoardTerritory): number {
  return getTakeoverPrice(territory.currentPrice);
}
