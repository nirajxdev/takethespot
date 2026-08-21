"use client";

import { useEffect, useState } from "react";

import { formatPrice, MIN_CLAIM_PRICE_CENTS } from "@/lib/pricing";

const MESSAGES = [
  `Claim spots from ${formatPrice(MIN_CLAIM_PRICE_CENTS)}.`,
  "Click a green highlighted spot to claim it.",
  "Or drag on open grid space to select any rectangle of cells.",
  "Once it's gone, you'll have to pay more to take it.",
];

export function UrgencyPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs rounded-lg border bg-background/90 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Live board
      </p>
      <p className="mt-2 text-sm font-medium leading-snug transition-opacity duration-500">
        {MESSAGES[index]}
      </p>
    </div>
  );
}
