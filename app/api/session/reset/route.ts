import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth";
import { getAppOrigin } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = `${formData.get("token") ?? ""}`;
  const password = `${formData.get("password") ?? ""}`;
  const origin = getAppOrigin(new URL(request.url).origin);
  const result = await resetPasswordWithToken(token, password);

  if (!result.ok) {
    const redirectUrl = new URL("/reset-password", origin);

    if (token) {
      redirectUrl.searchParams.set("token", token);
    }

    redirectUrl.searchParams.set("auth_error", result.error);

    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.redirect(new URL("/?notice=password_reset", origin), {
    status: 303,
  });
}
