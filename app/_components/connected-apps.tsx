import type { ReactNode } from "react";
import type {
  AvailableService,
  ProviderId,
  SpotifyTopArtistsResult,
  TwitchTopStreamsResult,
  YoutubeHighlightsResult,
} from "@/lib/integrations";

type ConnectedAppsProps = {
  currentUser: {
    email: string;
  } | null;
  services: AvailableService[];
  initialStatuses: Partial<Record<ProviderId, boolean>>;
  pageError: string | null;
  authError: string | null;
  notice: string | null;
  noticeProvider: string | null;
  resetToken: string | null;
  spotifyTopArtists: SpotifyTopArtistsResult;
  youtubeHighlights: YoutubeHighlightsResult;
  twitchTopStreams: TwitchTopStreamsResult;
};

const providerNotes: Record<ProviderId, string> = {
  spotify: "Top artists",
  youtube: "YouTube account",
  twitch: "Twitch account",
};

const authErrorMessages: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  password_too_short: "Passwords must be at least 8 characters.",
  email_exists: "That email already has an account.",
  invalid_login: "Email or password is incorrect.",
  login_required: "Sign in before connecting accounts.",
  invalid_reset_token: "That reset link is invalid or expired.",
  missing_reset_token: "That reset link is incomplete.",
};

const noticeMessages: Record<string, string> = {
  signed_up: "Account created.",
  logged_in: "Logged in.",
  logged_out: "Logged out.",
  reset_requested: "Reset link created.",
  password_reset: "Password updated.",
};

const fieldClassName = "field-input mt-2";
const primaryButtonClassName =
  "button-primary px-4 py-3 disabled:cursor-wait disabled:opacity-70";
const secondaryButtonClassName = "button-secondary px-4 py-3";
const darkGhostButtonClassName =
  "button-ghost border-white/15 bg-white/[0.06] px-4 py-3 text-slate-50";

function formatCount(value: number | null, noun: string) {
  if (value === null) {
    return noun;
  }

  return `${new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)} ${noun}`;
}

function messageToneClass(tone: "success" | "warning" | "info") {
  if (tone === "success") {
    return "border-emerald-200/70 bg-emerald-50/80 text-emerald-950";
  }

  if (tone === "warning") {
    return "border-amber-200/70 bg-amber-50/80 text-amber-950";
  }

  return "border-slate-200/70 bg-slate-50/80 text-slate-800";
}

function MessageBanner({
  tone,
  children,
}: {
  tone: "success" | "warning" | "info";
  children: ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className={`rounded-[1.15rem] border px-4 py-3 text-sm leading-6 ${messageToneClass(
        tone,
      )}`}
    >
      {children}
    </div>
  );
}

function AuthForm({
  action,
  buttonLabel,
  idPrefix,
}: {
  action: string;
  buttonLabel: string;
  idPrefix: string;
}) {
  return (
    <form action={action} method="post" className="space-y-3">
      <div>
        <label
          className="section-label text-[0.67rem] text-slate-500"
          htmlFor={`${idPrefix}-email`}
        >
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          className={fieldClassName}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label
          className="section-label text-[0.67rem] text-slate-500"
          htmlFor={`${idPrefix}-password`}
        >
          Password
        </label>
        <input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={idPrefix === "login" ? "current-password" : "new-password"}
          className={fieldClassName}
          placeholder="At least 8 characters"
        />
      </div>
      <button type="submit" className={`w-full ${primaryButtonClassName}`}>
        {buttonLabel}
      </button>
    </form>
  );
}

export function ConnectedApps({
  currentUser,
  services,
  initialStatuses,
  pageError,
  authError,
  notice,
  noticeProvider,
  resetToken,
  spotifyTopArtists,
  youtubeHighlights,
  twitchTopStreams,
}: ConnectedAppsProps) {
  const availableArtists = spotifyTopArtists.artists.slice(0, 5);
  const availableVideos = youtubeHighlights.videos.slice(0, 6);
  const availableChannels = youtubeHighlights.channels.slice(0, 6);
  const availableStreams = twitchTopStreams.streams.slice(0, 6);
  const pageMessage =
    pageError === "connect" ? "The last connection attempt failed." : null;
  const authMessage = authError ? authErrorMessages[authError] ?? authError : null;
  const providerName =
    noticeProvider && services.find((service) => service.id === noticeProvider)?.name;
  const noticeMessage =
    notice === "provider_connected"
      ? providerName
        ? `${providerName} connected.`
        : "Connection saved."
      : notice === "provider_disconnected"
      ? providerName
        ? `${providerName} disconnected.`
        : "Connection removed."
      : notice
        ? noticeMessages[notice] ?? null
        : null;
  const developmentResetUrl =
    notice === "reset_requested" && resetToken
      ? `/reset-password?token=${encodeURIComponent(resetToken)}`
      : null;
  const activeMessage = authMessage ?? pageMessage;
  const connectedCount = services.filter((service) => initialStatuses[service.id]).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <section className="surface surface-light fade-in rounded-[2rem] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="display-title text-4xl text-slate-950 sm:text-5xl">
            PopHub
          </h1>
          <div className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-700">
            {currentUser ? currentUser.email : "Signed out"}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {activeMessage ? (
            <MessageBanner tone="warning">{activeMessage}</MessageBanner>
          ) : null}

          {noticeMessage ? (
            <MessageBanner tone="success">{noticeMessage}</MessageBanner>
          ) : null}

          {developmentResetUrl ? (
            <MessageBanner tone="info">
              Development reset link:{" "}
              <a
                href={developmentResetUrl}
                className="font-semibold underline underline-offset-2"
              >
                open reset screen
              </a>
            </MessageBanner>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section
          id="account-access"
          className="surface surface-ivory rounded-[2rem] p-5 sm:p-6"
        >
          <p className="section-label text-slate-500">Login</p>

          {currentUser ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.4rem] border border-slate-200 bg-white/75 p-4">
                <p className="text-sm text-slate-500">Current account</p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {currentUser.email}
                </p>
              </div>

              <form action="/api/session/logout" method="post">
                <button type="submit" className={secondaryButtonClassName}>
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                <p className="section-label text-slate-500">Sign up</p>
                <div className="mt-4">
                  <AuthForm
                    action="/api/session/signup"
                    buttonLabel="Create account"
                    idPrefix="signup"
                  />
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                <p className="section-label text-slate-500">Log in</p>
                <div className="mt-4">
                  <AuthForm
                    action="/api/session/login"
                    buttonLabel="Log in"
                    idPrefix="login"
                  />
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4">
                <p className="section-label text-slate-500">Password reset</p>
                <div className="mt-4">
                  <form
                    action="/api/session/request-reset"
                    method="post"
                    className="space-y-3"
                  >
                    <div>
                      <label
                        className="section-label text-[0.67rem] text-slate-500"
                        htmlFor="reset-request-email"
                      >
                        Email
                      </label>
                      <input
                        id="reset-request-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className={fieldClassName}
                        placeholder="you@example.com"
                      />
                    </div>
                    <button type="submit" className={`w-full ${secondaryButtonClassName}`}>
                      Send reset link
                    </button>
                  </form>
                </div>
              </section>
            </div>
          )}
        </section>

        <section className="surface surface-light rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label text-slate-500">Connections</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Connect accounts
              </h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-700">
              {connectedCount}/{services.length} connected
            </div>
          </div>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const isConnected = Boolean(initialStatuses[service.id]);
              const isAuthenticated = Boolean(currentUser);
              const canConnect = service.configured && isAuthenticated;
              const statusLabel = isConnected
                ? "Connected"
                : !service.configured
                  ? "Missing keys"
                  : isAuthenticated
                    ? "Ready"
                    : "Sign in";

              return (
                <li
                  key={service.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {service.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {providerNotes[service.id]}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${
                        isConnected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : canConnect
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isConnected ? (
                      <>
                        <form
                          action={`/api/connections/${service.id}`}
                          method="post"
                          className="contents"
                        >
                          <button
                            type="submit"
                            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:-translate-y-px hover:bg-rose-100"
                          >
                            Disconnect
                          </button>
                        </form>
                        <a
                          href={`/api/auth/${service.id}/start`}
                          className={secondaryButtonClassName}
                        >
                          Reconnect
                        </a>
                      </>
                    ) : !isAuthenticated ? (
                      <a href="#account-access" className={secondaryButtonClassName}>
                        Sign in to connect
                      </a>
                    ) : !service.configured ? (
                      <span
                        className={`${secondaryButtonClassName} cursor-not-allowed opacity-70`}
                        aria-disabled="true"
                      >
                        Missing OAuth keys
                      </span>
                    ) : (
                      <a
                        href={`/api/auth/${service.id}/start`}
                        className={canConnect ? primaryButtonClassName : secondaryButtonClassName}
                      >
                        Connect
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="surface surface-dark rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label text-slate-300">Top artists</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Spotify
            </h2>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-200">
            {initialStatuses.spotify ? "Connected" : "Not connected"}
          </div>
        </div>

        {initialStatuses.spotify ? (
          spotifyTopArtists.error ? (
            <div className="mt-6 rounded-[1.4rem] border border-rose-300/25 bg-rose-300/10 px-5 py-5 text-sm leading-6 text-rose-50">
              <p>{spotifyTopArtists.error}</p>
              <div className="mt-4">
                <a href="/api/auth/spotify/start" className={darkGhostButtonClassName}>
                  Reconnect Spotify
                </a>
              </div>
            </div>
          ) : availableArtists.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {availableArtists.map((artist) => (
                <a
                  key={artist.id}
                  href={artist.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/20"
                >
                  {artist.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-slate-800" />
                  )}
                  <div className="px-4 py-4">
                    <p className="text-base font-semibold text-white">{artist.name}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-white/12 bg-white/[0.04] px-5 py-6 text-sm text-slate-200">
              No top artists found yet.
            </div>
          )
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/14 bg-white/[0.04] px-5 py-6 text-sm text-slate-200">
            {currentUser
              ? "Connect Spotify to load top artists."
              : "Log in, then connect Spotify to load top artists."}
          </div>
        )}
      </section>

      <section className="surface surface-light rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label text-slate-500">Popular right now</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              YouTube
            </h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-700">
            {initialStatuses.youtube ? "Connected" : "Not connected"}
          </div>
        </div>

        {initialStatuses.youtube ? (
          youtubeHighlights.error ? (
            <div className="mt-6 rounded-[1.4rem] border border-amber-200/70 bg-amber-50/80 px-5 py-5 text-sm leading-6 text-amber-950">
              <p>{youtubeHighlights.error}</p>
              <div className="mt-4">
                <a href="/api/auth/youtube/start" className={secondaryButtonClassName}>
                  Reconnect YouTube
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div>
                <p className="section-label text-slate-500">Top uploads</p>
                {availableVideos.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {availableVideos.map((video) => (
                      <a
                        key={video.id}
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300"
                      >
                        {video.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.imageUrl}
                            alt={video.title}
                            className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="aspect-video w-full bg-slate-100" />
                        )}
                        <div className="space-y-2 px-4 py-4">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                            {video.title}
                          </p>
                          <p className="text-sm text-slate-500">{video.channelTitle}</p>
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {formatCount(video.viewCount, "views")}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-white/75 px-5 py-6 text-sm text-slate-600">
                    No YouTube uploads were returned yet.
                  </div>
                )}
              </div>

              <div>
                <p className="section-label text-slate-500">Top channels</p>
                {availableChannels.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {availableChannels.map((channel) => (
                      <a
                        key={channel.id}
                        href={channel.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-4 rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 transition hover:-translate-y-px hover:border-slate-300"
                      >
                        {channel.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={channel.imageUrl}
                            alt={channel.title}
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-slate-100" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">
                            {channel.title}
                          </p>
                          <p className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {formatCount(channel.subscriberCount, "subscribers")}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-white/75 px-5 py-6 text-sm text-slate-600">
                    No YouTube channels were returned yet.
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
            {currentUser
              ? "Connect YouTube to load popular uploads and channels."
              : "Log in, then connect YouTube to load popular uploads and channels."}
          </div>
        )}
      </section>

      <section className="surface surface-dark rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-label text-slate-300">Live right now</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Twitch
            </h2>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-200">
            {initialStatuses.twitch ? "Connected" : "Not connected"}
          </div>
        </div>

        {initialStatuses.twitch ? (
          twitchTopStreams.error ? (
            <div className="mt-6 rounded-[1.4rem] border border-rose-300/25 bg-rose-300/10 px-5 py-5 text-sm leading-6 text-rose-50">
              <p>{twitchTopStreams.error}</p>
              <div className="mt-4">
                <a href="/api/auth/twitch/start" className={darkGhostButtonClassName}>
                  Reconnect Twitch
                </a>
              </div>
            </div>
          ) : availableStreams.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {availableStreams.map((stream) => (
                <a
                  key={stream.id}
                  href={stream.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/20"
                >
                  {stream.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={stream.imageUrl}
                      alt={stream.broadcasterName}
                      className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="aspect-video w-full bg-slate-800" />
                  )}
                  <div className="space-y-2 px-4 py-4">
                    <p className="text-base font-semibold text-white">
                      {stream.broadcasterName}
                    </p>
                    <p className="line-clamp-2 text-sm text-slate-200">{stream.title}</p>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {formatCount(stream.viewerCount, "viewers")}
                      {stream.gameName ? ` • ${stream.gameName}` : ""}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/14 bg-white/[0.04] px-5 py-6 text-sm text-slate-200">
              No Twitch streams found right now.
            </div>
          )
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/14 bg-white/[0.04] px-5 py-6 text-sm text-slate-200">
            {currentUser
              ? "Connect Twitch to load top live streamers."
              : "Log in, then connect Twitch to load top live streamers."}
          </div>
        )}
      </section>
    </div>
  );
}
