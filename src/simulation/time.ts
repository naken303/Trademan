import type { Duration, SimulationTime } from "../shared/types";

export function durationToHours(duration: Duration): number {
  return duration.days * 24 + duration.hours;
}

export function hoursToDuration(hours: number): Duration {
  if (hours < 0) {
    throw new Error("Duration cannot be negative");
  }

  return {
    days: Math.floor(hours / 24),
    hours: hours % 24,
  };
}

export function addHours(
  time: SimulationTime,
  hours: number,
): SimulationTime {
  if (hours < 0) {
    throw new Error("Hours cannot be negative");
  }

  const totalHours =
    time.day * 24 +
    time.hour +
    hours;

  return {
    day: Math.floor(totalHours / 24),
    hour: totalHours % 24,
  };
}