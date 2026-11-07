import type { DatabaseSync } from "node:sqlite";
import { CrmRepository } from "./repository";
import type { ActivityType, Channel, DealStage, LeadStatus, Priority } from "@/lib/types";

type SeedResult = { seeded: boolean; counts: ReturnType<CrmRepository["getEntityCounts"]> };

const channels: Channel[] = ["WEBSITE", "SHOPIFY", "AMAZON", "TIKTOK", "REFERRAL", "OTHER"];
const statuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED"];
const priorities: Priority[] = ["HIGH", "MEDIUM", "LOW"];
const stages: DealStage[] = ["DISCOVERY", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const activityTypes: ActivityType[] = ["CALL", "EMAIL", "MESSAGE", "MEETING", "NOTE"];

export function seedDemoData(database: DatabaseSync): SeedResult {
  const repository = new CrmRepository(database);
  if (!repository.isEmpty()) return { seeded: false, counts: repository.getEntityCounts() };

  database.exec("BEGIN");
  try {
    const leads = Array.from({ length: 24 }, (_, index) => repository.createLead({
      name: ["林晓雯", "Daniel Wong", "周子昂", "Mia Chen", "王嘉诚", "Sofia Liu"][index % 6] + (index >= 6 ? ` ${index + 1}` : ""),
      company: ["星河家居", "Harbor Outdoor", "青岚科技", "Mango Supply", "南风美妆", "Atlas Living"][index % 6],
      email: `demo-${index + 1}@example.test`,
      phone: `+86 138 0000 ${String(1000 + index).slice(-4)}`,
      channel: channels[index % channels.length],
      status: statuses[index % statuses.length],
      priority: priorities[index % priorities.length],
      country: ["中国", "新加坡", "马来西亚", "美国", "英国"][index % 5],
      note: "演示数据：虚构客户，不代表真实业务记录。",
    }));

    for (let index = 0; index < 10; index += 1) {
      const lead = leads[index % leads.length];
      repository.createDeal({
        leadId: lead.id,
        title: ["独立站增长方案", "Amazon 客服自动化", "TikTok 内容运营", "跨境销售助手"][index % 4],
        amountCents: [8600000, 12800000, 15800000, 23600000][index % 4],
        stage: stages[index % stages.length],
        expectedCloseAt: new Date(Date.UTC(2026, 10, 10 + index)).toISOString(),
      });
    }

    for (let index = 0; index < 20; index += 1) {
      const lead = leads[index % leads.length];
      repository.createActivity({
        leadId: lead.id,
        type: activityTypes[index % activityTypes.length],
        content: ["已确认客户当前的渠道投放目标。", "发送了行业案例和初步方案。", "客户回复了采购预算区间。", "完成首次需求访谈。", "记录客户的关键决策人信息。"][index % 5],
        occurredAt: new Date(Date.UTC(2026, 10, Math.max(1, 7 - Math.floor(index / 4)), 2 + index, 0)).toISOString(),
      });
    }

    for (let index = 0; index < 12; index += 1) {
      const lead = leads[(index + 2) % leads.length];
      repository.createTask({
        leadId: lead.id,
        title: ["发送第一版报价与案例", "确认店铺月均订单量", "安排下一次需求会议", "补充客户联系人信息"][index % 4],
        dueAt: new Date(Date.UTC(2026, 10, 5 + index, 2, 0)).toISOString(),
      });
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { seeded: true, counts: repository.getEntityCounts() };
}
