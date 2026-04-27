import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "@/lib/security";
import { execute, queryAll } from "@/lib/db";

export type ProviderId = "spotify" | "youtube" | "twitch";

export type AvailableService = {
  id: ProviderId;
  name: string;
  configured: boolean;
};

type ProviderIdentity = {
  accountId: string;
  displayName: string;
};

type ProviderConfig = {
  id: ProviderId;
  name: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  getAuthorizeUrl: (params: { origin: string; state: string }) => string;
  exchangeCode: (params: {
    code: string;
    origin: string;
  }) => Promise<StoredConnection>;
  refresh: (connection: StoredConnection) => Promise<StoredConnection>;
  verify: (connection: StoredConnection) => Promise<ProviderIdentity | null>;
};

export type SpotifyTopArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
  url: string;
};

export type SpotifyTopArtistsResult = {
  artists: SpotifyTopArtist[];
  error: string | null;
};

export type YoutubeTopVideo = {
  id: string;
  title: string;
  channelTitle: string;
  imageUrl: string | null;
  url: string;
  viewCount: number | null;
};

export type YoutubeTopChannel = {
  id: string;
  title: string;
  imageUrl: string | null;
  url: string;
  subscriberCount: number | null;
};

export type YoutubeHighlightsResult = {
  videos: YoutubeTopVideo[];
  channels: YoutubeTopChannel[];
  error: string | null;
};

export type TwitchTopStream = {
  id: string;
  broadcasterName: string;
  title: string;
  imageUrl: string;
  url: string;
  viewerCount: number;
  gameName: string | null;
};

export type TwitchTopStreamsResult = {
  streams: TwitchTopStream[];
  error: string | null;
};

export type StoredConnection = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  connectedAt: string;
  providerAccountId?: string;
  providerAccountLabel?: string;
};

type StoredConnections = Partial<Record<ProviderId, StoredConnection>>;

type ConnectionRow = {
  provider: ProviderId;
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
  connected_at: string;
  provider_account_id: string | null;
  provider_account_label: string | null;
};

type YoutubeThumbnailSet = {
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
};

type YoutubeChannelWithUploads = YoutubeTopChannel & {
  uploadsPlaylistId: string | null;
};

type YoutubeUploadPlaylist = {
  playlistId: string;
  channelTitle: string;
};

type OAuthStateCookie = {
  state: string;
  origin: string;
};

const STATE_COOKIE_PREFIX = "pophub_oauth_state_";
const secureCookies = process.env.NODE_ENV === "production";

const providerDefinitions = {
  spotify: {
    name: "Spotify",
    env: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"] as const,
  },
  youtube: {
    name: "YouTube",
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const,
  },
  twitch: {
    name: "Twitch",
    env: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"] as const,
  },
} satisfies Record<
  ProviderId,
  {
    name: string;
    env: readonly [string, string];
  }
>;

function hasProviderCredentials(provider: ProviderId) {
  const definition = providerDefinitions[provider];
  return Boolean(
    process.env[definition.env[0]] && process.env[definition.env[1]],
  );
}

function getCallbackUrl(origin: string, provider: ProviderId) {
  return `${origin}/api/auth/${provider}/callback`;
}

function encodeOAuthStateCookie(value: OAuthStateCookie) {
  return JSON.stringify(value);
}

function parseOAuthStateCookie(value: string | undefined): OAuthStateCookie | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<OAuthStateCookie>;

    if (parsed.state && parsed.origin) {
      return {
        state: parsed.state,
        origin: normalizeOrigin(parsed.origin),
      };
    }
  } catch {
    return {
      state: value,
      origin: getAppOrigin(),
    };
  }

  return null;
}

function normalizeOrigin(origin: string) {
  return new URL(origin).origin;
}

export function getAppOrigin(requestOrigin?: string) {
  const appUrl = process.env.APP_URL?.trim();
  const normalizedRequestOrigin = requestOrigin
    ? normalizeOrigin(requestOrigin)
    : null;

  if (appUrl) {
    return normalizeOrigin(appUrl);
  }

  if (normalizedRequestOrigin) {
    return normalizedRequestOrigin;
  }

  return "http://localhost:3000";
}

export function isProviderId(value: string): value is ProviderId {
  return value === "spotify" || value === "youtube" || value === "twitch";
}

function getProviderConfig(provider: ProviderId): ProviderConfig | null {
  const definition = providerDefinitions[provider];
  const clientId = process.env[definition.env[0]];
  const clientSecret = process.env[definition.env[1]];

  if (!clientId || !clientSecret) {
    return null;
  }

  if (provider === "spotify") {
    return {
      id: provider,
      name: definition.name,
      clientId,
      clientSecret,
      scopes: [
        "user-read-email",
        "user-read-private",
        "user-top-read",
        "user-library-read",
        "user-follow-read",
      ],
      getAuthorizeUrl: ({ origin, state }) => {
        const params = new URLSearchParams({
          client_id: clientId,
          response_type: "code",
          redirect_uri: getCallbackUrl(origin, provider),
          scope:
            "user-read-email user-read-private user-top-read user-library-read user-follow-read",
          state,
          show_dialog: "true",
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
      },
      exchangeCode: async ({ code, origin }) => {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: getCallbackUrl(origin, provider),
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Spotify token exchange failed");
        }

        const payload = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
        };

        return {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          expiresAt: Date.now() + payload.expires_in * 1000,
          connectedAt: new Date().toISOString(),
        };
      },
      refresh: async (connection) => {
        if (!connection.refreshToken) {
          throw new Error("Spotify refresh token missing");
        }

        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: connection.refreshToken,
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Spotify token refresh failed");
        }

        const payload = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
        };

        return {
          ...connection,
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token ?? connection.refreshToken,
          expiresAt: Date.now() + payload.expires_in * 1000,
        };
      },
      verify: async (connection) => {
        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as {
          id?: string;
          display_name?: string | null;
          email?: string | null;
        };

        if (!payload.id) {
          return null;
        }

        return {
          accountId: payload.id,
          displayName: payload.display_name || payload.email || "Spotify account",
        };
      },
    };
  }

  if (provider === "youtube") {
    return {
      id: provider,
      name: definition.name,
      clientId,
      clientSecret,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
      getAuthorizeUrl: ({ origin, state }) => {
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: getCallbackUrl(origin, provider),
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
          state,
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      },
      exchangeCode: async ({ code, origin }) => {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: getCallbackUrl(origin, provider),
            grant_type: "authorization_code",
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Google token exchange failed");
        }

        const payload = (await response.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
        };

        return {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          expiresAt: Date.now() + payload.expires_in * 1000,
          connectedAt: new Date().toISOString(),
        };
      },
      refresh: async (connection) => {
        if (!connection.refreshToken) {
          throw new Error("Google refresh token missing");
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: connection.refreshToken,
            grant_type: "refresh_token",
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Google refresh token failed");
        }

        const payload = (await response.json()) as {
          access_token: string;
          expires_in: number;
          refresh_token?: string;
        };

        return {
          ...connection,
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token ?? connection.refreshToken,
          expiresAt: Date.now() + payload.expires_in * 1000,
        };
      },
      verify: async (connection) => {
        const response = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          {
            headers: {
              Authorization: `Bearer ${connection.accessToken}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as {
          items?: Array<{
            id?: string;
            snippet?: {
              title?: string;
            };
          }>;
        };

        const channel = payload.items?.[0];

        if (!channel?.id) {
          return null;
        }

        return {
          accountId: channel.id,
          displayName: channel.snippet?.title || "YouTube channel",
        };
      },
    };
  }

  return {
    id: provider,
    name: definition.name,
    clientId,
    clientSecret,
    scopes: ["user:read:email", "user:read:follows"],
    getAuthorizeUrl: ({ origin, state }) => {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getCallbackUrl(origin, provider),
        response_type: "code",
        scope: "user:read:email user:read:follows",
        state,
        force_verify: "true",
      });

      return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    },
    exchangeCode: async ({ code, origin }) => {
      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: getCallbackUrl(origin, provider),
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Twitch token exchange failed");
      }

      const payload = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: Date.now() + payload.expires_in * 1000,
        connectedAt: new Date().toISOString(),
      };
    },
    refresh: async (connection) => {
      if (!connection.refreshToken) {
        throw new Error("Twitch refresh token missing");
      }

      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Twitch token refresh failed");
      }

      const payload = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      return {
        ...connection,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token ?? connection.refreshToken,
        expiresAt: Date.now() + payload.expires_in * 1000,
      };
    },
    verify: async (connection) => {
      const response = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Client-Id": clientId,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        data?: Array<{
          id?: string;
          display_name?: string;
          login?: string;
        }>;
      };

      const account = payload.data?.[0];

      if (!account?.id) {
        return null;
      }

      return {
        accountId: account.id,
        displayName: account.display_name || account.login || "Twitch account",
      };
    },
  };
}

function rowToConnection(row: ConnectionRow) {
  return {
    accessToken: decrypt(row.access_token),
    refreshToken: row.refresh_token ? decrypt(row.refresh_token) : undefined,
    expiresAt: row.expires_at,
    connectedAt: row.connected_at,
    providerAccountId: row.provider_account_id ?? undefined,
    providerAccountLabel: row.provider_account_label ?? undefined,
  } satisfies StoredConnection;
}

async function readStoredConnectionsForUser(userId: string) {
  const rows = queryAll<ConnectionRow>(
    `
      SELECT
        provider,
        access_token,
        refresh_token,
        expires_at,
        connected_at,
        provider_account_id,
        provider_account_label
      FROM provider_connections
      WHERE user_id = ?
    `,
    [userId],
  );
  const connections: StoredConnections = {};

  for (const row of rows) {
    try {
      connections[row.provider] = rowToConnection(row);
    } catch {
      execute(
        "DELETE FROM provider_connections WHERE user_id = ? AND provider = ?",
        [userId, row.provider],
      );
    }
  }

  return connections;
}

async function storeConnectionForUser(
  userId: string,
  provider: ProviderId,
  connection: StoredConnection,
) {
  execute(
    `
      INSERT INTO provider_connections (
        user_id,
        provider,
        access_token,
        refresh_token,
        expires_at,
        connected_at,
        provider_account_id,
        provider_account_label
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        connected_at = excluded.connected_at,
        provider_account_id = excluded.provider_account_id,
        provider_account_label = excluded.provider_account_label
    `,
    [
      userId,
      provider,
      encrypt(connection.accessToken),
      connection.refreshToken ? encrypt(connection.refreshToken) : null,
      connection.expiresAt,
      connection.connectedAt,
      connection.providerAccountId ?? null,
      connection.providerAccountLabel ?? null,
    ],
  );
}

async function deleteConnectionForUser(userId: string, provider: ProviderId) {
  execute(
    "DELETE FROM provider_connections WHERE user_id = ? AND provider = ?",
    [userId, provider],
  );
}

async function getConnectionForUser(
  userId: string,
  provider: ProviderId,
  options?: { persist?: boolean },
) {
  const persist = options?.persist ?? false;
  const connections = await readStoredConnectionsForUser(userId);
  const existing = connections[provider];

  if (!existing) {
    return {
      connection: null,
      status: "missing" as const,
    };
  }

  const current = await getUsableConnection(provider, existing);

  if (!current) {
    if (persist) {
      await deleteConnectionForUser(userId, provider);
    }

    return {
      connection: null,
      status: "invalid" as const,
    };
  }

  if (persist) {
    await storeConnectionForUser(userId, provider, current);
  }

  return {
    connection: current,
    status: "connected" as const,
  };
}

export async function disconnectProviderForUser(
  userId: string,
  provider: ProviderId,
) {
  await deleteConnectionForUser(userId, provider);
}

export function getAvailableServices(): AvailableService[] {
  return (Object.keys(providerDefinitions) as ProviderId[]).map((provider) => ({
    id: provider,
    name: providerDefinitions[provider].name,
    configured: hasProviderCredentials(provider),
  }));
}

export async function createAuthorizationUrl(
  provider: ProviderId,
  origin?: string,
) {
  const config = getProviderConfig(provider);

  if (!config) {
    return null;
  }

  const appOrigin = getAppOrigin(origin);
  const state = randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(
    `${STATE_COOKIE_PREFIX}${provider}`,
    encodeOAuthStateCookie({ state, origin: appOrigin }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return config.getAuthorizeUrl({ origin: appOrigin, state });
}

export async function completeAuthorization(params: {
  provider: ProviderId;
  code: string;
  state: string | null;
  userId: string;
  origin?: string;
}) {
  const { provider, code, state, userId, origin } = params;
  const config = getProviderConfig(provider);

  if (!config || !state) {
    return false;
  }

  const cookieStore = await cookies();
  const expectedState = parseOAuthStateCookie(
    cookieStore.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value,
  );

  cookieStore.delete(`${STATE_COOKIE_PREFIX}${provider}`);

  if (!expectedState || expectedState.state !== state) {
    return false;
  }

  const appOrigin = expectedState.origin || getAppOrigin(origin);
  const connection = await config.exchangeCode({ code, origin: appOrigin });
  const identity = await config.verify(connection);

  if (!identity) {
    return false;
  }

  await storeConnectionForUser(userId, provider, {
    ...connection,
    providerAccountId: identity.accountId,
    providerAccountLabel: identity.displayName,
  });

  return true;
}

async function refreshIfNeeded(
  provider: ProviderId,
  connection: StoredConnection,
) {
  const config = getProviderConfig(provider);

  if (!config) {
    return null;
  }

  if (connection.expiresAt > Date.now() + 60_000) {
    return connection;
  }

  if (!connection.refreshToken) {
    return null;
  }

  return config.refresh(connection);
}

async function getUsableConnection(
  provider: ProviderId,
  connection: StoredConnection,
) {
  const config = getProviderConfig(provider);

  if (!config) {
    return null;
  }

  try {
    let current = await refreshIfNeeded(provider, connection);

    if (!current) {
      return null;
    }

    let identity = await config.verify(current);

    if (!identity && current.refreshToken) {
      current = await config.refresh(current);
      identity = await config.verify(current);
    }

    if (!identity) {
      return null;
    }

    return {
      ...current,
      providerAccountId: identity.accountId,
      providerAccountLabel: identity.displayName,
    };
  } catch {
    return null;
  }
}

export async function getVerifiedStatusesForUser(
  userId: string,
  options?: { persist?: boolean },
) {
  const persist = options?.persist ?? false;
  const connections = await readStoredConnectionsForUser(userId);
  const services = getAvailableServices();
  const statuses = Object.fromEntries(
    services.map((service) => [service.id, false]),
  ) as Record<ProviderId, boolean>;

  for (const service of services) {
    const existing = connections[service.id];

    if (!service.configured) {
      continue;
    }

    if (!existing) {
      continue;
    }

    const current = await getUsableConnection(service.id, existing);

    if (!current) {
      if (persist) {
        await deleteConnectionForUser(userId, service.id);
      }
      continue;
    }

    if (persist) {
      await storeConnectionForUser(userId, service.id, current);
    }

    statuses[service.id] = true;
  }

  return {
    services,
    statuses,
  };
}

export async function getSpotifyTopArtistsForUser(
  userId: string,
  options?: { persist?: boolean },
): Promise<SpotifyTopArtistsResult> {
  const spotify = await getConnectionForUser(userId, "spotify", options);

  if (!spotify.connection) {
    return {
      artists: [],
      error:
        spotify.status === "missing"
          ? "Spotify is not connected."
          : "Spotify could not be verified anymore. Please reconnect it.",
    };
  }

  const response = await fetch(
    "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
    {
      headers: {
        Authorization: `Bearer ${spotify.connection.accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      artists: [],
      error:
        response.status === 403
          ? "Spotify denied access to top artists. Reconnect Spotify and approve the updated permissions."
          : "Spotify top artists could not be fetched right now.",
    };
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id: string;
      name: string;
      external_urls?: { spotify?: string };
      images?: Array<{ url: string }>;
    }>;
  };

  const artists = (payload.items ?? []).map((artist) => ({
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url ?? null,
    url: artist.external_urls?.spotify ?? "https://open.spotify.com/",
  }));

  if (artists.length === 0) {
    return {
      artists: [],
      error:
        "Spotify is connected, but no top artists were returned for this account yet.",
    };
  }

  return {
    artists,
    error: null,
  };
}

export async function getYoutubeHighlightsForUser(
  userId: string,
  options?: { persist?: boolean },
): Promise<YoutubeHighlightsResult> {
  const youtube = await getConnectionForUser(userId, "youtube", options);

  if (!youtube.connection) {
    return {
      videos: [],
      channels: [],
      error:
        youtube.status === "missing"
          ? "YouTube is not connected."
          : "YouTube could not be verified anymore. Please reconnect it.",
    };
  }

  const subscriptionsResponse = await fetch(
    "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=6&order=relevance",
    {
      headers: {
        Authorization: `Bearer ${youtube.connection.accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!subscriptionsResponse.ok) {
    return {
      videos: [],
      channels: [],
      error:
        subscriptionsResponse.status === 403
          ? "YouTube denied access to subscriptions. Reconnect YouTube and approve the updated permissions."
          : "YouTube subscriptions could not be fetched right now.",
    };
  }

  const subscriptionsPayload = (await subscriptionsResponse.json()) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        resourceId?: {
          channelId?: string;
        };
        thumbnails?: YoutubeThumbnailSet;
      };
    }>;
  };

  const subscribedChannels: YoutubeChannelWithUploads[] = (subscriptionsPayload.items ?? [])
    .map((subscription) => {
      const channelId = subscription.snippet?.resourceId?.channelId;

      if (!channelId) {
        return null;
      }

      return {
        id: channelId,
        title: subscription.snippet?.title ?? "YouTube channel",
        imageUrl: getYoutubeThumbnailUrl(subscription.snippet?.thumbnails),
        url: `https://www.youtube.com/channel/${channelId}`,
        subscriberCount: null,
        uploadsPlaylistId: null as string | null,
      };
    })
    .filter((channel): channel is NonNullable<typeof channel> =>
      Boolean(channel),
    )
    .slice(0, 6);

  if (subscribedChannels.length === 0) {
    return {
      videos: [],
      channels: [],
      error:
        "YouTube is connected, but no subscriptions were returned for this account.",
    };
  }

  let channels: YoutubeChannelWithUploads[] = subscribedChannels;
  const channelIds = subscribedChannels.map((channel) => channel.id);

  if (channelIds.length > 0) {
    const channelsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${youtube.connection.accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (channelsResponse.ok) {
      const channelsPayload = (await channelsResponse.json()) as {
        items?: Array<{
          id?: string;
          snippet?: {
            title?: string;
            customUrl?: string;
            thumbnails?: YoutubeThumbnailSet;
          };
          statistics?: {
            subscriberCount?: string;
          };
          contentDetails?: {
            relatedPlaylists?: {
              uploads?: string;
            };
          };
        }>;
      };

      channels = (channelsPayload.items ?? [])
        .filter(
          (channel): channel is NonNullable<typeof channel> & { id: string } =>
            Boolean(channel.id),
        )
        .map((channel) => {
          const customUrl = channel.snippet?.customUrl?.trim();
          const channelPath = customUrl
            ? customUrl.startsWith("@")
              ? customUrl
              : `@${customUrl}`
            : `channel/${channel.id}`;

          return {
            id: channel.id,
            title: channel.snippet?.title ?? "YouTube channel",
            imageUrl: getYoutubeThumbnailUrl(channel.snippet?.thumbnails),
            url: `https://www.youtube.com/${channelPath}`,
            subscriberCount: channel.statistics?.subscriberCount
              ? Number(channel.statistics.subscriberCount)
              : null,
            uploadsPlaylistId:
              channel.contentDetails?.relatedPlaylists?.uploads ?? null,
          };
        })
        .sort((left, right) => {
          return channelIds.indexOf(left.id) - channelIds.indexOf(right.id);
        });
    }
  }

  const uploadPlaylistIds = channels
    .map((channel) => ({
      playlistId: channel.uploadsPlaylistId,
      channelTitle: channel.title,
    }))
    .filter(
      (channel): channel is YoutubeUploadPlaylist =>
        Boolean(channel.playlistId),
    )
    .slice(0, 6);

  const playlistItems = (
    await Promise.all(
      uploadPlaylistIds.map(async (channel) => {
        const params = new URLSearchParams({
          part: "snippet,contentDetails",
          playlistId: channel.playlistId,
          maxResults: "1",
        });
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${youtube.connection.accessToken}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return [];
        }

        const payload = (await response.json()) as {
          items?: Array<{
            snippet?: {
              title?: string;
              publishedAt?: string;
              channelTitle?: string;
              thumbnails?: YoutubeThumbnailSet;
              resourceId?: {
                videoId?: string;
              };
            };
            contentDetails?: {
              videoId?: string;
              videoPublishedAt?: string;
            };
          }>;
        };

        return (payload.items ?? []).map((item) => ({
          id: item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId,
          title: item.snippet?.title ?? "Untitled video",
          channelTitle: item.snippet?.channelTitle ?? channel.channelTitle,
          imageUrl: getYoutubeThumbnailUrl(item.snippet?.thumbnails),
          publishedAt:
            item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? "",
        }));
      }),
    )
  ).flat();

  const videoIds = [
    ...new Set(
      playlistItems
        .map((video) => video.id)
        .filter((videoId): videoId is string => Boolean(videoId)),
    ),
  ];
  const videoViewCounts = new Map<string, number | null>();

  if (videoIds.length > 0) {
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${youtube.connection.accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (statsResponse.ok) {
      const statsPayload = (await statsResponse.json()) as {
        items?: Array<{
          id?: string;
          statistics?: {
            viewCount?: string;
          };
        }>;
      };

      for (const item of statsPayload.items ?? []) {
        if (item.id) {
          videoViewCounts.set(
            item.id,
            item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
          );
        }
      }
    }
  }

  const videos = playlistItems
    .filter((video): video is typeof video & { id: string } =>
      Boolean(video.id),
    )
    .sort(
      (left, right) =>
        Date.parse(right.publishedAt || "0") -
        Date.parse(left.publishedAt || "0"),
    )
    .slice(0, 6)
    .map((video) => ({
      id: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      imageUrl: video.imageUrl,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      viewCount: videoViewCounts.get(video.id) ?? null,
    }));

  const visibleChannels: YoutubeTopChannel[] = channels.map((channel) => ({
    id: channel.id,
    title: channel.title,
    imageUrl: channel.imageUrl,
    url: channel.url,
    subscriberCount: channel.subscriberCount,
  }));

  if (videos.length === 0 && visibleChannels.length === 0) {
    return {
      videos: [],
      channels: [],
      error:
        "YouTube is connected, but no subscribed channels or recent uploads were returned yet.",
    };
  }

  return {
    videos,
    channels: visibleChannels,
    error: null,
  };
}

function getYoutubeThumbnailUrl(thumbnails?: YoutubeThumbnailSet) {
  return (
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    null
  );
}

export async function getTwitchTopStreamsForUser(
  userId: string,
  options?: { persist?: boolean },
): Promise<TwitchTopStreamsResult> {
  const twitch = await getConnectionForUser(userId, "twitch", options);

  if (!twitch.connection) {
    return {
      streams: [],
      error:
        twitch.status === "missing"
          ? "Twitch is not connected."
          : "Twitch could not be verified anymore. Please reconnect it.",
    };
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const twitchUserId = twitch.connection.providerAccountId;

  if (!clientId || !twitchUserId) {
    return {
      streams: [],
      error: "Twitch could not be verified anymore. Please reconnect it.",
    };
  }

  const params = new URLSearchParams({
    first: "6",
    user_id: twitchUserId,
  });
  const response = await fetch(
    `https://api.twitch.tv/helix/streams/followed?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${twitch.connection.accessToken}`,
        "Client-Id": clientId,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      streams: [],
      error:
        response.status === 401 || response.status === 403
          ? "Twitch denied access to followed streams. Reconnect Twitch and approve the updated permissions."
          : "Twitch followed streams could not be fetched right now.",
    };
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string;
      user_name?: string;
      user_login?: string;
      title?: string;
      viewer_count?: number;
      game_name?: string;
      thumbnail_url?: string;
    }>;
  };

  const streams = (payload.data ?? [])
    .filter((stream): stream is NonNullable<typeof stream> & { id: string } =>
      Boolean(stream.id),
    )
    .map((stream) => ({
      id: stream.id,
      broadcasterName: stream.user_name ?? stream.user_login ?? "Twitch streamer",
      title: stream.title ?? "Live now",
      imageUrl:
        stream.thumbnail_url
          ?.replace("{width}", "640")
          .replace("{height}", "360") ?? "",
      url: `https://www.twitch.tv/${stream.user_login ?? ""}`,
      viewerCount: stream.viewer_count ?? 0,
      gameName: stream.game_name ?? null,
    }))
    .filter((stream) => Boolean(stream.url) && Boolean(stream.imageUrl));

  if (streams.length === 0) {
    return {
      streams: [],
      error: "Twitch is connected, but none of your followed channels are live right now.",
    };
  }

  return {
    streams,
    error: null,
  };
}
