import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, closeDatabase } from "@/lib/db/database";
import { CrmRepository, getBeijingDayBounds } from "@/lib/db/repository";
import { seedDemoData } from "@/lib/db/seed";
import { leadInputSchema } from "@/lib/validation/schemas";
import type { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("CrmRepository", () => {
  let db: DatabaseSync;
  let repository: CrmRepository;

  beforeEach(() => {
    db = createDatabase(":memory:");
    repository = new CrmRepository(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it("creates a lead that can be retrieved after an update", () => {
    const created = repository.createLead({
      name: "橙海贸易",
      company: "橙海贸易有限公司",
      email: "sales@example.test",
      phone: null,
      channel: "SHOPIFY",
      status: "NEW",
      priority: "HIGH",
      country: "中国",
      note: "来自 Shopify 的虚构测试线索",
    });

    repository.updateLead(created.id, { name: "橙海贸易（已联系）", status: "CONTACTED" });

    expect(repository.getLeadById(created.id)?.name).toBe("橙海贸易（已联系）");
    expect(repository.getLeadById(created.id)?.status).toBe("CONTACTED");
  });

  it("keeps a user change after the SQLite connection is closed and reopened", () => {
    const directory = mkdtempSync(join(tmpdir(), "crm-overnight-test-"));
    const databasePath = join(directory, "crm.sqlite");
    try {
      const firstDatabase = createDatabase(databasePath);
      const firstRepository = new CrmRepository(firstDatabase);
      const created = firstRepository.createLead({
        name: "重启后仍存在",
        company: "持久化测试公司",
        email: null,
        phone: null,
        channel: "AMAZON",
        status: "CONTACTED",
        priority: "MEDIUM",
        country: "中国",
        note: null,
      });
      closeDatabase(firstDatabase);

      const reopenedDatabase = createDatabase(databasePath);
      const reopenedRepository = new CrmRepository(reopenedDatabase);
      expect(reopenedRepository.getLeadById(created.id)?.name).toBe("重启后仍存在");
      closeDatabase(reopenedDatabase);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("cascades related deals, activities, and tasks when a lead is deleted", () => {
    const lead = repository.createLead({
      name: "级联测试客户",
      company: "级联测试公司",
      email: null,
      phone: null,
      channel: "WEBSITE",
      status: "NEW",
      priority: "LOW",
      country: null,
      note: null,
    });

    repository.createDeal({
      leadId: lead.id,
      title: "级联测试商机",
      amountCents: 500000,
      stage: "DISCOVERY",
      expectedCloseAt: null,
    });
    repository.createActivity({
      leadId: lead.id,
      type: "NOTE",
      content: "级联测试互动",
      occurredAt: "2026-11-07T02:00:00.000Z",
    });
    repository.createTask({
      leadId: lead.id,
      title: "级联测试任务",
      dueAt: "2026-11-08T02:00:00.000Z",
    });

    expect(repository.deleteLead(lead.id)).toBe(true);
    expect(repository.getLeadById(lead.id)).toBeNull();
    expect(repository.listDeals()).toHaveLength(0);
    expect(repository.listActivities()).toHaveLength(0);
    expect(repository.listTasks()).toHaveLength(0);
  });

  it("seeds an empty database once without duplicating or overwriting user data", () => {
    const first = seedDemoData(db);
    const firstCounts = repository.getEntityCounts();
    const userLead = repository.createLead({
      name: "用户创建客户",
      company: "用户创建公司",
      email: null,
      phone: null,
      channel: "REFERRAL",
      status: "QUALIFIED",
      priority: "MEDIUM",
      country: null,
      note: null,
    });

    const second = seedDemoData(db);
    const secondCounts = repository.getEntityCounts();

    expect(first.seeded).toBe(true);
    expect(second.seeded).toBe(false);
    expect(firstCounts.leads).toBeGreaterThanOrEqual(20);
    expect(firstCounts.deals).toBeGreaterThanOrEqual(8);
    expect(firstCounts.activities).toBeGreaterThanOrEqual(20);
    expect(firstCounts.tasks).toBeGreaterThanOrEqual(10);
    expect(secondCounts.leads).toBe(firstCounts.leads + 1);
    expect(repository.getLeadById(userLead.id)?.name).toBe("用户创建客户");
  });

  it("rejects an invalid channel before the repository receives input", () => {
    expect(() => leadInputSchema.parse({
      name: "错误渠道",
      company: "测试公司",
      channel: "WECHAT",
      status: "NEW",
      priority: "LOW",
    })).toThrow();
  });

  it("uses Beijing calendar-day boundaries for dashboard task counts", () => {
    const lead = repository.createLead({
      name: "日期口径客户",
      company: "日期口径公司",
      email: null,
      phone: null,
      channel: "WEBSITE",
      status: "NEW",
      priority: "LOW",
      country: "中国",
      note: null,
    });
    repository.createTask({ leadId: lead.id, title: "北京时间当天任务", dueAt: "2026-11-07T08:00:00.000Z" });
    repository.createTask({ leadId: lead.id, title: "北京时间前一天任务", dueAt: "2026-11-06T15:59:00.000Z" });
    repository.createTask({ leadId: lead.id, title: "北京时间明天任务", dueAt: "2026-11-07T16:00:00.000Z" });

    const referenceTime = "2026-11-07T12:00:00.000Z";
    const bounds = getBeijingDayBounds(referenceTime);
    const stats = repository.getDashboardStats(referenceTime);
    const dashboardTasks = repository.getDashboardData(referenceTime).tasks;

    expect(bounds.start).toBe("2026-11-06T16:00:00.000Z");
    expect(bounds.end).toBe("2026-11-07T15:59:59.999Z");
    expect(stats.todayTaskCount).toBe(1);
    expect(stats.overdueTaskCount).toBe(1);
    expect(dashboardTasks.map((task) => task.title)).toEqual(["北京时间前一天任务", "北京时间当天任务"]);
  });

});
