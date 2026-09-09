import { create } from "zustand";
import { getWorld } from "../world/world-api";
import { SimulationController, type SimulationSnapshot } from "./simulation-controller";

interface SimulationStore {
  controller: SimulationController | null;
  snapshot: SimulationSnapshot | null;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  travel: (destinationId: string) => void;
  buy: (productId: string, quantity: number) => void;
  sell: (productId: string, quantity: number) => void;
  clearError: () => void;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Simulation action failed";

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  controller: null, snapshot: null, loading: false, error: null,
  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const controller = new SimulationController(await getWorld());
      set({ controller, snapshot: controller.getSnapshot(), loading: false });
    } catch (error) { set({ loading: false, error: errorMessage(error) }); }
  },
  travel: (destinationId) => {
    const controller = get().controller;
    if (!controller) return;
    try { set({ snapshot: controller.travel(destinationId), error: null }); }
    catch (error) { set({ error: errorMessage(error) }); }
  },
  buy: (productId, quantity) => {
    const controller = get().controller;
    if (!controller) return;
    try { set({ snapshot: controller.buy(productId, quantity), error: null }); }
    catch (error) { set({ error: errorMessage(error) }); }
  },
  sell: (productId, quantity) => {
    const controller = get().controller;
    if (!controller) return;
    try { set({ snapshot: controller.sell(productId, quantity), error: null }); }
    catch (error) { set({ error: errorMessage(error) }); }
  },
  clearError: () => set({ error: null }),
}));
