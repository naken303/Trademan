import type { RunInitialization, Village } from "../../shared/types";

export interface VillageResetDraftValue {
  days: string;
  hours: string;
}

export type VillageResetDraft = Record<string, VillageResetDraftValue>;

export interface VillageResetFieldErrors {
  days?: string;
  hours?: string;
  duration?: string;
}

export function createVillageResetDraft(villages: Village[]): VillageResetDraft {
  return Object.fromEntries(villages.map((village) => [village.id, {
    days: String(village.reset.afterReset.days),
    hours: String(village.reset.afterReset.hours),
  }]));
}

export function parseVillageResetDraft(villages: Village[], values: VillageResetDraft): {
  initialization: RunInitialization | null;
  errors: Record<string, VillageResetFieldErrors>;
} {
  const villageResetRemaining: RunInitialization["villageResetRemaining"] = {};
  const errors: Record<string, VillageResetFieldErrors> = {};

  for (const village of villages) {
    const value = values[village.id] ?? { days: "", hours: "" };
    const days = Number(value.days);
    const hours = Number(value.hours);
    const villageErrors: VillageResetFieldErrors = {};

    if (value.days.trim() === "" || !Number.isInteger(days) || days < 0) {
      villageErrors.days = "Days must be a whole number of 0 or greater.";
    }
    if (value.hours.trim() === "" || !Number.isInteger(hours) || hours < 0 || hours > 23) {
      villageErrors.hours = "Hours must be a whole number from 0 to 23.";
    }
    if (!villageErrors.days && !villageErrors.hours && days === 0 && hours === 0) {
      villageErrors.duration = "Current reset must be greater than zero.";
    }

    if (Object.keys(villageErrors).length > 0) errors[village.id] = villageErrors;
    else villageResetRemaining[village.id] = { days, hours };
  }

  return {
    initialization: Object.keys(errors).length === 0 ? { villageResetRemaining } : null,
    errors,
  };
}
