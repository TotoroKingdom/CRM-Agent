import { ZodError } from "zod";

export function jsonError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: "输入校验失败", fields: error.flatten().fieldErrors }, { status: 400 });
  }
  if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
    return Response.json({ error: "线索不存在" }, { status: 404 });
  }
  if (error instanceof Error && error.message === "DEAL_NOT_FOUND") {
    return Response.json({ error: "商机不存在" }, { status: 404 });
  }
  if (error instanceof Error && error.message === "TASK_NOT_FOUND") {
    return Response.json({ error: "任务不存在" }, { status: 404 });
  }
  if (error instanceof Error && error.message === "INVALID_JSON") {
    return Response.json({ error: "请求内容不是有效 JSON" }, { status: 400 });
  }
  console.error(error);
  return Response.json({ error: "服务器暂时无法完成操作" }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}
