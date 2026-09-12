export function unitsToCrates(units: number, unitsPerCrate: number): number {
  if (!Number.isInteger(units) || units <= 0 || !Number.isInteger(unitsPerCrate) || unitsPerCrate <= 0) {
    throw new Error("Units and units per crate must be positive whole numbers");
  }
  return units / unitsPerCrate;
}

export function cratesToUnits(crates: number, unitsPerCrate: number): number {
  if (!Number.isFinite(crates) || crates <= 0 || !Number.isInteger(unitsPerCrate) || unitsPerCrate <= 0) {
    throw new Error("Crates must be positive and units per crate must be a positive whole number");
  }
  const units = crates * unitsPerCrate;
  if (!Number.isInteger(units)) throw new Error("Crate quantity must resolve to a whole number of units");
  return units;
}
