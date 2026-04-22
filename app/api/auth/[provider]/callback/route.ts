import { NextResponse } from "next/server";
import {
  completeAuthorization,
  getAppOrigin,
  type ProviderId,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/auth/[provider]/callback">,
) {
  const { provider } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const origin = getAppOrigin(requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/", origin));
  }

  try {
    const connected = await completeAuthorization({
      provider: provider as ProviderId,
      code,
      state,
      origin,
    });

    if (!connected) {
      return NextResponse.redirect(new URL("/?error=connect", origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/?error=connect", origin));
  }

  return NextResponse.redirect(new URL("/", origin));
}
