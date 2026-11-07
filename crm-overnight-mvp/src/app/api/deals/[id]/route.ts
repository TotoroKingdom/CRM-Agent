import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { dealPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patch = dealPatchSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().updateDeal(id, patch) });
  } catch (error) {
    return jsonError(error);
  }
}
