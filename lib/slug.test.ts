import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("collapses multiple separators", () => {
    expect(slugify("hello   ---  world")).toBe("hello-world");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify(" - hello -")).toBe("hello");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Crème brûlée 99%!")).toBe("cr-me-br-l-e-99");
  });

  it("caps at 80 characters", () => {
    const long = "a".repeat(120);
    expect(slugify(long).length).toBe(80);
  });

  it("returns empty string on input with no usable chars", () => {
    expect(slugify("---")).toBe("");
  });
});
