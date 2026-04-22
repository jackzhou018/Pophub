"use client";

import { useState } from "react";
import type {
  AvailableService,
  ProviderId,
  SpotifyTopArtistsResult,
} from "@/lib/integrations";

type ConnectedAppsProps = {
  services: AvailableService[];
  initialStatuses: Partial<Record<ProviderId, boolean>>;
  pageError: string | null;
  spotifyTopArtists: SpotifyTopArtistsResult;
};

const providerNotes: Record<ProviderId, string> = {
  spotify: "Music identity plus top-listening signals.",
  youtube: "Channel ownership and watch-surface metadata.",
  twitch: "Live creator identity and stream presence.",
};

const expansionPaths = [
  {
    name: "Netflix",
    lane: "Browser companion",
    note: "No public user OAuth for watch history. Capture playback and list actions client-side.",
  },
  {
    name: "Hulu",
    lane: "Inbox import",
    note: "No open account API. Start with billing emails, deep links, and manual watchlist capture.",
  },
  {
    name: "Disney+, Max, Prime",
    lane: "Partner bridge",
    note: "Treat these as locked catalogs unless a partner feed or export path exists.",
  },
  {
    name: "Trakt, Letterboxd, JustWatch",
    lane: "Best next sync",
    note: "These are the cleanest bridge services for watchlists, lists, discovery, and outbound links.",
  },
] as const;

export function ConnectedApps({
  services,
  initialStatuses,
  pageError,
  spotifyTopArtists,
}: ConnectedAppsProps) {
  const [statuses, setStatuses] =
    useState<Partial<Record<ProviderId, boolean>>>(initialStatuses);
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const connectedCount = services.filter((service) => statuses[service.id]).length;
  const configuredCount = services.filter((service) => service.configured).length;
  const availableArtists = spotifyTopArtists.artists.slice(0, 4);
  const pageMessage =
    pageError === "connect"
      ? "The last provider callback did not verify. No connection was promoted to active."
      : null;
  const activeMessage = errorMessage ?? pageMessage;
  const headlineTone =
    connectedCount > 0
      ? `${connectedCount} live lane${connectedCount === 1 ? "" : "s"} online.`
      : "No live lanes yet.";

  return (
    <div className="grid h-full min-h-0 gap-3 grid-rows-[minmax(0,1.05fr)_minmax(0,1.4fr)_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_20rem] xl:grid-rows-none">
      <aside className="panel flex min-h-0 flex-col overflow-y-auto p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">PopHub</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.02em] text-stone-50">
              Entertainment terminal
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              One fixed dashboard, no tab strip, only the signals this product
              actually owns.
            </p>
          </div>
          <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
            Live
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="metric-chip">
            <span className="metric-value">{connectedCount}</span>
            <span className="metric-label">Active</span>
          </div>
          <div className="metric-chip">
            <span className="metric-value">{configuredCount}</span>
            <span className="metric-label">Ready</span>
          </div>
          <div className="metric-chip">
            <span className="metric-value">{expansionPaths.length}</span>
            <span className="metric-label">Next</span>
          </div>
        </div>

        {activeMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            {activeMessage}
          </div>
        ) : null}

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Connections</p>
              <p className="mt-1 text-sm text-slate-300">{headlineTone}</p>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
              Verified
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {services.map((service) => {
              const isConnected = Boolean(statuses[service.id]);
              const isPending = pendingProvider === service.id;
              const canConnect = service.configured;
              const statusLabel = isConnected
                ? "Connected"
                : isPending
                  ? "Opening"
                  : canConnect
                    ? "Ready"
                    : "Missing keys";

              return (
                <li
                  key={service.id}
                  className="rounded-[1.35rem] border border-white/8 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isConnected
                              ? "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]"
                              : canConnect
                                ? "bg-amber-300"
                                : "bg-slate-500"
                          }`}
                        />
                        <p className="truncate text-sm font-semibold text-stone-50">
                          {service.name}
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {providerNotes[service.id]}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        isConnected
                          ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : canConnect
                            ? "border border-amber-300/20 bg-amber-300/10 text-amber-100"
                            : "border border-slate-500/20 bg-slate-500/10 text-slate-300"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end">
                    {isConnected ? (
                      <a
                        href={`/api/auth/${service.id}/start`}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-100 transition hover:border-emerald-300/30 hover:bg-white/[0.06]"
                      >
                        Reconnect
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (!canConnect) {
                            setErrorMessage(
                              `${service.name} cannot connect yet because the server is missing that provider's OAuth credentials in .env.local.`,
                            );
                            return;
                          }

                          setErrorMessage(null);
                          setPendingProvider(service.id);
                          setStatuses((current) => ({
                            ...current,
                            [service.id]: false,
                          }));
                          window.location.assign(`/api/auth/${service.id}/start`);
                        }}
                        className={
                          canConnect
                            ? "rounded-full bg-[linear-gradient(135deg,#d8f7ef_0%,#8ce8cf_100%)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                            : "rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/10"
                        }
                      >
                        {isPending ? "Opening..." : canConnect ? "Connect" : "Locked"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          A lane only turns active after the server exchanges the OAuth code,
          stores the session, and verifies it against the provider API.
        </p>
      </aside>

      <section className="grid min-h-0 gap-3 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel terminal-grid relative min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="eyebrow">Unified view</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl xl:text-[3.2rem]">
                  One screen for the streams, creators, and listening signals
                  you actually track.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  The layout stays inside one viewport and treats every provider
                  as a lane: either verified, waiting on credentials, or queued
                  for a realistic integration path.
                </p>
              </div>

              <div className="hidden w-full max-w-xs grid-cols-1 gap-3 xl:grid">
                <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.24] p-4">
                  <p className="eyebrow">Now</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-50">
                    {headlineTone}
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.24] p-4">
                  <p className="eyebrow">Scope</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Spotify, YouTube, and Twitch are first-party verified.
                    Locked video services stay in the roadmap until there is a
                    real ingest path.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="eyebrow">Screen logic</p>
                <p className="mt-2 text-lg font-semibold text-stone-50">
                  No tabs. No long feed.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Core state, one hero surface, one signal sample, one roadmap.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="eyebrow">Auth posture</p>
                <p className="mt-2 text-lg font-semibold text-stone-50">
                  Server verified
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Redirects only. No optimistic green state unless the provider
                  API confirms the account.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <p className="eyebrow">Next expansion</p>
                <p className="mt-2 text-lg font-semibold text-stone-50">
                  Bridge locked catalogs
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Use companion capture, inbox imports, or third-party list
                  bridges before chasing unsupported direct OAuth.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Signal sample</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
                Spotify top artists
              </h3>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300">
              {statuses.spotify ? "Connected lane" : "Awaiting auth"}
            </div>
          </div>

          {statuses.spotify ? (
            spotifyTopArtists.error ? (
              <div className="mt-5 rounded-[1.5rem] border border-rose-300/25 bg-rose-300/10 px-4 py-4 text-sm leading-6 text-rose-100">
                <p>{spotifyTopArtists.error}</p>
                <div className="mt-4">
                  <a
                    href="/api/auth/spotify/start"
                    className="inline-flex rounded-full bg-[linear-gradient(135deg,#d8f7ef_0%,#8ce8cf_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 transition hover:brightness-105"
                  >
                    Reconnect Spotify
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid min-h-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {availableArtists.map((artist) => (
                  <a
                    key={artist.id}
                    href={artist.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/[0.24] transition hover:border-emerald-300/30"
                  >
                    {artist.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-slate-900" />
                    )}
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-stone-50">
                        {artist.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Listening signal
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/[0.12] bg-black/[0.18] px-4 py-5 text-sm leading-6 text-slate-300">
              Connect Spotify to fill this surface with a real listening sample.
              Until then, the dashboard stays sparse instead of filling space
              with placeholder widgets.
            </div>
          )}
        </section>
      </section>

      <aside className="grid min-h-0 gap-3 xl:grid-rows-[minmax(0,1fr)_auto]">
        <section className="panel min-h-0 overflow-y-auto p-5">
          <div>
            <p className="eyebrow">Expansion paths</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
              Netflix, Hulu, and the rest
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              These should not show fake connect buttons until there is a real
              ingest strategy behind them.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {expansionPaths.map((path) => (
              <div
                key={path.name}
                className="rounded-[1.35rem] border border-white/8 bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-50">
                    {path.name}
                  </p>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    {path.lane}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {path.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel overflow-y-auto p-5">
          <p className="eyebrow">Build order</p>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
            <p>1. Keep first-party OAuth providers as the trusted core.</p>
            <p>2. Add list bridges like Trakt or Letterboxd before locked streaming apps.</p>
            <p>3. For Netflix or Hulu, ship companion capture or inbox parsing, not fake direct auth.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
