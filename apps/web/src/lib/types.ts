import type { components } from "@/generated/api";

type Schemas = components["schemas"];

export type Channel = Schemas["Channel"];
export type LeadStatus = Schemas["LeadStatus"];
export type Priority = Schemas["Priority"];
export type DealStage = Schemas["DealStage"];
export type ActivityType = Schemas["ActivityType"];
export type TaskFilter = Schemas["TaskFilter"];

export type Lead = Schemas["LeadResponse"];
export type LeadDetails = Schemas["LeadDetailsResponse"];
export type Deal = Schemas["DealResponse"];
export type Activity = Schemas["ActivityResponse"];
export type FollowupTask = Schemas["TaskResponse"];
export type DashboardData = Schemas["DashboardData"];

export type LeadCreate = Schemas["LeadCreate"];
export type LeadUpdate = Schemas["LeadUpdate"];
export type DealCreate = Schemas["DealCreate"];
export type DealUpdate = Schemas["DealUpdate"];
export type ActivityCreate = Schemas["ActivityCreate"];
export type TaskCreate = Schemas["TaskCreate"];
export type TaskUpdate = Schemas["TaskUpdate"];

export const CHANNELS = [
  "WEBSITE",
  "SHOPIFY",
  "AMAZON",
  "TIKTOK",
  "REFERRAL",
  "OTHER",
] as const satisfies readonly Channel[];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
] as const satisfies readonly LeadStatus[];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const satisfies readonly Priority[];

export const DEAL_STAGES = [
  "DISCOVERY",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const satisfies readonly DealStage[];

export const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MESSAGE",
  "MEETING",
  "NOTE",
] as const satisfies readonly ActivityType[];

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
