const platforms = [
  "Netflix",
  "Spotify",
  "YouTube",
  "Hulu",
  "Disney+",
  "Max",
  "Apple TV+",
  "Twitch",
  "Prime Video",
  "Custom feeds",
];

const alerts = [
  {
    label: "Important now",
    title: "Big drop detected",
    detail:
      "A creator you follow just released a major YouTube video, and your watchlist show has a new episode live.",
  },
  {
    label: "Coming up",
    title: "Do not miss this week",
    detail:
      "Get early reminders for concert dates, premiere nights, album drops, and limited-run events before they get buried.",
  },
];

const features = [
  {
    title: "One feed for every app",
    description:
      "Pull Netflix, Spotify, YouTube, Hulu, and the rest into a single stream instead of checking each app separately.",
  },
  {
    title: "Only high-signal notifications",
    description:
      "Big uploads, new favorite episodes, surprise drops, and other truly important moments rise to the top immediately.",
  },
  {
    title: "Upcoming entertainment radar",
    description:
      "Track concerts, tours, premieres, and release windows so the next thing you care about is already on your calendar.",
  },
];

const upcoming = [
  { day: "Tue", title: "Favorite show episode", source: "Hulu alert" },
  { day: "Fri", title: "Major artist album release", source: "Spotify alert" },
  { day: "Sat", title: "Arena tour presale opens", source: "Concert tracker" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#050816_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-12">
        <header className="mb-10 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">
              PopHub
            </p>
            <p className="text-sm text-white/60">
              Entertainment, surfaced at the right time
            </p>
          </div>
          <a
            href="#platforms"
            className="rounded-full border border-cyan-300/40 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/10"
          >
            Explore integrations
          </a>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm text-amber-100">
              Built for streaming, music, video, and live events
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
              A single home for everything you want to watch, hear, and catch
              live.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Connect Netflix, Spotify, YouTube, Hulu, and whatever else you
              use. PopHub pulls the important stuff forward so big releases,
              fresh episodes, and upcoming concerts never slip past you.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#alerts"
                className="rounded-full bg-cyan-300 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                See alert examples
              </a>
              <a
                href="#upcoming"
                className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/8"
              >
                View upcoming feed
              </a>
            </div>
          </div>

          <aside
            id="alerts"
            className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 backdrop-blur"
          >
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-200/70">
              Priority alerts
            </p>
            {alerts.map((alert) => (
              <article
                key={alert.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-200/75">
                  {alert.label}
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{alert.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {alert.detail}
                </p>
              </article>
            ))}
          </aside>
        </section>

        <section
          id="platforms"
          className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-200/70">
                Connect your stack
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Every major entertainment app in one place
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Start with the obvious services, then let people plug in whatever
              else matters to them.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <div
                key={platform}
                className="rounded-full border border-white/12 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-100"
              >
                {platform}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <h3 className="text-2xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        <section
          id="upcoming"
          className="mt-10 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/8 p-8"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-100/80">
                Upcoming
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                A feed for what is about to matter next
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-cyan-50/80">
              Not just what is live right now. The page also tees up concerts,
              premieres, and countdown-worthy drops before they happen.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {upcoming.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-slate-950/65 p-5"
              >
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/70">
                  {item.day}
                </p>
                <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.source}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
