import { NextResponse } from "next/server";
import { getVerifiedStatuses } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getVerifiedStatuses({ persist: true });
  return NextResponse.json(data);
}
