import { NextResponse } from "next/server";
import {
  createAuthorizationUrl,
  type ProviderId,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/auth/[provider]/start">,
) {
  const { provider } = await context.params;
  const origin = new URL(request.url).origin;
  const authUrl = await createAuthorizationUrl(provider as ProviderId, origin);

  if (!authUrl) {
    return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.redirect(authUrl);
}
