import { NextRequest } from "next/server";
import { jsonError, readJson } from "@/lib/api";
import { getRepository } from "@/lib/db/server";
import { leadInputSchema, leadListQuerySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = leadListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    return Response.json({ data: getRepository().listLeads(query) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = leadInputSchema.parse(await readJson(request));
    return Response.json({ data: getRepository().createLead(input) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
