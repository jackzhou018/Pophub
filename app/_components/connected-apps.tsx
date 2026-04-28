import type { ReactNode } from "react";
import Link from "next/link";
import type { AttentionSource, AttentionSourceStatus } from "@/lib/attention-sources";
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

type SourceMarketplaceProps = {
  currentUser: {
    email: string;
  } | null;
  services: AvailableService[];
  initialStatuses: Partial<Record<ProviderId, boolean>>;
  showHeader?: boolean;
};

type AttentionSourcesPanelProps = {
  attentionSources: AttentionSource[];
};

type Tone = "success" | "warning" | "info";

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

const providerCategory: Record<ProviderId, string> = {
  spotify: "Music",
  youtube: "Video",
  twitch: "Live",
};

const providerMerch: Record<
  ProviderId,
  {
    headline: string;
    detail: string;
    accent: string;
    available: string;
  }
> = {
  spotify: {
    headline: "Music preview",
    detail: "Prototype rack for top artists, saved shows, and release planning",
    accent: "bg-emerald-300 text-zinc-950",
    available: "Supported source",
  },
  youtube: {
    headline: "Creator preview",
    detail: "Prototype rack for subscriptions, uploads, and creator videos",
    accent: "bg-rose-300 text-zinc-950",
    available: "Supported source",
  },
  twitch: {
    headline: "Live preview",
    detail: "Prototype rack for followed streamers and live creator planning",
    accent: "bg-violet-300 text-zinc-950",
    available: "Supported source",
  },
};

const categoryTabs = [
  "Watch",
  "Listen",
  "Creators",
  "Concerts",
  "Sports",
  "Live",
  "For You",
  "Sources",
];

const staticDrops = [
  {
    id: "netflix-return",
    label: "Demo mode",
    title: "Returning series watchlist",
    source: "Manual tracker",
    meta: "Coming soon",
    tone: "bg-red-500",
  },
  {
    id: "hulu-weekly",
    label: "Preview",
    title: "Weekly episode tracker",
    source: "Manual tracker",
    meta: "Coming soon",
    tone: "bg-lime-300",
  },
  {
    id: "tickets-soon",
    label: "Preview",
    title: "Concert watchlist planning",
    source: "Events",
    meta: "No ticketing yet",
    tone: "bg-amber-300",
  },
  {
    id: "film-night",
    label: "Demo mode",
    title: "Movies to plan for the weekend",
    source: "Streaming",
    meta: "Manual queue",
    tone: "bg-zinc-100",
  },
];

const sourceRail = [
  "Netflix",
  "YouTube",
  "Spotify",
  "Hulu",
  "Ticketmaster",
  "Twitch",
  "Max",
  "Disney+",
  "Prime Video",
  "Apple Music",
];

const footerGroups = [
  {
    title: "Watch",
    links: ["Episode planning", "Movie releases", "Trailer previews", "Manual saves"],
  },
  {
    title: "Listen",
    links: ["Album planning", "Podcasts", "Top artists", "Release preview"],
  },
  {
    title: "Creators",
    links: ["YouTube preview", "Twitch source", "Subscriptions", "Creator planning"],
  },
  {
    title: "Going out",
    links: ["Concert planning", "Local events", "Sports", "Ticket reminders"],
  },
  {
    title: "Sources",
    links: ["Connect Spotify", "Connect YouTube", "Connect Twitch", "Manual watchlist"],
  },
];

const fieldClassName = "field-input mt-2";
const primaryButtonClassName =
  "button-primary px-4 py-3 disabled:cursor-wait disabled:opacity-70";
const secondaryButtonClassName = "button-secondary px-4 py-3";

function formatCount(value: number | null, noun: string) {
  if (value === null) {
    return noun;
  }

  return `${new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)} ${noun}`;
}

function messageToneClass(tone: Tone) {
  if (tone === "success") {
    return "border-emerald-300 bg-emerald-50 text-emerald-950";
  }

  if (tone === "warning") {
    return "border-amber-300 bg-amber-50 text-amber-950";
  }

  return "border-zinc-300 bg-zinc-50 text-zinc-950";
}

function sourceStatusClass(status: AttentionSourceStatus) {
  if (status === "connected") {
    return "bg-emerald-300 text-zinc-950";
  }

  if (status === "ready") {
    return "bg-cyan-200 text-zinc-950";
  }

  if (status === "manual") {
    return "bg-amber-300 text-zinc-950";
  }

  if (status === "unavailable") {
    return "bg-rose-300 text-zinc-950";
  }

  return "bg-zinc-200 text-zinc-950";
}

function serviceStatus(
  service: AvailableService,
  currentUser: { email: string } | null,
  initialStatuses: Partial<Record<ProviderId, boolean>>,
) {
  const connected = Boolean(initialStatuses[service.id]);

  if (connected) {
    return "Connected";
  }

  if (!service.configured) {
    return "Needs keys";
  }

  if (!currentUser) {
    return "Sign in";
  }

  return "Available";
}

function MessageBanner({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className={`rounded-none border px-4 py-3 text-sm leading-6 ${messageToneClass(
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
          className="store-label text-[0.68rem] text-zinc-500"
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
          className="store-label text-[0.68rem] text-zinc-500"
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

function ProductVisual({
  imageUrl,
  tone,
  title,
}: {
  imageUrl?: string | null;
  tone: string;
  title: string;
}) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-200">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.035]"
        />
      ) : (
        <div
          className={`flex h-full w-full items-end bg-[linear-gradient(135deg,rgba(24,24,27,0.18),rgba(24,24,27,0.76))] ${tone}`}
        >
          <span className="p-4 text-4xl font-black uppercase leading-none tracking-tighter text-zinc-950/80 mix-blend-multiply">
            {title.slice(0, 16)}
          </span>
        </div>
      )}
      <div className="absolute left-3 top-3 bg-zinc-950 px-2 py-1 text-[0.63rem] font-black uppercase tracking-[0.14em] text-zinc-50">
        Preview
      </div>
    </div>
  );
}

type TopicItem = {
  id: string;
  label: string;
  title: string;
  source: string;
  meta: string;
  imageUrl?: string | null;
  href?: string;
  tone: string;
};

function TopicColumns({
  spotifyTopArtists,
  youtubeHighlights,
  twitchTopStreams,
}: {
  spotifyTopArtists: SpotifyTopArtistsResult;
  youtubeHighlights: YoutubeHighlightsResult;
  twitchTopStreams: TwitchTopStreamsResult;
}) {
  const artistItems = spotifyTopArtists.artists.slice(0, 4).map((artist) => ({
    id: `artist-${artist.id}`,
    label: "Connected source",
    title: artist.name,
    source: "Spotify",
    meta: "Music preview",
    imageUrl: artist.imageUrl,
    href: artist.url,
    tone: "bg-emerald-300",
  }));
  const videoItems = youtubeHighlights.videos.slice(0, 4).map((video) => ({
    id: `video-${video.id}`,
    label: "Connected source",
    title: video.title,
    source: video.channelTitle,
    meta: formatCount(video.viewCount, "views"),
    imageUrl: video.imageUrl,
    href: video.url,
    tone: "bg-rose-300",
  }));
  const liveItems = twitchTopStreams.streams.slice(0, 3).map((stream) => ({
    id: `stream-${stream.id}`,
    label: "Connected source",
    title: stream.broadcasterName,
    source: stream.gameName ?? "Twitch",
    meta: formatCount(stream.viewerCount, "viewers"),
    imageUrl: stream.imageUrl,
    href: stream.url,
    tone: "bg-violet-300",
  }));
  const musicFallback: TopicItem = {
    id: "music-fallback",
    label: "Coming soon",
    title: "Music release planner",
    source: "Connect Spotify",
    meta: "Prototype",
    tone: "bg-emerald-300",
  };
  const youtubeFallback: TopicItem = {
    id: "youtube-fallback",
    label: "Coming soon",
    title: "Creator upload planner",
    source: "Connect YouTube",
    meta: "Prototype",
    tone: "bg-rose-300",
  };
  const liveFallback: TopicItem = {
    id: "live-fallback",
    label: "Coming soon",
    title: "Live and event planner",
    source: "Connect Twitch",
    meta: "Manual reminders",
    tone: "bg-violet-300",
  };
  const streamingHeadliner: TopicItem = {
    ...staticDrops[0],
    imageUrl: null,
    href: undefined,
  };
  const columns = [
    {
      id: "music",
      title: "Music",
      eyebrow: "Listen column",
      headliner: artistItems[0] ?? musicFallback,
      items:
        artistItems.length > 1
          ? artistItems.slice(1)
          : [
              {
                id: "music-release",
                label: "Manual tracker",
                title: "Album release watchlist",
                source: "Music",
                meta: "Preview",
                tone: "bg-emerald-200",
              },
              {
                id: "podcast-planner",
                label: "Coming soon",
                title: "Podcast queue planning",
                source: "Audio",
                meta: "Prototype",
                tone: "bg-lime-300",
              },
            ],
    },
    {
      id: "streaming",
      title: "Streaming",
      eyebrow: "Watch column",
      headliner: streamingHeadliner,
      items: staticDrops.slice(1).map((drop) => ({
        ...drop,
        imageUrl: null,
        href: undefined,
      })),
    },
    {
      id: "youtube",
      title: "YouTube",
      eyebrow: "Creator column",
      headliner: videoItems[0] ?? youtubeFallback,
      items:
        videoItems.length > 1
          ? videoItems.slice(1)
          : [
              {
                id: "creator-subscriptions",
                label: "Coming soon",
                title: "Subscribed channel rack",
                source: "YouTube",
                meta: "Connect source",
                tone: "bg-rose-200",
              },
              {
                id: "trailer-planning",
                label: "Preview",
                title: "Trailer watchlist",
                source: "Video",
                meta: "Manual queue",
                tone: "bg-orange-300",
              },
            ],
    },
    {
      id: "live-events",
      title: "Live & Events",
      eyebrow: "Going out column",
      headliner: liveItems[0] ?? liveFallback,
      items:
        liveItems.length > 1
          ? liveItems.slice(1)
          : [
              {
                id: "concert-planning",
                label: "Preview",
                title: "Concert reminder rack",
                source: "Events",
                meta: "Manual planning",
                tone: "bg-amber-300",
              },
              {
                id: "sports-planning",
                label: "Coming soon",
                title: "Sports event watchlist",
                source: "Sports",
                meta: "Future source",
                tone: "bg-cyan-200",
              },
            ],
    },
  ];

  return (
    <section id="preview-drops" className="store-section">
      <div className="mb-4 grid gap-4 border border-zinc-950 bg-zinc-50 p-5 text-zinc-950 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
        <div>
          <p className="store-label text-zinc-500">Prototype discovery feed</p>
          <h1 className="mt-2 text-5xl font-black uppercase leading-[0.9] tracking-[-0.07em] sm:text-6xl lg:text-7xl">
            One headliner per column.
          </h1>
        </div>
        <p className="self-end text-sm font-semibold leading-6 text-zinc-600">
          Each topic gets its own vertical rack. The top card is the headlining
          thing for that column; the rest are queue items or source previews.
        </p>
      </div>

      <div className="grid gap-px border border-zinc-950 bg-zinc-950 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <TopicColumn key={column.id} {...column} />
        ))}
      </div>
    </section>
  );
}

function TopicColumn({
  eyebrow,
  title,
  headliner,
  items,
}: {
  eyebrow: string;
  title: string;
  headliner: TopicItem;
  items: TopicItem[];
}) {
  return (
    <article className="bg-zinc-50 text-zinc-950">
      <div className="border-b border-zinc-950 p-4">
        <p className="store-label text-zinc-500">{eyebrow}</p>
        <h2 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.06em]">
          {title}
        </h2>
      </div>

      <TopicHeadliner item={headliner} />

      <div className="grid gap-px bg-zinc-950">
        {items.map((item) => (
          <TopicQueueItem key={item.id} item={item} />
        ))}
      </div>
    </article>
  );
}

function TopicHeadliner({ item }: { item: TopicItem }) {
  const content = (
    <article className="group">
      <ProductVisual imageUrl={item.imageUrl} tone={item.tone} title={item.title} />
      <div className="border-t border-zinc-950 bg-zinc-50 p-4">
        <p className="store-label text-zinc-500">{item.label}</p>
        <h3 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.055em]">
          {item.title}
        </h3>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0 text-zinc-500">{item.meta}</span>
        </div>
      </div>
    </article>
  );

  return item.href ? (
    <a href={item.href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}

function TopicQueueItem({ item }: { item: TopicItem }) {
  const content = (
    <article className="group grid grid-cols-[4.5rem_minmax(0,1fr)] bg-zinc-50 transition duration-200 hover:bg-rose-100">
      <div className={`${item.tone} min-h-24 border-r border-zinc-950`} />
      <div className="p-3">
        <p className="store-label text-zinc-500">{item.label}</p>
        <h3 className="mt-2 line-clamp-2 text-base font-black uppercase leading-none tracking-tighter">
          {item.title}
        </h3>
        <p className="mt-2 truncate text-sm font-semibold text-zinc-600">
          {item.source} / {item.meta}
        </p>
      </div>
    </article>
  );

  return item.href ? (
    <a href={item.href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}

function SourceRail({
  services,
  initialStatuses,
}: {
  services: AvailableService[];
  initialStatuses: Partial<Record<ProviderId, boolean>>;
}) {
  const connectedNames = services
    .filter((service) => initialStatuses[service.id])
    .map((service) => service.name);
  const supportedNames = services.map((service) => service.name);

  return (
    <section className="border-y border-zinc-950 bg-zinc-50 text-zinc-950">
      <div className="grid gap-px bg-zinc-950 sm:grid-cols-2 lg:grid-cols-5">
        {sourceRail.map((source) => {
          const connected = connectedNames.includes(source);
          const supported = supportedNames.includes(source);

          return (
            <div
              key={source}
              className="flex min-h-24 items-center justify-between bg-zinc-50 p-4 transition duration-200 hover:bg-rose-100"
            >
              <div>
                <p className="text-xl font-black uppercase tracking-tighter">
                  {source}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {connected ? "Connected" : supported ? "Available" : "Coming soon"}
                </p>
              </div>
              <span className="text-xl font-black">+</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EditorialCollections() {
  const collections = [
    {
      title: "Friday night queue",
      detail: "Shows, trailers, and creator uploads to plan manually for now.",
      tone: "bg-rose-300",
    },
    {
      title: "Albums worth the replay",
      detail: "Artist-led listening picks from supported or future sources.",
      tone: "bg-emerald-300",
    },
    {
      title: "Creators breaking through",
      detail: "Creator source previews for uploads, channels, and live follows.",
      tone: "bg-violet-300",
    },
    {
      title: "Concerts before they sell out",
      detail: "Venue nights and tour reminders for manual planning.",
      tone: "bg-amber-300",
    },
  ];

  return (
    <section className="store-section">
      <SectionHeader
        eyebrow="Editorial collections"
        title="Browse by mood"
        action="Connect sources"
        href="/connections"
      />
      <div className="grid gap-px border border-zinc-950 bg-zinc-950 md:grid-cols-2">
        {collections.map((collection, index) => (
          <article
            key={collection.title}
            className={`group min-h-80 p-5 text-zinc-950 transition duration-200 hover:opacity-95 sm:p-7 ${
              collection.tone
            } ${index === 0 ? "md:row-span-2" : ""}`}
          >
            <div className="flex h-full flex-col justify-between">
              <p className="store-label">Collection {index + 1}</p>
              <div>
                <h3 className="max-w-xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                  {collection.title}
                </h3>
                <p className="mt-4 max-w-md text-base font-semibold leading-7">
                  {collection.detail}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AccountStrip({
  currentUser,
}: {
  currentUser: { email: string } | null;
}) {
  return (
    <section id="account-access" className="border border-zinc-950 bg-zinc-50 text-zinc-950">
      <div className="grid gap-px bg-zinc-950 lg:grid-cols-[minmax(16rem,0.55fr)_minmax(0,1.45fr)]">
        <div className="bg-zinc-50 p-5">
          <p className="store-label text-zinc-500">Your account</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tighter">
            {currentUser ? "You are in" : "Sign in to save the rack"}
          </h2>
          <p className="mt-3 text-sm font-semibold text-zinc-600">
            {currentUser
              ? currentUser.email
              : "Plan drops, connect supported sources, and track the rest manually."}
          </p>
          {currentUser ? (
            <form action="/api/session/logout" method="post" className="mt-5">
              <button type="submit" className={secondaryButtonClassName}>
                Log out
              </button>
            </form>
          ) : null}
        </div>

        {!currentUser ? (
          <div className="grid gap-px bg-zinc-950 md:grid-cols-3">
            <div className="bg-zinc-50 p-5">
              <p className="store-label text-zinc-500">New here</p>
              <div className="mt-4">
                <AuthForm
                  action="/api/session/signup"
                  buttonLabel="Create account"
                  idPrefix="signup"
                />
              </div>
            </div>
            <div className="bg-zinc-50 p-5">
              <p className="store-label text-zinc-500">Returning</p>
              <div className="mt-4">
                <AuthForm
                  action="/api/session/login"
                  buttonLabel="Log in"
                  idPrefix="login"
                />
              </div>
            </div>
            <div className="bg-zinc-50 p-5">
              <p className="store-label text-zinc-500">Reset</p>
              <form
                action="/api/session/request-reset"
                method="post"
                className="mt-4 space-y-3"
              >
                <div>
                  <label
                    className="store-label text-[0.68rem] text-zinc-500"
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
                  Send reset
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-50 p-5">
            <p className="store-label text-zinc-500">Saved for later</p>
            <p className="mt-3 max-w-xl text-lg font-semibold leading-7">
              Your prototype queue and supported source connections stay tied to
              this account.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function StoreFooter() {
  return (
    <footer className="border border-zinc-950 bg-zinc-950 text-zinc-50">
      <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
        {footerGroups.map((group) => (
          <div key={group.title} className="bg-zinc-950 p-5">
            <p className="store-label text-rose-200">{group.title}</p>
            <ul className="mt-4 space-y-2">
              {group.links.map((link) => (
                <li key={link}>
                  <a
                    href={group.title === "Sources" ? "/connections" : "#preview-drops"}
                    className="text-sm font-semibold text-zinc-300 transition hover:text-zinc-50"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
  href,
}: {
  eyebrow: string;
  title: string;
  action: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="store-label text-zinc-500">{eyebrow}</p>
        <h2 className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.06em] text-zinc-950 sm:text-5xl">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="hidden border border-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-zinc-950 hover:text-zinc-50 sm:inline-flex"
      >
        {action}
      </Link>
    </div>
  );
}

export function SourceMarketplace({
  currentUser,
  services,
  initialStatuses,
  showHeader = true,
}: SourceMarketplaceProps) {
  const connectedCount = services.filter((service) => initialStatuses[service.id]).length;

  return (
    <section className="store-section">
      {showHeader ? (
        <div className="mb-4 grid gap-4 border border-zinc-950 bg-zinc-50 p-5 text-zinc-950 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="store-label text-zinc-500">Source marketplace</p>
            <h1 className="mt-2 text-5xl font-black uppercase leading-none tracking-[-0.07em] sm:text-6xl">
              Choose future sources for your prototype feed.
            </h1>
          </div>
          <div className="self-end border border-zinc-950 px-4 py-3 text-sm font-black uppercase tracking-[0.14em]">
            {connectedCount}/{services.length} active
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {["Streaming", "Music", "Video", "Live", "Events", "Sports", "Manual"].map(
          (category) => (
            <span
              key={category}
              className="shrink-0 border border-zinc-950 bg-zinc-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-950"
            >
              {category}
            </span>
          ),
        )}
      </div>

      <div className="grid gap-px border border-zinc-950 bg-zinc-950 md:grid-cols-3">
        {services.map((service, index) => {
          const connected = Boolean(initialStatuses[service.id]);
          const isAuthenticated = Boolean(currentUser);
          const ready = service.configured && isAuthenticated;
          const status = serviceStatus(service, currentUser, initialStatuses);
          const merch = providerMerch[service.id];

          return (
            <article
              key={service.id}
              className={`group bg-zinc-50 text-zinc-950 ${
                index === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className={`min-h-52 p-5 ${merch.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="store-label opacity-70">
                      {providerCategory[service.id]}
                    </p>
                    <h2 className="mt-2 text-5xl font-black uppercase leading-none tracking-[-0.07em]">
                      {service.name}
                    </h2>
                  </div>
                  <span className="border border-zinc-950 bg-zinc-50 px-2 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em]">
                    {status}
                  </span>
                </div>
                <p className="mt-8 max-w-sm text-lg font-black uppercase leading-tight tracking-tighter">
                  {merch.headline}
                </p>
              </div>
              <div className="border-t border-zinc-950 p-5">
                <p className="text-sm font-semibold leading-6 text-zinc-700">
                  {merch.detail}
                </p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                  Source state: {connected ? "Connected" : merch.available}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {connected ? (
                    <>
                      <form
                        action={`/api/connections/${service.id}`}
                        method="post"
                        className="contents"
                      >
                        <button type="submit" className={secondaryButtonClassName}>
                          Disconnect
                        </button>
                      </form>
                      <a
                        href={`/api/auth/${service.id}/start`}
                        className={primaryButtonClassName}
                      >
                        Reconnect
                      </a>
                    </>
                  ) : !isAuthenticated ? (
                    <Link href="/#account-access" className={secondaryButtonClassName}>
                      Sign in first
                    </Link>
                  ) : !service.configured ? (
                    <span
                      className={`${secondaryButtonClassName} cursor-not-allowed opacity-60`}
                      aria-disabled="true"
                    >
                      Add keys
                    </span>
                  ) : (
                    <a
                      href={`/api/auth/${service.id}/start`}
                      className={ready ? primaryButtonClassName : secondaryButtonClassName}
                    >
                      Connect
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ConnectionControls(props: SourceMarketplaceProps) {
  return <SourceMarketplace {...props} />;
}

export function AttentionSourcesPanel({
  attentionSources,
}: AttentionSourcesPanelProps) {
  const featured = attentionSources.slice(0, 4);
  const rest = attentionSources.slice(4);

  return (
    <section className="store-section">
      <SectionHeader
        eyebrow="More source racks"
        title="Browse every feed type"
        action="Back to top"
        href="/connections"
      />

      <div className="grid gap-px border border-zinc-950 bg-zinc-950 lg:grid-cols-4">
        {featured.map((source) => (
          <SourceCard key={source.id} source={source} featured />
        ))}
      </div>

      <div className="mt-4 grid gap-px border border-zinc-950 bg-zinc-950 sm:grid-cols-2 xl:grid-cols-3">
        {rest.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>
    </section>
  );
}

function SourceCard({
  source,
  featured = false,
}: {
  source: AttentionSource;
  featured?: boolean;
}) {
  return (
    <article className={`bg-zinc-50 p-5 text-zinc-950 ${featured ? "min-h-72" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="store-label text-zinc-500">{source.category}</p>
          <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-tighter">
            {source.name}
          </h3>
        </div>
        <span
          className={`px-2 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] ${sourceStatusClass(
            source.status,
          )}`}
        >
          {source.statusLabel}
        </span>
      </div>
      <p className="mt-6 text-sm font-semibold leading-6 text-zinc-700">
        {source.summary}
      </p>
      {source.envVars.length > 0 ? (
        <p className="mt-5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-zinc-500">
          {source.envVars.join(" / ")}
        </p>
      ) : null}
    </article>
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-10">
      <div className="space-y-2">
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
              className="font-black underline underline-offset-2"
            >
              open reset screen
            </a>
          </MessageBanner>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryTabs.map((category) => (
          <a
            key={category}
            href={category === "Sources" ? "/connections" : "#preview-drops"}
            className="shrink-0 border border-zinc-950 bg-zinc-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-rose-300"
          >
            {category}
          </a>
        ))}
      </div>

      <TopicColumns
        spotifyTopArtists={spotifyTopArtists}
        youtubeHighlights={youtubeHighlights}
        twitchTopStreams={twitchTopStreams}
      />

      <SourceRail services={services} initialStatuses={initialStatuses} />
      <EditorialCollections />
      <AccountStrip currentUser={currentUser} />
      <StoreFooter />
    </div>
  );
}
