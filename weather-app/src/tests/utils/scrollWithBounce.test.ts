import { describe, expect, it } from "vitest";
import { easeOutBack } from "../../utils/scrollWithBounce";

const samples = Array.from({ length: 101 }, (_, i) => easeOutBack(i / 100));

describe("easeOutBack (the bounce curve)", () => {
  it("starts at 0 and ends exactly on the target", () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 10);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
  });

  it("overshoots the target before settling (that is the bounce)", () => {
    expect(Math.max(...samples)).toBeGreaterThan(1);
  });

  it("settles back towards the target at the end", () => {
    expect(easeOutBack(0.99)).toBeLessThan(easeOutBack(0.8));
    expect(easeOutBack(0.99)).toBeCloseTo(1, 2);
  });

  it("never goes backwards past the starting point", () => {
    samples.forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
  });
});
