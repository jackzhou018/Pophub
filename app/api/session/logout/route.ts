import { NextResponse } from "next/server";
import { clearCurrentSession } from "@/lib/auth";
import { getAppOrigin } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = getAppOrigin(new URL(request.url).origin);

  await clearCurrentSession();

  return NextResponse.redirect(new URL("/?notice=logged_out", origin), {
    status: 303,
  });
}
