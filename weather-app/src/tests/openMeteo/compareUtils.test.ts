import { describe, expect, it } from "vitest";
import { describeTemperatureDifference, shortPlaceName } from "../../weatherService/compareUtils";

describe("comparing two cities", () => {
  it("uses the city part of the label", () => {
    expect(shortPlaceName("Lagos, Nigeria")).toBe("Lagos");
    expect(shortPlaceName("Nigeria")).toBe("Nigeria");
  });

  it("says which city is warmer, by the rounded numbers shown", () => {
    expect(describeTemperatureDifference("Lagos, Nigeria", 29.4, "Abuja, Nigeria", 26.2, "celsius")).toBe(
      "Lagos is 3° warmer than Abuja right now."
    );
    expect(describeTemperatureDifference("Lagos, Nigeria", 26.2, "Abuja, Nigeria", 29.4, "celsius")).toBe(
      "Abuja is 3° warmer than Lagos right now."
    );
  });

  it("works in Fahrenheit", () => {
    // 29°C = 84°F, 26°C = 79°F
    expect(describeTemperatureDifference("Lagos", 29, "Abuja", 26, "fahrenheit")).toBe(
      "Lagos is 5° warmer than Abuja right now."
    );
  });

  it("says when they are the same", () => {
    expect(describeTemperatureDifference("Lagos", 29.2, "Ikeja", 28.8, "celsius")).toBe(
      "Lagos and Ikeja are the same temperature right now."
    );
  });
});
