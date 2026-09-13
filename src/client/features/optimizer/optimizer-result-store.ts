import { create } from "zustand";

import type { OptimizerResult } from "../../../optimizer";

interface OptimizerResultStore {
  result: OptimizerResult | null;
  setResult: (result: OptimizerResult) => void;
  clearResult: () => void;
}

/** Session-only output: navigation must not discard a completed optimizer result. */
export const useOptimizerResultStore = create<OptimizerResultStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
