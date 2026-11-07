import { describe, expect, it } from "vitest";
import { toDateTimeInputValue, toIsoFromDateTimeInput } from "@/lib/format";

describe("Beijing datetime helpers", () => {
  it("round-trips a Beijing datetime input through ISO UTC storage", () => {
    const stored = toIsoFromDateTimeInput("2026-11-07T11:30");
    expect(stored).toBe("2026-11-07T03:30:00.000Z");
    expect(toDateTimeInputValue(stored)).toBe("2026-11-07T11:30");
  });

  it("returns an empty input value for a missing date", () => {
    expect(toDateTimeInputValue(null)).toBe("");
  });
});
