import { NextResponse } from "next/server";
import {
  completeAuthorization,
  getAppOrigin,
  isProviderId,
} from "@/lib/integrations";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getOAuthErrorMessage(
  provider: string,
  error: string,
  errorDescription: string | null,
) {
  if (error === "access_denied") {
    const providerLabel =
      provider === "youtube"
        ? "YouTube"
        : provider === "spotify"
          ? "Spotify"
          : provider === "twitch"
            ? "Twitch"
            : "The provider";

    return errorDescription
      ? `${providerLabel} denied access. ${errorDescription}`
      : `${providerLabel} denied access.`;
  }

  return errorDescription
    ? `OAuth failed for ${provider}: ${errorDescription}`
    : `OAuth failed for ${provider}: ${error}`;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/auth/[provider]/callback">,
) {
  const { provider } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const origin = getAppOrigin(requestUrl.origin);

  if (!isProviderId(provider)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent(
          getOAuthErrorMessage(provider, error, errorDescription),
        )}&provider=${provider}`,
        origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/?auth_error=login_required", origin));
  }

  try {
    const connected = await completeAuthorization({
      provider,
      code,
      state,
      userId: user.id,
      origin,
    });

    if (!connected) {
      return NextResponse.redirect(
        new URL(`/?error=connect&provider=${provider}`, origin),
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL(`/?error=connect&provider=${provider}`, origin),
    );
  }

  return NextResponse.redirect(
    new URL(`/?notice=provider_connected&provider=${provider}`, origin),
  );
}
