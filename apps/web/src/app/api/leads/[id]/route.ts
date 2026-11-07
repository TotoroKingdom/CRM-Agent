import { NextRequest } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { leadPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const lead = getRepository().getLeadById(id);
  if (!lead) return Response.json({ error: "线索不存在" }, { status: 404 });
  return Response.json({ data: lead });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const patch = leadPatchSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().updateLead(id, patch) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = getRepository().deleteLead(id);
  if (!deleted) return Response.json({ error: "线索不存在" }, { status: 404 });
  return Response.json({ data: { id } });
}
