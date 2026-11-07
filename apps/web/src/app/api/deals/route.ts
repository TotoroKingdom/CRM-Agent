import { NextRequest } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { dealInputSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("leadId") ?? undefined;
  return Response.json({ data: getRepository().listDeals({ leadId }) });
}

export async function POST(request: Request) {
  try {
    const input = dealInputSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().createDeal(input) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
