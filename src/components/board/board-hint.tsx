"use client";

import { useEffect, useState } from "react";

import { formatPrice, MIN_CLAIM_PRICE_CENTS } from "@/lib/pricing";

const HINT_STORAGE_KEY = "takethespot-board-hint-dismissed";

export function BoardHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(HINT_STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(HINT_STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50/95 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">
        How to claim
      </p>
      <p className="mt-2 text-sm leading-snug text-emerald-900">
        Claim spots from {formatPrice(MIN_CLAIM_PRICE_CENTS)}. Click a{" "}
        <span className="font-semibold">green highlighted spot</span> to claim it,
        drag on open grid space to size a territory, or click an owned spot to
        take it over.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
      >
        Got it
      </button>
    </div>
  );
}
