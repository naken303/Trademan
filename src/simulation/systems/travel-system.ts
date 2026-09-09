import type {
  Route,
  SimulationState,
} from "../../shared/types";

import { getTravelTime } from "../../domain/route";

import {
  addHours,
  durationToHours,
} from "../time";

import { advanceVillageReset } from "./reset-system";

export function travel(
  state: SimulationState,
  routes: Route[],
  destinationId: string,
): SimulationState {
  const currentVillageId =
    state.player.location;

  if (
    currentVillageId === destinationId
  ) {
    throw new Error(
      "Player is already at this village",
    );
  }

  const travelTime = getTravelTime(
    routes,
    currentVillageId,
    destinationId,
  );

  if (!travelTime) {
    throw new Error(
      `No route from ${currentVillageId} to ${destinationId}`,
    );
  }

  const elapsedHours =
    durationToHours(travelTime);

  const nextVillages =
    Object.fromEntries(
      Object.entries(state.villages).map(
        ([villageId, village]) => [
          villageId,
          advanceVillageReset(
            village,
            elapsedHours,
          ),
        ],
      ),
    );

  return {
    ...state,

    time: addHours(
      state.time,
      elapsedHours,
    ),

    player: {
      ...state.player,
      location: destinationId,
    },

    villages: nextVillages,
  };
}