import { getRepository } from "@/lib/db/server";

export const runtime = "nodejs";

export async function GET() {
  const repository = getRepository();
  return Response.json({ data: repository.getDashboardData() });
}
