import { ConnectedApps } from "./_components/connected-apps";
import { getCurrentUser } from "@/lib/auth";
import {
  getAvailableServices,
  getSpotifyTopArtistsForUser,
  getTwitchTopStreamsForUser,
  getVerifiedStatusesForUser,
  getYoutubeHighlightsForUser,
  type ProviderId,
} from "@/lib/integrations";

type HomeProps = {
  searchParams: Promise<{
    error?: string | string[];
    auth_error?: string | string[];
    notice?: string | string[];
    provider?: string | string[];
    reset_token?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const currentUser = await getCurrentUser();
  const services = getAvailableServices();
  const emptyStatuses = Object.fromEntries(
    services.map((service) => [service.id, false]),
  ) as Record<ProviderId, boolean>;
  const { statuses } = currentUser
    ? await getVerifiedStatusesForUser(currentUser.id, { persist: false })
    : { statuses: emptyStatuses };
  const [spotifyTopArtists, youtubeHighlights, twitchTopStreams] =
    currentUser
      ? await Promise.all([
          statuses.spotify
            ? getSpotifyTopArtistsForUser(currentUser.id, { persist: false })
            : Promise.resolve({ artists: [], error: null }),
          statuses.youtube
            ? getYoutubeHighlightsForUser(currentUser.id, { persist: false })
            : Promise.resolve({ videos: [], channels: [], error: null }),
          statuses.twitch
            ? getTwitchTopStreamsForUser(currentUser.id, { persist: false })
            : Promise.resolve({ streams: [], error: null }),
        ])
      : [
          { artists: [], error: null },
          { videos: [], channels: [], error: null },
          { streams: [], error: null },
        ];
  const query = await searchParams;
  const pageError = Array.isArray(query.error)
    ? query.error[0] ?? null
    : query.error ?? null;
  const authError = Array.isArray(query.auth_error)
    ? query.auth_error[0] ?? null
    : query.auth_error ?? null;
  const notice = Array.isArray(query.notice)
    ? query.notice[0] ?? null
    : query.notice ?? null;
  const noticeProvider = Array.isArray(query.provider)
    ? query.provider[0] ?? null
    : query.provider ?? null;
  const resetToken = Array.isArray(query.reset_token)
    ? query.reset_token[0] ?? null
    : query.reset_token ?? null;

  return (
    <main className="page-shell flex-1 text-zinc-950">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ConnectedApps
          currentUser={currentUser}
          services={services}
          initialStatuses={statuses}
          pageError={pageError}
          authError={authError}
          notice={notice}
          noticeProvider={noticeProvider}
          resetToken={resetToken}
          spotifyTopArtists={spotifyTopArtists}
          youtubeHighlights={youtubeHighlights}
          twitchTopStreams={twitchTopStreams}
        />
      </div>
    </main>
  );
}
