import { ConnectedApps } from "./_components/connected-apps";
import {
  getSpotifyTopArtists,
  getVerifiedStatuses,
} from "@/lib/integrations";

type HomeProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { services, statuses } = await getVerifiedStatuses({ persist: false });
  const spotifyTopArtists = statuses.spotify
    ? await getSpotifyTopArtists({ persist: false })
    : { artists: [], error: null };
  const query = await searchParams;
  const pageError = Array.isArray(query.error)
    ? query.error[0] ?? null
    : query.error ?? null;

  return (
    <main className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(40,196,167,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,179,80,0.18),_transparent_22%),linear-gradient(180deg,#071117_0%,#09141b_52%,#050b10_100%)] text-stone-50">
      <div className="mx-auto h-full w-full max-w-[1600px] px-3 py-3 sm:px-4 sm:py-4">
        <ConnectedApps
          services={services}
          initialStatuses={statuses}
          pageError={pageError}
          spotifyTopArtists={spotifyTopArtists}
        />
      </div>
    </main>
  );
}
