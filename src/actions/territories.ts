"use server";

import type { ActionResult } from "@/types";

/**
 * Territory claim and takeover actions.
 * Implemented in Phase 2–3.
 */

export async function claimTerritory(): Promise<ActionResult> {
  return {
    success: false,
    error: "Territory claiming is not available yet. Coming in Phase 2.",
  };
}

export async function takeoverTerritory(): Promise<ActionResult> {
  return {
    success: false,
    error: "Territory takeovers are not available yet. Coming in Phase 3.",
  };
}
