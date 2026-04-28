"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Discover" },
  { href: "/connections", label: "Sources" },
];

const categories = [
  "Watch",
  "Listen",
  "Creators",
  "Concerts",
  "Sports",
  "Live",
  "For You",
];

function isActiveTab(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-950 bg-zinc-50 text-zinc-950">
      <div className="bg-zinc-950 px-4 py-2 text-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-50">
        Early Pophub prototype: preview drops, plan queues, connect supported sources
      </div>

      <nav aria-label="Primary" className="border-b border-zinc-950">
        <div className="mx-auto grid w-full max-w-7xl gap-px bg-zinc-950 lg:grid-cols-[auto_minmax(18rem,1fr)_auto]">
          <Link
            href="/"
            className="bg-zinc-50 px-4 py-4 text-3xl font-black uppercase leading-none tracking-[-0.08em] transition hover:bg-rose-200 sm:px-6"
          >
            PopHub
          </Link>

          <div className="bg-zinc-50 px-4 py-3 sm:px-6">
            <div className="flex min-h-11 items-center border border-zinc-950 bg-white px-3">
              <span className="mr-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                Search
              </span>
              <span className="truncate text-sm font-semibold text-zinc-500">
                shows, albums, creators, event reminders
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-zinc-950">
            {tabs.map((tab) => {
              const isActive = isActiveTab(pathname, tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-16 items-center justify-center bg-zinc-50 px-5 text-xs font-black uppercase tracking-[0.16em] transition ${
                    isActive
                      ? "bg-rose-300 text-zinc-950"
                      : "hover:bg-zinc-200"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <nav aria-label="Categories" className="overflow-x-auto bg-zinc-50">
        <div className="mx-auto flex w-full max-w-7xl">
          {categories.map((category) => (
            <a
              key={category}
              href={category === "Sources" ? "/connections" : "/#preview-drops"}
              className="shrink-0 border-r border-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-rose-200"
            >
              {category}
            </a>
          ))}
          <Link
            href="/connections"
            className="ml-auto shrink-0 border-l border-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-amber-300"
          >
            Connect
          </Link>
        </div>
      </nav>
    </header>
  );
}
