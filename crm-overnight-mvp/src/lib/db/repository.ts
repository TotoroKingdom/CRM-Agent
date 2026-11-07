import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Activity, Deal, FollowupTask, Lead, LeadDetails, DealStage, ActivityType } from "@/lib/types";
import type { ActivityInput, DealInput, DealPatch, LeadInput, LeadPatch, TaskInput, TaskPatch } from "@/lib/validation/schemas";

type LeadRow = {
  id: string; name: string; company: string; email: string | null; phone: string | null;
  channel: Lead["channel"]; status: Lead["status"]; priority: Lead["priority"];
  country: string | null; note: string | null; created_at: string; updated_at: string;
  deal_count?: number; open_task_count?: number;
};
type DealRow = {
  id: string; lead_id: string; lead_name?: string; company?: string; title: string; amount_cents: number;
  stage: Deal["stage"]; expected_close_at: string | null; created_at: string; updated_at: string;
};
type ActivityRow = {
  id: string; lead_id: string; lead_name?: string; company?: string; type: ActivityType; content: string;
  occurred_at: string; created_at: string;
};
type TaskRow = {
  id: string; lead_id: string; lead_name?: string; company?: string; title: string; due_at: string;
  completed_at: string | null; created_at: string; updated_at: string;
};

const now = () => new Date().toISOString();

export class CrmRepository {
  constructor(private readonly db: DatabaseSync) {}

  listLeads(filters: { search?: string; status?: Lead["status"]; channel?: Lead["channel"] } = {}): Lead[] {
    const conditions: string[] = [];
    const params: Record<string, string> = {};
    if (filters.search?.trim()) {
      conditions.push("(l.name LIKE $search OR l.company LIKE $search OR COALESCE(l.email, '') LIKE $search)");
      params.$search = `%${filters.search.trim()}%`;
    }
    if (filters.status) { conditions.push("l.status = $status"); params.$status = filters.status; }
    if (filters.channel) { conditions.push("l.channel = $channel"); params.$channel = filters.channel; }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.db.prepare(`
      SELECT l.*, COUNT(DISTINCT d.id) AS deal_count,
        COUNT(DISTINCT CASE WHEN t.completed_at IS NULL THEN t.id END) AS open_task_count
      FROM leads l
      LEFT JOIN deals d ON d.lead_id = l.id
      LEFT JOIN followup_tasks t ON t.lead_id = l.id
      ${where}
      GROUP BY l.id
      ORDER BY l.updated_at DESC
    `).all(params) as unknown as LeadRow[];
    return rows.map(mapLead);
  }

  getLeadById(id: string): LeadDetails | null {
    const row = this.db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as unknown as LeadRow | undefined;
    if (!row) return null;
    return {
      ...mapLead(row),
      activities: this.listActivities(id),
      deals: this.listDeals({ leadId: id }),
      tasks: this.listTasks({ leadId: id }),
    };
  }

  createLead(input: LeadInput): Lead {
    const timestamp = now();
    const id = randomUUID();
    this.db.prepare(`INSERT INTO leads (id, name, company, email, phone, channel, status, priority, country, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, input.name, input.company, input.email ?? null, input.phone ?? null, input.channel,
      input.status, input.priority, input.country ?? null, input.note ?? null, timestamp, timestamp,
    );
    return this.getLeadById(id) as Lead;
  }

  updateLead(id: string, patch: LeadPatch): Lead {
    const current = this.db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as unknown as LeadRow | undefined;
    if (!current) throw new Error("LEAD_NOT_FOUND");
    const next = { ...mapLead(current), ...patch };
    const timestamp = now();
    this.db.prepare(`UPDATE leads SET name = ?, company = ?, email = ?, phone = ?, channel = ?, status = ?, priority = ?, country = ?, note = ?, updated_at = ? WHERE id = ?`).run(
      next.name, next.company, next.email ?? null, next.phone ?? null, next.channel, next.status, next.priority,
      next.country ?? null, next.note ?? null, timestamp, id,
    );
    return this.getLeadById(id) as Lead;
  }

  deleteLead(id: string): boolean {
    const result = this.db.prepare("DELETE FROM leads WHERE id = ?").run(id);
    return Number(result.changes) > 0;
  }

  listDeals(filters: { leadId?: string } = {}): Deal[] {
    const rows = this.db.prepare(`SELECT d.*, l.name AS lead_name, l.company
      FROM deals d JOIN leads l ON l.id = d.lead_id
      ${filters.leadId ? "WHERE d.lead_id = ?" : ""}
      ORDER BY CASE d.stage WHEN 'WON' THEN 6 WHEN 'LOST' THEN 7 ELSE 1 END, d.updated_at DESC`)
      .all(...(filters.leadId ? [filters.leadId] : [])) as unknown as DealRow[];
    return rows.map(mapDeal);
  }

  createDeal(input: DealInput): Deal {
    this.assertLeadExists(input.leadId);
    const timestamp = now();
    const id = randomUUID();
    this.db.prepare(`INSERT INTO deals (id, lead_id, title, amount_cents, stage, expected_close_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.leadId, input.title, input.amountCents, input.stage, input.expectedCloseAt ?? null, timestamp, timestamp);
    return this.listDeals({ leadId: input.leadId }).find((deal) => deal.id === id) as Deal;
  }

  updateDeal(id: string, patch: DealPatch): Deal {
    const current = this.db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as unknown as DealRow | undefined;
    if (!current) throw new Error("DEAL_NOT_FOUND");
    const next = { ...mapDeal(current), ...patch };
    const timestamp = now();
    this.db.prepare("UPDATE deals SET title = ?, amount_cents = ?, stage = ?, expected_close_at = ?, updated_at = ? WHERE id = ?")
      .run(next.title, next.amountCents, next.stage, next.expectedCloseAt ?? null, timestamp, id);
    return this.listDeals({ leadId: current.lead_id }).find((deal) => deal.id === id) as Deal;
  }

  listActivities(leadId?: string): Activity[] {
    const rows = this.db.prepare(`SELECT a.*, l.name AS lead_name, l.company
      FROM activities a JOIN leads l ON l.id = a.lead_id
      ${leadId ? "WHERE a.lead_id = ?" : ""}
      ORDER BY a.occurred_at DESC`).all(...(leadId ? [leadId] : [])) as unknown as ActivityRow[];
    return rows.map(mapActivity);
  }

  createActivity(input: ActivityInput): Activity {
    this.assertLeadExists(input.leadId);
    const id = randomUUID();
    const timestamp = now();
    this.db.prepare("INSERT INTO activities (id, lead_id, type, content, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, input.leadId, input.type, input.content, input.occurredAt, timestamp);
    return this.listActivities(input.leadId).find((activity) => activity.id === id) as Activity;
  }

  listTasks(filters: { leadId?: string; completed?: boolean; overdueBefore?: string; dueBefore?: string } = {}): FollowupTask[] {
    const conditions: string[] = [];
    const values: string[] = [];
    if (filters.leadId) { conditions.push("t.lead_id = ?"); values.push(filters.leadId); }
    if (filters.completed === true) conditions.push("t.completed_at IS NOT NULL");
    if (filters.completed === false) conditions.push("t.completed_at IS NULL");
    if (filters.overdueBefore) { conditions.push("t.due_at < ?"); values.push(filters.overdueBefore); }
    if (filters.dueBefore) { conditions.push("datetime(t.due_at) <= datetime(?)"); values.push(filters.dueBefore); }
    const rows = this.db.prepare(`SELECT t.*, l.name AS lead_name, l.company
      FROM followup_tasks t JOIN leads l ON l.id = t.lead_id
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY CASE WHEN t.completed_at IS NULL THEN 0 ELSE 1 END, t.due_at ASC`)
      .all(...values) as unknown as TaskRow[];
    return rows.map(mapTask);
  }

  createTask(input: TaskInput): FollowupTask {
    this.assertLeadExists(input.leadId);
    const id = randomUUID();
    const timestamp = now();
    this.db.prepare("INSERT INTO followup_tasks (id, lead_id, title, due_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)")
      .run(id, input.leadId, input.title, input.dueAt, timestamp, timestamp);
    return this.listTasks({ leadId: input.leadId }).find((task) => task.id === id) as FollowupTask;
  }

  updateTask(id: string, patch: TaskPatch): FollowupTask {
    const current = this.db.prepare("SELECT * FROM followup_tasks WHERE id = ?").get(id) as unknown as TaskRow | undefined;
    if (!current) throw new Error("TASK_NOT_FOUND");
    const timestamp = now();
    const title = patch.title ?? current.title;
    const dueAt = patch.dueAt ?? current.due_at;
    const completedAt = patch.completed === undefined ? current.completed_at : patch.completed ? timestamp : null;
    this.db.prepare("UPDATE followup_tasks SET title = ?, due_at = ?, completed_at = ?, updated_at = ? WHERE id = ?")
      .run(title, dueAt, completedAt, timestamp, id);
    return this.listTasks({ leadId: current.lead_id }).find((task) => task.id === id) as FollowupTask;
  }

  getDashboardStats(referenceTime = now()) {
    const dayBounds = getBeijingDayBounds(referenceTime);
    const leadCount = Number((this.db.prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number }).count);
    const activeDealCount = Number((this.db.prepare("SELECT COUNT(*) AS count FROM deals WHERE stage NOT IN ('WON', 'LOST')").get() as { count: number }).count);
    const expectedAmountCents = Number((this.db.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS amount FROM deals WHERE stage NOT IN ('WON', 'LOST')").get() as { amount: number }).amount);
    const todayTaskCount = Number((this.db.prepare("SELECT COUNT(*) AS count FROM followup_tasks WHERE completed_at IS NULL AND datetime(due_at) >= datetime(?) AND datetime(due_at) <= datetime(?)").get(dayBounds.start, dayBounds.end) as { count: number }).count);
    const overdueTaskCount = Number((this.db.prepare("SELECT COUNT(*) AS count FROM followup_tasks WHERE completed_at IS NULL AND datetime(due_at) < datetime(?)").get(dayBounds.start) as { count: number }).count);
    return { leadCount, activeDealCount, expectedAmountCents, todayTaskCount, overdueTaskCount };
  }

  getDashboardData(referenceTime = now()) {
    const dayBounds = getBeijingDayBounds(referenceTime);
    return {
      stats: this.getDashboardStats(referenceTime),
      tasks: this.listTasks({ completed: false, dueBefore: dayBounds.end }).slice(0, 6),
      activities: this.listActivities().slice(0, 6),
      deals: this.listDeals().slice(0, 8),
    };
  }

  getEntityCounts() {
    return {
      leads: Number((this.db.prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number }).count),
      deals: Number((this.db.prepare("SELECT COUNT(*) AS count FROM deals").get() as { count: number }).count),
      activities: Number((this.db.prepare("SELECT COUNT(*) AS count FROM activities").get() as { count: number }).count),
      tasks: Number((this.db.prepare("SELECT COUNT(*) AS count FROM followup_tasks").get() as { count: number }).count),
    };
  }

  isEmpty(): boolean {
    const counts = this.getEntityCounts();
    return counts.leads === 0 && counts.deals === 0 && counts.activities === 0 && counts.tasks === 0;
  }

  private assertLeadExists(id: string): void {
    const row = this.db.prepare("SELECT id FROM leads WHERE id = ?").get(id);
    if (!row) throw new Error("LEAD_NOT_FOUND");
  }
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id, name: row.name, company: row.company, email: row.email, phone: row.phone,
    channel: row.channel, status: row.status, priority: row.priority, country: row.country, note: row.note,
    createdAt: row.created_at, updatedAt: row.updated_at, dealCount: Number(row.deal_count ?? 0), openTaskCount: Number(row.open_task_count ?? 0),
  };
}

function mapDeal(row: DealRow): Deal {
  return {
    id: row.id, leadId: row.lead_id, leadName: row.lead_name, company: row.company, title: row.title,
    amountCents: Number(row.amount_cents), stage: row.stage, expectedCloseAt: row.expected_close_at,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapActivity(row: ActivityRow): Activity {
  return {
    id: row.id, leadId: row.lead_id, leadName: row.lead_name, company: row.company, type: row.type,
    content: row.content, occurredAt: row.occurred_at, createdAt: row.created_at,
  };
}

function mapTask(row: TaskRow): FollowupTask {
  return {
    id: row.id, leadId: row.lead_id, leadName: row.lead_name, company: row.company, title: row.title,
    dueAt: row.due_at, completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function getBeijingDayBounds(referenceTime: string): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(referenceTime));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  return {
    start: new Date(`${date}T00:00:00+08:00`).toISOString(),
    end: new Date(`${date}T23:59:59.999+08:00`).toISOString(),
  };
}
