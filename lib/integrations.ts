import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export type ProviderId = "spotify" | "youtube" | "twitch";

export type AvailableService = {
  id: ProviderId;
  name: string;
  configured: boolean;
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
  verify: (connection: StoredConnection) => Promise<boolean>;
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

export type StoredConnection = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  connectedAt: string;
};

type StoredConnections = Partial<Record<ProviderId, StoredConnection>>;

const STATE_COOKIE_PREFIX = "pophub_oauth_state_";
const CONNECTION_COOKIE_PREFIX = "pophub_connection_";

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

function requireSessionSecret() {
  const secret = process.env.POPHUB_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing POPHUB_SESSION_SECRET");
  }

  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const key = requireSessionSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(value: string) {
  const key = requireSessionSecret();
  const buffer = Buffer.from(value, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

function getCallbackUrl(origin: string, provider: ProviderId) {
  return `${origin}/api/auth/${provider}/callback`;
}

export function getAppOrigin(requestOrigin?: string) {
  const appUrl = process.env.APP_URL?.trim();

  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://127.0.0.1:3000";
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
      scopes: ["user-read-email", "user-read-private", "user-top-read"],
      getAuthorizeUrl: ({ origin, state }) => {
        const params = new URLSearchParams({
          client_id: clientId,
          response_type: "code",
          redirect_uri: getCallbackUrl(origin, provider),
          scope: "user-read-email user-read-private user-top-read",
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

        return response.ok;
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
          throw new Error("Google token refresh failed");
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
          "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
          {
            headers: {
              Authorization: `Bearer ${connection.accessToken}`,
            },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return false;
        }

        const payload = (await response.json()) as {
          items?: Array<{ id: string }>;
        };

        return Array.isArray(payload.items) && payload.items.length > 0;
      },
    };
  }

  return {
    id: provider,
    name: definition.name,
    clientId,
    clientSecret,
    scopes: ["user:read:email"],
    getAuthorizeUrl: ({ origin, state }) => {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getCallbackUrl(origin, provider),
        response_type: "code",
        scope: "user:read:email",
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
        return false;
      }

      const payload = (await response.json()) as {
        data?: Array<{ id: string }>;
      };

      return Array.isArray(payload.data) && payload.data.length > 0;
    },
  };
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

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set(`${STATE_COOKIE_PREFIX}${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 10,
  });

  return config.getAuthorizeUrl({ origin: appOrigin, state });
}

async function readStoredConnections() {
  const cookieStore = await cookies();
  const connections: StoredConnections = {};

  for (const provider of Object.keys(providerDefinitions) as ProviderId[]) {
    const raw = cookieStore.get(`${CONNECTION_COOKIE_PREFIX}${provider}`)?.value;

    if (!raw) {
      continue;
    }

    try {
      connections[provider] = JSON.parse(decrypt(raw)) as StoredConnection;
    } catch {
      cookieStore.delete(`${CONNECTION_COOKIE_PREFIX}${provider}`);
    }
  }

  return connections;
}

async function writeStoredConnections(connections: StoredConnections) {
  const cookieStore = await cookies();

  for (const provider of Object.keys(providerDefinitions) as ProviderId[]) {
    const connection = connections[provider];

    if (!connection) {
      cookieStore.delete(`${CONNECTION_COOKIE_PREFIX}${provider}`);
      continue;
    }

    cookieStore.set(
      `${CONNECTION_COOKIE_PREFIX}${provider}`,
      encrypt(JSON.stringify(connection)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
  }
}

export async function completeAuthorization(params: {
  provider: ProviderId;
  code: string;
  state: string | null;
  origin?: string;
}) {
  const { provider, code, state, origin } = params;
  const config = getProviderConfig(provider);

  if (!config || !state) {
    return false;
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`${STATE_COOKIE_PREFIX}${provider}`)?.value;

  cookieStore.delete(`${STATE_COOKIE_PREFIX}${provider}`);

  if (!expectedState || expectedState !== state) {
    return false;
  }

  const appOrigin = getAppOrigin(origin);
  const connection = await config.exchangeCode({ code, origin: appOrigin });
  const verified = await config.verify(connection);

  if (!verified) {
    return false;
  }

  const connections = await readStoredConnections();

  connections[provider] = connection;
  await writeStoredConnections(connections);

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

    let verified = await config.verify(current);

    if (!verified && current.refreshToken) {
      current = await config.refresh(current);
      verified = await config.verify(current);
    }

    if (!verified) {
      return null;
    }

    return current;
  } catch {
    return null;
  }
}

export async function getVerifiedStatuses(options?: { persist?: boolean }) {
  const persist = options?.persist ?? false;
  const connections = await readStoredConnections();
  const services = getAvailableServices();
  const nextConnections: StoredConnections = {};
  const statuses = Object.fromEntries(
    services.map((service) => [service.id, false]),
  ) as Record<ProviderId, boolean>;

  for (const service of services) {
    const existing = connections[service.id];

    if (!service.configured || !existing) {
      continue;
    }

    const config = getProviderConfig(service.id);

    if (!config) {
      continue;
    }

    const current = await getUsableConnection(service.id, existing);

    if (!current) {
      continue;
    }

    nextConnections[service.id] = current;
    statuses[service.id] = true;
  }

  if (persist) {
    await writeStoredConnections(nextConnections);
  }

  return {
    services,
    statuses,
  };
}

export async function getSpotifyTopArtists(
  options?: { persist?: boolean },
): Promise<SpotifyTopArtistsResult> {
  const persist = options?.persist ?? false;
  const connections = await readStoredConnections();
  const spotify = connections.spotify;

  if (!spotify) {
    return {
      artists: [],
      error: "Spotify is not connected.",
    };
  }

  const current = await getUsableConnection("spotify", spotify);

  if (!current) {
    if (persist) {
      await writeStoredConnections({
        ...connections,
        spotify: undefined,
      });
    }

    return {
      artists: [],
      error: "Spotify could not be verified anymore. Please reconnect it.",
    };
  }

  if (persist) {
    await writeStoredConnections({
      ...connections,
      spotify: current,
    });
  }

  const response = await fetch(
    "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=medium_term",
    {
      headers: {
        Authorization: `Bearer ${current.accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let providerDetail = "";

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };

      providerDetail = payload.error?.message
        ? ` Spotify said: ${payload.error.message}.`
        : "";
    } catch {
      providerDetail = "";
    }

    return {
      artists: [],
      error:
        response.status === 403
          ? `Spotify denied access to top artists. Reconnect Spotify and approve the updated permissions.${providerDetail}`
          : `Spotify top artists could not be fetched right now.${providerDetail}`,
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
