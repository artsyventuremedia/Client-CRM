import { describe, expect, it } from "vitest";
import { can, canAny } from "../check";

describe("rbac can()", () => {
  it("grants access when the resource has the requested permission", () => {
    const permissions = { leads: ["VIEW", "CREATE"] as const };
    expect(can(permissions as never, "leads", "VIEW")).toBe(true);
  });

  it("denies access when the resource lacks the requested permission", () => {
    const permissions = { leads: ["VIEW"] as const };
    expect(can(permissions as never, "leads", "DELETE")).toBe(false);
  });

  it("denies access when the resource is absent entirely", () => {
    const permissions = { leads: ["VIEW"] as const };
    expect(can(permissions as never, "invoices", "VIEW")).toBe(false);
  });

  it("MANAGE implies every other permission on that resource", () => {
    const permissions = { clients: ["MANAGE"] as const };
    expect(can(permissions as never, "clients", "DELETE")).toBe(true);
  });

  it("returns false when permissions are undefined", () => {
    expect(can(undefined, "leads", "VIEW")).toBe(false);
  });

  it("canAny returns true if any check passes", () => {
    const permissions = { tickets: ["VIEW"] as const };
    expect(
      canAny(permissions as never, [
        ["leads", "VIEW"],
        ["tickets", "VIEW"],
      ]),
    ).toBe(true);
  });
});
