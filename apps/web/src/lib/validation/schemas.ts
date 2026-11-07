import { z } from "zod";
import { ACTIVITY_TYPES, CHANNELS, DEAL_STAGES, LEAD_STATUSES, PRIORITIES } from "@/lib/types";

const optionalText = z.string().trim().max(500).nullable().optional();
const isoDate = z.string().datetime({ offset: true });

export const leadInputSchema = z.object({
  name: z.string().trim().min(1, "请填写客户姓名").max(80, "客户姓名不能超过 80 个字符"),
  company: z.string().trim().min(1, "请填写公司名称").max(120, "公司名称不能超过 120 个字符"),
  email: z.string().trim().email("邮箱格式不正确").max(160).nullable().optional(),
  phone: z.string().trim().max(50, "电话不能超过 50 个字符").nullable().optional(),
  channel: z.enum(CHANNELS),
  status: z.enum(LEAD_STATUSES),
  priority: z.enum(PRIORITIES),
  country: z.string().trim().max(80, "国家/地区不能超过 80 个字符").nullable().optional(),
  note: optionalText,
});

export const leadPatchSchema = leadInputSchema.partial();

export const dealInputSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1, "请填写商机名称").max(160),
  amountCents: z.number().int().min(0, "金额不能为负数").max(9_999_999_999_99),
  stage: z.enum(DEAL_STAGES),
  expectedCloseAt: isoDate.nullable().optional(),
});

export const dealPatchSchema = dealInputSchema.omit({ leadId: true }).partial();

export const activityInputSchema = z.object({
  leadId: z.string().trim().min(1),
  type: z.enum(ACTIVITY_TYPES),
  content: z.string().trim().min(1, "请填写互动内容").max(2000),
  occurredAt: isoDate,
});

export const taskInputSchema = z.object({
  leadId: z.string().trim().min(1),
  title: z.string().trim().min(1, "请填写任务名称").max(200),
  dueAt: isoDate,
});

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueAt: isoDate.optional(),
  completed: z.boolean().optional(),
});

export const leadListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  channel: z.enum(CHANNELS).optional(),
});

export const taskListQuerySchema = z.object({
  filter: z.enum(["open", "done", "overdue", "all"]).default("all"),
});

export type LeadInput = z.infer<typeof leadInputSchema>;
export type LeadPatch = z.infer<typeof leadPatchSchema>;
export type DealInput = z.infer<typeof dealInputSchema>;
export type DealPatch = z.infer<typeof dealPatchSchema>;
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskPatch = z.infer<typeof taskPatchSchema>;
