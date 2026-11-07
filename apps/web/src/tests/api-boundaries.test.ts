import { describe, expect, it } from "vitest";
import { jsonError, readJson } from "@/lib/api";
import { toDateTimeInputValue, toIsoFromDateTimeInput } from "@/lib/format";
import { leadListQuerySchema, taskListQuerySchema } from "@/lib/validation/schemas";

describe("API 与表单边界", () => {
  it("returns a client error for malformed JSON instead of throwing through the handler", async () => {
    await expect(readJson(new Request("http://localhost", { method: "POST", body: "not-json" }))).rejects.toThrow("INVALID_JSON");
    expect(jsonError(new Error("INVALID_JSON")).status).toBe(400);
  });

  it("rejects unsupported filters at the server boundary", () => {
    expect(() => leadListQuerySchema.parse({ status: "WECHAT" })).toThrow();
    expect(() => taskListQuerySchema.parse({ filter: "pending-forever" })).toThrow();
  });

  it("round-trips a Beijing datetime input through ISO UTC storage", () => {
    const stored = toIsoFromDateTimeInput("2026-11-07T11:30");
    expect(stored).toBe("2026-11-07T03:30:00.000Z");
    expect(toDateTimeInputValue(stored)).toBe("2026-11-07T11:30");
  });
});
