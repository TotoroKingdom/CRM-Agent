import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, createDatabase } from "@/lib/db/database";
import { CrmRepository } from "@/lib/db/repository";
import type { DatabaseSync } from "node:sqlite";

describe("核心 CRM 业务闭环", () => {
  let database: DatabaseSync;
  let repository: CrmRepository;

  beforeEach(() => {
    database = createDatabase(":memory:");
    repository = new CrmRepository(database);
  });

  afterEach(() => closeDatabase(database));

  it("支持新客户、互动、报价商机、下次联系任务和完成任务", () => {
    const lead = repository.createLead({
      name: "橙海贸易",
      company: "橙海贸易有限公司",
      email: "chenghai@example.test",
      phone: null,
      channel: "SHOPIFY",
      status: "NEW",
      priority: "HIGH",
      country: "中国",
      note: "明天人工验收使用的虚构客户。",
    });
    const activity = repository.createActivity({
      leadId: lead.id,
      type: "CALL",
      content: "电话确认了独立站增长需求。",
      occurredAt: "2026-11-07T03:00:00.000Z",
    });
    const deal = repository.createDeal({
      leadId: lead.id,
      title: "独立站增长方案",
      amountCents: 5_000_000,
      stage: "DISCOVERY",
      expectedCloseAt: "2026-11-22T01:00:00.000Z",
    });
    const proposal = repository.updateDeal(deal.id, { stage: "PROPOSAL" });
    const task = repository.createTask({
      leadId: lead.id,
      title: "明天联系客户确认报价",
      dueAt: "2026-11-07T05:00:00.000Z",
    });

    expect(repository.getLeadById(lead.id)?.activities[0]?.id).toBe(activity.id);
    expect(proposal.stage).toBe("PROPOSAL");
    expect(proposal.amountCents).toBe(5_000_000);
    expect(repository.getDashboardStats("2026-11-07T01:00:00.000Z").expectedAmountCents).toBe(5_000_000);
    expect(repository.getDashboardStats("2026-11-07T01:00:00.000Z").todayTaskCount).toBe(1);

    const completed = repository.updateTask(task.id, { completed: true });

    expect(completed.completedAt).toEqual(expect.any(String));
    expect(repository.getLeadById(lead.id)?.tasks[0]?.completedAt).toEqual(expect.any(String));
    expect(repository.getDashboardStats("2026-11-07T01:00:00.000Z").todayTaskCount).toBe(0);
  });
});
