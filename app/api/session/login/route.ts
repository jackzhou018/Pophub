import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = `${formData.get("email") ?? ""}`;
  const password = `${formData.get("password") ?? ""}`;
  const origin = getAppOrigin(new URL(request.url).origin);
  const result = await loginUser(email, password);

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${result.error}`, origin),
      { status: 303 },
    );
  }

  return NextResponse.redirect(new URL("/?notice=logged_in", origin), {
    status: 303,
  });
}
