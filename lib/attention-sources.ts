import "server-only";

import type { ProviderId } from "@/lib/integrations";

export type AttentionSourceStatus =
  | "connected"
  | "ready"
  | "needs_keys"
  | "manual"
  | "unavailable";

export type AttentionSource = {
  id: string;
  name: string;
  category: string;
  status: AttentionSourceStatus;
  statusLabel: string;
  summary: string;
  setup: string;
  envVars: string[];
};

type ProviderStatuses = Partial<Record<ProviderId, boolean>>;

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function oauthSource(params: {
  id: string;
  name: string;
  category: string;
  provider: ProviderId;
  statuses: ProviderStatuses;
  envVars: string[];
  connectedSummary: string;
  setup: string;
}) {
  const hasKeys = params.envVars.every(hasEnv);
  const connected = Boolean(params.statuses[params.provider]);

  return {
    id: params.id,
    name: params.name,
    category: params.category,
    status: connected ? "connected" : hasKeys ? "ready" : "needs_keys",
    statusLabel: connected ? "Connected" : hasKeys ? "Connect account" : "Missing keys",
    summary: params.connectedSummary,
    setup: params.setup,
    envVars: params.envVars,
  } satisfies AttentionSource;
}

function apiKeySource(params: {
  id: string;
  name: string;
  category: string;
  envVars: string[];
  summary: string;
  setup: string;
}) {
  const configured = params.envVars.some(hasEnv);

  return {
    id: params.id,
    name: params.name,
    category: params.category,
    status: configured ? "ready" : "needs_keys",
    statusLabel: configured ? "API ready" : "Missing API key",
    summary: params.summary,
    setup: params.setup,
    envVars: params.envVars,
  } satisfies AttentionSource;
}

export function getAttentionSources(statuses: ProviderStatuses) {
  return [
    {
      id: "netflix",
      name: "Netflix",
      category: "Streaming",
      status: "manual",
      statusLabel: "Manual",
      summary:
        "No normal public user API/OAuth is available, so treat Netflix as manual watchlist, reminder, or third-party catalog coverage.",
      setup:
        "Do not ask users for Netflix credentials. Use manual saves or a catalog provider for metadata.",
      envVars: [],
    },
    {
      id: "hulu",
      name: "Hulu",
      category: "Streaming",
      status: "manual",
      statusLabel: "Manual",
      summary:
        "No normal public user API/OAuth is available, so model Hulu as manual tracking or catalog availability metadata.",
      setup:
        "Do not ask users for Hulu credentials. Use manual saves or a catalog provider for metadata.",
      envVars: [],
    },
    oauthSource({
      id: "spotify-discovery",
      name: "Spotify",
      category: "Music and podcasts",
      provider: "spotify",
      statuses,
      envVars: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
      connectedSummary:
        "Top artists now; new albums and saved podcasts can build on the same Spotify connection.",
      setup:
        "Register the callback and approve the Spotify scopes shown in README.",
    }),
    oauthSource({
      id: "youtube-creators",
      name: "YouTube",
      category: "Creator uploads",
      provider: "youtube",
      statuses,
      envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      connectedSummary:
        "Subscribed channels and recent uploads from channels the user follows.",
      setup:
        "Enable YouTube Data API v3 and register the Google OAuth callback.",
    }),
    oauthSource({
      id: "twitch-live",
      name: "Twitch",
      category: "Creator uploads",
      provider: "twitch",
      statuses,
      envVars: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
      connectedSummary:
        "Live streams from followed Twitch channels with user:read:follows.",
      setup:
        "Register the Twitch OAuth callback and request user:read:follows.",
    }),
    apiKeySource({
      id: "concerts",
      name: "Concerts",
      category: "Live events",
      envVars: ["TICKETMASTER_API_KEY"],
      summary:
        "Use Ticketmaster Discovery for nearby music events, venues, and attraction pages.",
      setup: "Create a Ticketmaster developer app and set TICKETMASTER_API_KEY.",
    }),
    apiKeySource({
      id: "sports",
      name: "Sports",
      category: "Live events",
      envVars: ["TICKETMASTER_API_KEY", "THESPORTSDB_API_KEY"],
      summary:
        "Use Ticketmaster for ticketed sports events and TheSportsDB for schedules/results metadata.",
      setup:
        "Set TICKETMASTER_API_KEY for local ticketed events; set THESPORTSDB_API_KEY for team/league schedules.",
    }),
    oauthSource({
      id: "podcasts",
      name: "Podcasts",
      category: "Audio",
      provider: "spotify",
      statuses,
      envVars: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
      connectedSummary:
        "Spotify can provide saved shows and episode metadata through the existing music connection.",
      setup:
        "Use the Spotify app credentials and include user-library-read for saved shows.",
    }),
    apiKeySource({
      id: "movie-releases",
      name: "Movie releases",
      category: "Film",
      envVars: ["TMDB_API_KEY"],
      summary:
        "Use TMDb upcoming movies, release dates, posters, watch-provider metadata, and related video metadata.",
      setup: "Create a TMDb developer API key and set TMDB_API_KEY.",
    }),
    apiKeySource({
      id: "trailers",
      name: "Trailers",
      category: "Film",
      envVars: ["TMDB_API_KEY"],
      summary:
        "Use TMDb movie video metadata for official trailers, then link out to hosted video pages.",
      setup: "Create a TMDb developer API key and set TMDB_API_KEY.",
    }),
    oauthSource({
      id: "new-albums",
      name: "New albums",
      category: "Music",
      provider: "spotify",
      statuses,
      envVars: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
      connectedSummary:
        "Use the user’s followed/top artists plus Spotify album metadata to surface relevant new releases.",
      setup:
        "Use the Spotify app credentials and include user-follow-read for followed artists.",
    }),
    oauthSource({
      id: "creator-uploads",
      name: "Creator uploads",
      category: "Creators",
      provider: "youtube",
      statuses,
      envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      connectedSummary:
        "YouTube subscriptions cover creator uploads; Twitch covers followed live creators.",
      setup:
        "Connect YouTube and Twitch for the full creator attention feed.",
    }),
    apiKeySource({
      id: "local-events",
      name: "Local events",
      category: "Live events",
      envVars: ["TICKETMASTER_API_KEY"],
      summary:
        "Use Ticketmaster Discovery location filters for local events near the user.",
      setup: "Create a Ticketmaster developer app and set TICKETMASTER_API_KEY.",
    }),
  ] satisfies AttentionSource[];
}
