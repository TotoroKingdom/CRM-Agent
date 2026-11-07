import type { components } from "@/generated/api";
import type {
  Activity,
  ActivityCreate,
  Channel,
  DashboardData,
  Deal,
  DealCreate,
  DealUpdate,
  FollowupTask,
  Lead,
  LeadCreate,
  LeadDetails,
  LeadStatus,
  LeadUpdate,
  TaskCreate,
  TaskFilter,
  TaskUpdate,
} from "@/lib/types";

type ErrorEnvelope = components["schemas"]["ErrorResponse"];

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string[]>;

  constructor(message: string, status: number, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError("接口返回了无法解析的响应", response.status);
    }
  }

  if (!response.ok) {
    const error = (payload ?? {}) as ErrorEnvelope;
    throw new ApiError(
      error.error ?? "服务器暂时无法完成操作",
      response.status,
      error.fields ?? undefined,
    );
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new ApiError("接口响应格式不正确", response.status);
  }
  return (payload as { data: T }).data;
}

function jsonBody(value: unknown): Pick<RequestInit, "body"> {
  return { body: JSON.stringify(value) };
}

export const crmApi = {
  getDashboard(): Promise<DashboardData> {
    return request<DashboardData>("/api/dashboard");
  },

  listLeads(
    filters: {
      search?: string;
      status?: LeadStatus | "";
      channel?: Channel | "";
    } = {},
  ): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.channel) params.set("channel", filters.channel);
    const query = params.toString();
    return request<Lead[]>(`/api/leads${query ? `?${query}` : ""}`);
  },

  createLead(input: LeadCreate): Promise<Lead> {
    return request<Lead>("/api/leads", { method: "POST", ...jsonBody(input) });
  },

  getLead(id: string): Promise<LeadDetails> {
    return request<LeadDetails>(`/api/leads/${encodeURIComponent(id)}`);
  },

  updateLead(id: string, patch: LeadUpdate): Promise<Lead> {
    return request<Lead>(`/api/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      ...jsonBody(patch),
    });
  },

  deleteLead(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/api/leads/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  listActivities(leadId: string): Promise<Activity[]> {
    return request<Activity[]>(`/api/leads/${encodeURIComponent(leadId)}/activities`);
  },

  createActivity(leadId: string, input: ActivityCreate): Promise<Activity> {
    return request<Activity>(`/api/leads/${encodeURIComponent(leadId)}/activities`, {
      method: "POST",
      ...jsonBody(input),
    });
  },

  listDeals(leadId?: string): Promise<Deal[]> {
    const query = leadId ? `?${new URLSearchParams({ leadId }).toString()}` : "";
    return request<Deal[]>(`/api/deals${query}`);
  },

  createDeal(input: DealCreate): Promise<Deal> {
    return request<Deal>("/api/deals", { method: "POST", ...jsonBody(input) });
  },

  updateDeal(id: string, patch: DealUpdate): Promise<Deal> {
    return request<Deal>(`/api/deals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      ...jsonBody(patch),
    });
  },

  listTasks(filter: TaskFilter): Promise<FollowupTask[]> {
    return request<FollowupTask[]>(`/api/tasks?${new URLSearchParams({ filter }).toString()}`);
  },

  createTask(input: TaskCreate): Promise<FollowupTask> {
    return request<FollowupTask>("/api/tasks", { method: "POST", ...jsonBody(input) });
  },

  updateTask(id: string, patch: TaskUpdate): Promise<FollowupTask> {
    return request<FollowupTask>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      ...jsonBody(patch),
    });
  },
};
