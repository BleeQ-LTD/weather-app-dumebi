import { describe, expect, it } from "vitest";
import { buildIndex, nearestCity } from "../../locationService/placeIndex";

const index = buildIndex([
  ["Lagos", "NG", 1, 6.6, 3.34, 10_000_000],
  ["Lagos", "NG", 0, 6.4541, 3.3947, 9_000_000],
  ["Ikeja", "NG", 0, 6.6018, 3.3515, 313_196],
  ["Abuja", "NG", 0, 9.0579, 7.4951, 590_400],
]);

describe("naming My Location from the built-in list", () => {
  it("picks the nearest city, never a state", () => {
    expect(nearestCity(index, 6.59, 3.35)?.name).toBe("Ikeja, Nigeria");
    expect(nearestCity(index, 6.45, 3.4)?.name).toBe("Lagos, Nigeria");
  });

  it("gives nothing when no city is within 50 km", () => {
    expect(nearestCity(index, 0, 0)).toBeNull();
  });
});
