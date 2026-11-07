import { NextRequest } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { activityInputSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const lead = getRepository().getLeadById(id);
  if (!lead) return Response.json({ error: "线索不存在" }, { status: 404 });
  return Response.json({ data: lead.activities });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = activityInputSchema.parse({ ...(await readJson(request) as Record<string, unknown>), leadId: id });
    return Response.json({ data: getRepository().createActivity(input) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
