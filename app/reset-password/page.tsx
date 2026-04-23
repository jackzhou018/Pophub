import Link from "next/link";
import { getPasswordResetTokenStatus } from "@/lib/auth";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    auth_error?: string | string[];
  }>;
};

const authErrorMessages: Record<string, string> = {
  invalid_reset_token: "That reset link is invalid or expired. Request a new one.",
  missing_reset_token: "Reset links need a token. Request a new one from the home page.",
  password_too_short: "Passwords need at least 8 characters.",
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] ?? null : query.token ?? null;
  const authError = Array.isArray(query.auth_error)
    ? query.auth_error[0] ?? null
    : query.auth_error ?? null;
  const tokenStatus = getPasswordResetTokenStatus(token);
  const message = authError
    ? authErrorMessages[authError] ?? authError
    : !tokenStatus.valid
      ? authErrorMessages[tokenStatus.error]
      : null;

  return (
    <main className="page-shell min-h-dvh px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="surface surface-dark overflow-hidden rounded-[2.25rem] p-5 sm:p-7 lg:p-8">
          <div className="hero-grid absolute inset-0 opacity-60" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.75fr)]">
            <div className="max-w-3xl">
              <p className="section-label text-amber-100/80">Reset password</p>
              <h1 className="display-title mt-4 text-[3rem] text-white sm:text-[4rem]">
                Choose a new password for your PopHub workspace.
              </h1>
              <p className="body-muted-dark mt-5 max-w-2xl text-base leading-7">
                Reset links are single-use and expire after 30 minutes. A
                successful reset signs this browser into the account
                immediately.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="stat-block">
                  <p className="section-label text-[0.63rem] text-slate-300">Lifetime</p>
                  <p className="mt-3 text-2xl font-semibold text-white">30 min</p>
                </div>
                <div className="stat-block">
                  <p className="section-label text-[0.63rem] text-slate-300">Use count</p>
                  <p className="mt-3 text-2xl font-semibold text-white">Single</p>
                </div>
                <div className="stat-block">
                  <p className="section-label text-[0.63rem] text-slate-300">Outcome</p>
                  <p className="mt-3 text-2xl font-semibold text-white">Signed in</p>
                </div>
              </div>
            </div>

            <div className="surface surface-ivory rounded-[2rem] p-5 sm:p-6">
              <p className="section-label text-amber-700">Secure update</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Enter a replacement password
              </h2>
              <p className="body-muted mt-3 text-sm leading-6">
                Passwords need at least 8 characters. Once updated, existing
                connections remain attached to the account.
              </p>

              {message ? (
                <div className="mt-5 rounded-[1.35rem] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950">
                  {message}
                </div>
              ) : null}

              {tokenStatus.valid && token ? (
                <form action="/api/session/reset" method="post" className="mt-6 space-y-4">
                  <input type="hidden" name="token" value={token} />
                  <div>
                    <label
                      className="section-label text-[0.67rem] text-slate-500"
                      htmlFor="reset-password"
                    >
                      New password
                    </label>
                    <input
                      id="reset-password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="field-input mt-2"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <button type="submit" className="button-primary px-4 py-3">
                    Update password
                  </button>
                </form>
              ) : null}

              <div className="mt-6">
                <Link href="/" className="button-secondary px-4 py-3">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
