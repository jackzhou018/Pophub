import { NextResponse } from "next/server";
import {
  createAuthorizationUrl,
  isProviderId,
} from "@/lib/integrations";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/auth/[provider]/start">,
) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;
  const user = await getCurrentUser();

  if (!isProviderId(provider)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  if (!user) {
    return NextResponse.redirect(new URL("/?auth_error=login_required", origin));
  }

  const authUrl = await createAuthorizationUrl(provider, origin);

  if (!authUrl) {
    return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.redirect(authUrl);
}
