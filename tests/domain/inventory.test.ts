import { describe, expect, it } from "vitest";

import {
  getInventoryCrates,
  canAddInventory,
  addInventory,
  removeInventory,
} from "../../src/domain/inventory";

const milk = {
  id: "MILK",
  name: "Milk",
  unitsPerCrate: 20,
};

const egg = {
  id: "EGG",
  name: "Egg",
  unitsPerCrate: 20,
};

const products = [milk, egg];

describe("Inventory", () => {
  it("calculates crates correctly", () => {
    expect(
      getInventoryCrates(
        [
          {
            productId: "MILK",
            quantity: 21,
          },
        ],
        products,
      ),
    ).toBe(2);
  });

  it("does not share crates between products", () => {
    expect(
      getInventoryCrates(
        [
          {
            productId: "MILK",
            quantity: 10,
          },
          {
            productId: "EGG",
            quantity: 10,
          },
        ],
        products,
      ),
    ).toBe(2);
  });

  it("rejects inventory beyond capacity", () => {
    expect(
      canAddInventory(
        [],
        milk,
        21,
        products,
        1,
      ),
    ).toBe(false);
  });

  it("allows inventory within capacity", () => {
    expect(
      canAddInventory(
        [],
        milk,
        20,
        products,
        1,
      ),
    ).toBe(true);
  });

  it("adds inventory", () => {
    const result = addInventory(
      [],
      "MILK",
      10,
    );

    expect(result).toEqual([
      {
        productId: "MILK",
        quantity: 10,
      },
    ]);
  });

  it("stacks the same product", () => {
    const result = addInventory(
      [
        {
          productId: "MILK",
          quantity: 10,
        },
      ],
      "MILK",
      5,
    );

    expect(result).toEqual([
      {
        productId: "MILK",
        quantity: 15,
      },
    ]);
  });

  it("removes inventory", () => {
    const result = removeInventory(
      [
        {
          productId: "MILK",
          quantity: 20,
        },
      ],
      "MILK",
      5,
    );

    expect(result).toEqual([
      {
        productId: "MILK",
        quantity: 15,
      },
    ]);
  });
});