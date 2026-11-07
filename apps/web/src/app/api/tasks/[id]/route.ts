import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { taskPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patch = taskPatchSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().updateTask(id, patch) });
  } catch (error) {
    return jsonError(error);
  }
}
