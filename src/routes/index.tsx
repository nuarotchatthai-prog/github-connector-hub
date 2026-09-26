import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Star,
  GitFork,
  CircleDot,
  Lock,
  Globe,
  Archive,
  Search,
  GitBranch,
  ExternalLink,
  Loader2,
  Activity,
  Code2,
  Calendar,
  Eye,
  Scale,
} from "lucide-react";
import {
  listRepos,
  getRepoDetails,
  type RepoSummary,
} from "@/lib/github.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RepoScope — GitHub Repository Dashboard" },
      {
        name: "description",
        content:
          "Browse your GitHub repositories, inspect key details, and follow recent activity in one dashboard.",
      },
      { property: "og:title", content: "RepoScope — GitHub Repository Dashboard" },
      {
        property: "og:description",
        content:
          "Browse your GitHub repositories, inspect key details, and follow recent activity in one dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-sky-400",
  JavaScript: "bg-yellow-300",
  Python: "bg-emerald-400",
  Go: "bg-cyan-400",
  Rust: "bg-orange-400",
  Java: "bg-red-400",
  "C++": "bg-pink-400",
  C: "bg-slate-400",
  Ruby: "bg-rose-400",
  PHP: "bg-violet-400",
  Swift: "bg-amber-400",
  Kotlin: "bg-fuchsia-400",
  HTML: "bg-orange-300",
  CSS: "bg-indigo-300",
  Shell: "bg-lime-400",
};

function langColor(lang: string) {
  return LANG_COLORS[lang] ?? "bg-muted-foreground";
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function Dashboard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RepoSummary | null>(null);

  const reposQuery = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => listRepos(),
  });

  const repos = reposQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q),
    );
  }, [repos, search]);

  const stats = useMemo(() => {
    return {
      total: repos.length,
      stars: repos.reduce((s, r) => s + r.stars, 0),
      forks: repos.reduce((s, r) => s + r.forks, 0),
      issues: repos.reduce((s, r) => s + r.openIssues, 0),
    };
  }, [repos]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">RepoScope</h1>
              <p className="text-xs text-muted-foreground">
                Your GitHub repositories at a glance
              </p>
            </div>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories…"
              className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {reposQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your repositories…
          </div>
        ) : reposQuery.isError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            {(reposQuery.error as Error).message}
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Repositories" value={stats.total} icon={<GitBranch className="h-4 w-4" />} />
              <StatCard label="Total stars" value={stats.stars} icon={<Star className="h-4 w-4" />} />
              <StatCard label="Total forks" value={stats.forks} icon={<GitFork className="h-4 w-4" />} />
              <StatCard label="Open issues" value={stats.issues} icon={<CircleDot className="h-4 w-4" />} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <section>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  {filtered.length} repositor{filtered.length === 1 ? "y" : "ies"}
                </h2>
                <div className="space-y-2">
                  {filtered.map((repo) => (
                    <RepoRow
                      key={repo.id}
                      repo={repo}
                      active={selected?.id === repo.id}
                      onSelect={() => setSelected(repo)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No repositories match your search.
                    </p>
                  )}
                </div>
              </section>

              <aside className="lg:sticky lg:top-20 lg:self-start">
                {selected ? (
                  <RepoDetailPanel
                    key={selected.fullName}
                    repo={selected}
                    onClose={() => setSelected(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                    <Activity className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select a repository to see details
                      <br />
                      and recent activity.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

function RepoRow({
  repo,
  active,
  onSelect,
}: {
  repo: RepoSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-ring",
        active ? "border-ring ring-1 ring-ring" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground">{repo.fullName}</span>
            {repo.isPrivate ? (
              <Badge icon={<Lock className="h-3 w-3" />} label="Private" />
            ) : (
              <Badge icon={<Globe className="h-3 w-3" />} label="Public" />
            )}
            {repo.isArchived && (
              <Badge icon={<Archive className="h-3 w-3" />} label="Archived" />
            )}
          </div>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {repo.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", langColor(repo.language))} />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5" /> {formatNumber(repo.stars)}
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" /> {formatNumber(repo.forks)}
        </span>
        <span className="flex items-center gap-1">
          <CircleDot className="h-3.5 w-3.5" /> {repo.openIssues}
        </span>
        <span className="ml-auto">Updated {timeAgo(repo.pushedAt)}</span>
      </div>
    </button>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function RepoDetailPanel({
  repo,
  onClose,
}: {
  repo: RepoSummary;
  onClose: () => void;
}) {
  const [owner, name] = repo.fullName.split("/");
  const detailsQuery = useQuery({
    queryKey: ["github-repo", owner, name],
    queryFn: () => getRepoDetails({ data: { owner, repo: name } }),
  });

  const details = detailsQuery.data;
  const totalLangBytes = details
    ? Object.values(details.languages).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{repo.fullName}</h3>
          {repo.description && (
            <p className="mt-1 text-sm text-muted-foreground">{repo.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Open on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            ✕
          </button>
        </div>
      </div>

      {detailsQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading details…
        </div>
      ) : detailsQuery.isError ? (
        <p className="p-4 text-sm text-destructive">
          {(detailsQuery.error as Error).message}
        </p>
      ) : details ? (
        <div className="space-y-5 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem icon={<Star className="h-3.5 w-3.5" />} label="Stars" value={formatNumber(details.repo.stars)} />
            <DetailItem icon={<GitFork className="h-3.5 w-3.5" />} label="Forks" value={formatNumber(details.repo.forks)} />
            <DetailItem icon={<Eye className="h-3.5 w-3.5" />} label="Watchers" value={formatNumber(details.repo.watchers)} />
            <DetailItem icon={<CircleDot className="h-3.5 w-3.5" />} label="Open issues" value={String(details.repo.openIssues)} />
            <DetailItem icon={<GitBranch className="h-3.5 w-3.5" />} label="Default branch" value={details.repo.defaultBranch} />
            <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Created" value={new Date(details.repo.createdAt).toLocaleDateString()} />
            {details.repo.license && (
              <DetailItem icon={<Scale className="h-3.5 w-3.5" />} label="License" value={details.repo.license} />
            )}
            <DetailItem icon={<Code2 className="h-3.5 w-3.5" />} label="Size" value={`${formatNumber(Math.round(details.repo.sizeKb / 1024))} MB`} />
          </div>

          {details.repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {details.repo.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {totalLangBytes > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Languages
              </h4>
              <div className="flex h-2 overflow-hidden rounded-full">
                {Object.entries(details.languages).map(([lang, bytes]) => (
                  <div
                    key={lang}
                    className={langColor(lang)}
                    style={{ width: `${(bytes / totalLangBytes) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {Object.entries(details.languages).map(([lang, bytes]) => (
                  <span key={lang} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", langColor(lang))} />
                    {lang} {((bytes / totalLangBytes) * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent activity
            </h4>
            {details.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent public events.</p>
            ) : (
              <ul className="space-y-3">
                {details.events.slice(0, 12).map((e) => (
                  <li key={e.id} className="flex items-start gap-2.5 text-sm">
                    <img
                      src={e.actorAvatar}
                      alt={e.actor}
                      className="mt-0.5 h-6 w-6 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="truncate">
                        <span className="font-medium">{e.actor}</span>{" "}
                        <span className="text-muted-foreground">{e.summary}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(e.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs">{label}:</span>
      <span className="truncate text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
