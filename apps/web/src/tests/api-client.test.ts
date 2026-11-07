import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, crmApi } from "@/lib/api/client";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("CRM API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps data and sends camelCase lead filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: [
          {
            id: "lead-1",
            name: "橙海贸易",
            company: "橙海贸易有限公司",
            email: null,
            phone: null,
            channel: "SHOPIFY",
            status: "NEW",
            priority: "HIGH",
            country: "中国",
            note: null,
            createdAt: "2026-11-07T00:00:00.000Z",
            updatedAt: "2026-11-07T00:00:00.000Z",
            dealCount: 0,
            openTaskCount: 0,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const leads = await crmApi.listLeads({
      search: "橙海",
      status: "NEW",
      channel: "SHOPIFY",
    });

    expect(leads[0]?.name).toBe("橙海贸易");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads?search=%E6%A9%99%E6%B5%B7&status=NEW&channel=SHOPIFY",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("sends JSON for mutations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({ data: { id: "task-1" } }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);

    await crmApi.createTask({
      leadId: "lead-1",
      title: "联系客户",
      dueAt: "2026-11-08T02:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          leadId: "lead-1",
          title: "联系客户",
          dueAt: "2026-11-08T02:00:00.000Z",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("preserves the server error message and fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            error: "输入校验失败",
            fields: { name: ["请填写客户姓名"] },
          },
          400,
        ),
      ),
    );

    const error = await crmApi.createLead({} as never).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe("输入校验失败");
    expect((error as ApiError).fields).toEqual({ name: ["请填写客户姓名"] });
  });

  it("rejects a successful response without the data envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ items: [] })));

    await expect(crmApi.listDeals()).rejects.toThrow("接口响应格式不正确");
  });
});
