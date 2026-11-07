import { NextRequest } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { taskInputSchema } from "@/lib/validation/schemas";
import { taskListQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { filter } = taskListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const now = new Date().toISOString();
    return Response.json({ data: getRepository().listTasks({
      completed: filter === "done" ? true : filter === "open" || filter === "overdue" ? false : undefined,
      overdueBefore: filter === "overdue" ? now : undefined,
    }) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = taskInputSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().createTask(input) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
