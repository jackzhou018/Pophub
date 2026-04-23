import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableServices, getVerifiedStatusesForUser } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      services: getAvailableServices(),
      statuses: {
        spotify: false,
        youtube: false,
        twitch: false,
      },
    });
  }

  const data = await getVerifiedStatusesForUser(user.id, { persist: true });
  return NextResponse.json(data);
}
