export const CHANNELS = ["WEBSITE", "SHOPIFY", "AMAZON", "TIKTOK", "REFERRAL", "OTHER"] as const;
export type Channel = (typeof CHANNELS)[number];

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEAL_STAGES = ["DISCOVERY", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MESSAGE", "MEETING", "NOTE"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  channel: Channel;
  status: LeadStatus;
  priority: Priority;
  country: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  dealCount?: number;
  openTaskCount?: number;
};

export type Deal = {
  id: string;
  leadId: string;
  leadName?: string;
  company?: string;
  title: string;
  amountCents: number;
  stage: DealStage;
  expectedCloseAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  leadId: string;
  leadName?: string;
  company?: string;
  type: ActivityType;
  content: string;
  occurredAt: string;
  createdAt: string;
};

export type FollowupTask = {
  id: string;
  leadId: string;
  leadName?: string;
  company?: string;
  title: string;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadDetails = Lead & {
  activities: Activity[];
  deals: Deal[];
  tasks: FollowupTask[];
};

export const channelLabels: Record<Channel, string> = {
  WEBSITE: "官网",
  SHOPIFY: "Shopify",
  AMAZON: "Amazon",
  TIKTOK: "TikTok",
  REFERRAL: "转介绍",
  OTHER: "其他",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "新线索",
  CONTACTED: "已联系",
  QUALIFIED: "已确认",
  DISQUALIFIED: "无效",
};

export const priorityLabels: Record<Priority, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export const dealStageLabels: Record<DealStage, string> = {
  DISCOVERY: "发现需求",
  QUALIFICATION: "资格确认",
  PROPOSAL: "方案报价",
  NEGOTIATION: "商务谈判",
  WON: "已赢单",
  LOST: "已丢单",
};

export const activityTypeLabels: Record<ActivityType, string> = {
  CALL: "电话",
  EMAIL: "邮件",
  MESSAGE: "消息",
  MEETING: "会议",
  NOTE: "备注",
};
