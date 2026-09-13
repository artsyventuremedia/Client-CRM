import { describe, expect, it } from "vitest";
import { slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Services Pvt Ltd")).toBe("acme-services-pvt-ltd");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Rahul & Co. (India)!!")).toBe("rahul-co-india");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Beta Corp--  ")).toBe("beta-corp");
  });
});
