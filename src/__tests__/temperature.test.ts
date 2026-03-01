import { describe, expect, it } from "vitest";
import { getBandFromFahrenheit, getTemperatureColorFromFahrenheit } from "../lib/temperature";

describe("getBandFromFahrenheit", () => {
  it("maps subzero correctly", () => {
    expect(getBandFromFahrenheit(-1)).toBe("subzero");
  });

  it("maps freezing correctly", () => {
    expect(getBandFromFahrenheit(0)).toBe("freezing");
    expect(getBandFromFahrenheit(50)).toBe("freezing");
    expect(getBandFromFahrenheit(55)).toBe("freezing");
  });

  it("maps mild correctly", () => {
    expect(getBandFromFahrenheit(56)).toBe("mild");
    expect(getBandFromFahrenheit(74)).toBe("mild");
  });

  it("maps hot correctly", () => {
    expect(getBandFromFahrenheit(75)).toBe("hot");
    expect(getBandFromFahrenheit(89)).toBe("hot");
  });

  it("maps superhot correctly", () => {
    expect(getBandFromFahrenheit(90)).toBe("superhot");
  });
});

describe("getTemperatureColorFromFahrenheit", () => {
  it("returns different colors for colder and warmer temperatures in the same broad range", () => {
    expect(getTemperatureColorFromFahrenheit(26)).not.toBe(getTemperatureColorFromFahrenheit(42));
  });

  it("interpolates at 5-degree increments", () => {
    const color40 = getTemperatureColorFromFahrenheit(40);
    const color45 = getTemperatureColorFromFahrenheit(45);
    const color50 = getTemperatureColorFromFahrenheit(50);
    expect(color40).not.toBe(color45);
    expect(color45).not.toBe(color50);
  });
});
