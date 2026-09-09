import { create } from "zustand";

import type { WorldData } from "../../../shared/types";
import type { VillagePositionChange } from "./world-history";
import {
  getWorld,
  updateVillagePosition as saveVillagePosition,
} from "./world-api";

interface WorldStore {
  world: WorldData | null;
  savedWorld: WorldData | null;

  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  undoStack: VillagePositionChange[];
  redoStack: VillagePositionChange[];

  loadWorld: () => Promise<void>;

  updateVillagePosition: (
    villageId: string,
    x: number,
    y: number,
  ) => void;

  undo: () => void;
  redo: () => void;

  saveChanges: () => Promise<void>;
  cancelChanges: () => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  world: null,
  savedWorld: null,

  loading: false,
  error: null,
  hasUnsavedChanges: false,

  undoStack: [],
  redoStack: [],

  loadWorld: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const world = await getWorld();

      set({
        world,
        savedWorld: structuredClone(world),
        loading: false,
        error: null,
        hasUnsavedChanges: false,
        undoStack: [],
        redoStack: [],
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load world",
      });
    }
  },

  updateVillagePosition: (
    villageId,
    x,
    y,
  ) => {
    set((state) => {
      if (!state.world) {
        return state;
      }

      const village = state.world.villages.find(
        (item) => item.id === villageId,
      );

      if (!village) {
        return state;
      }

      const from = {
        ...village.position,
      };

      const to = {
        x,
        y,
      };

      if (
        from.x === to.x &&
        from.y === to.y
      ) {
        return state;
      }

      const change: VillagePositionChange = {
        villageId,
        from,
        to,
      };

      return {
        world: {
          ...state.world,

          villages: state.world.villages.map(
            (item) =>
              item.id === villageId
                ? {
                    ...item,
                    position: to,
                  }
                : item,
          ),
        },

        undoStack: [
          ...state.undoStack,
          change,
        ],

        redoStack: [],

        hasUnsavedChanges: true,
      };
    });
  },

  undo: () => {
    set((state) => {
      const change =
        state.undoStack[
          state.undoStack.length - 1
        ];

      if (!change || !state.world) {
        return state;
      }

      return {
        world: {
          ...state.world,

          villages: state.world.villages.map(
            (village) =>
              village.id === change.villageId
                ? {
                    ...village,
                    position: {
                      ...change.from,
                    },
                  }
                : village,
          ),
        },

        undoStack: state.undoStack.slice(
          0,
          -1,
        ),

        redoStack: [
          ...state.redoStack,
          change,
        ],

        hasUnsavedChanges: true,
      };
    });
  },

  redo: () => {
    set((state) => {
      const change =
        state.redoStack[
          state.redoStack.length - 1
        ];

      if (!change || !state.world) {
        return state;
      }

      return {
        world: {
          ...state.world,

          villages: state.world.villages.map(
            (village) =>
              village.id === change.villageId
                ? {
                    ...village,
                    position: {
                      ...change.to,
                    },
                  }
                : village,
          ),
        },

        redoStack: state.redoStack.slice(
          0,
          -1,
        ),

        undoStack: [
          ...state.undoStack,
          change,
        ],

        hasUnsavedChanges: true,
      };
    });
  },

  saveChanges: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const currentWorld =
        useWorldStore.getState().world;

      if (!currentWorld) {
        throw new Error(
          "World is not loaded",
        );
      }

      const savedWorld =
        useWorldStore.getState().savedWorld;

      if (!savedWorld) {
        throw new Error(
          "Original world is not available",
        );
      }

      for (const village of currentWorld.villages) {
        const originalVillage =
          savedWorld.villages.find(
            (item) =>
              item.id === village.id,
          );

        if (!originalVillage) {
          continue;
        }

        if (
          village.position.x !==
            originalVillage.position.x ||
          village.position.y !==
            originalVillage.position.y
        ) {
          await saveVillagePosition(
            village.id,
            village.position,
          );
        }
      }

      const refreshedWorld =
        await getWorld();

      set({
        world: refreshedWorld,
        savedWorld:
          structuredClone(refreshedWorld),
        loading: false,
        error: null,
        hasUnsavedChanges: false,
        undoStack: [],
        redoStack: [],
      });
    } catch (error) {
      set({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save changes",
      });
    }
  },

  cancelChanges: () => {
    set((state) => {
      if (!state.savedWorld) {
        return state;
      }

      return {
        world: structuredClone(
          state.savedWorld,
        ),
        hasUnsavedChanges: false,
        undoStack: [],
        redoStack: [],
      };
    });
  },
}));
