import { NextResponse } from "next/server";
import { createPasswordResetRequest } from "@/lib/auth";
import { getAppOrigin } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = `${formData.get("email") ?? ""}`;
  const origin = getAppOrigin(new URL(request.url).origin);
  const result = await createPasswordResetRequest(email);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${result.error}`, origin),
      { status: 303 },
    );
  }

  const redirectUrl = new URL("/?notice=reset_requested", origin);

  if (result.resetToken && process.env.NODE_ENV !== "production") {
    redirectUrl.searchParams.set("reset_token", result.resetToken);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
