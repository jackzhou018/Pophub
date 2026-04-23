import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  disconnectProviderForUser,
  getAppOrigin,
  getVerifiedStatusesForUser,
  isProviderId,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/connections/[provider]">,
) {
  const { provider } = await context.params;
  const origin = getAppOrigin(new URL(request.url).origin);
  const user = await getCurrentUser();

  if (!isProviderId(provider)) {
    return NextResponse.redirect(new URL("/", origin), { status: 303 });
  }

  if (!user) {
    return NextResponse.redirect(new URL("/?auth_error=login_required", origin), {
      status: 303,
    });
  }

  await disconnectProviderForUser(user.id, provider);

  return NextResponse.redirect(
    new URL(`/?notice=provider_disconnected&provider=${provider}`, origin),
    { status: 303 },
  );
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/connections/[provider]">,
) {
  const { provider } = await context.params;
  const user = await getCurrentUser();

  if (!isProviderId(provider)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid provider.",
      },
      { status: 400 },
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sign in before changing connections.",
      },
      { status: 401 },
    );
  }

  await disconnectProviderForUser(user.id, provider);
  const data = await getVerifiedStatusesForUser(user.id, { persist: true });

  return NextResponse.json({
    ok: true,
    statuses: data.statuses,
  });
}
