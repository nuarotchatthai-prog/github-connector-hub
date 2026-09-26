import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";

async function githubFetch(path: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const githubKey = process.env["GITHUB_API_KEY"];
  if (!lovableKey || !githubKey) {
    throw new Error("GitHub connection is not configured for this project.");
  }
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": githubKey,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub request failed [${response.status}]: ${body}`);
  }
  return response.json();
}

export interface RepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  updatedAt: string;
  pushedAt: string;
  url: string;
  defaultBranch: string;
  topics: string[];
  ownerAvatar: string;
}

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  updated_at: string;
  pushed_at: string;
  html_url: string;
  default_branch: string;
  topics?: string[];
  owner: { avatar_url: string };
}

function mapRepo(r: RawRepo): RepoSummary {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    isPrivate: r.private,
    isFork: r.fork,
    isArchived: r.archived,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    url: r.html_url,
    defaultBranch: r.default_branch,
    topics: r.topics ?? [],
    ownerAvatar: r.owner.avatar_url,
  };
}

export const listRepos = createServerFn({ method: "GET" }).handler(
  async (): Promise<RepoSummary[]> => {
    const repos = (await githubFetch(
      "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member",
    )) as RawRepo[];
    return repos.map(mapRepo);
  },
);

export interface RepoEvent {
  id: string;
  type: string;
  actor: string;
  actorAvatar: string;
  createdAt: string;
  summary: string;
}

interface RawEvent {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  created_at: string;
  payload: Record<string, unknown>;
}

function summarizeEvent(e: RawEvent): string {
  const p = e.payload as Record<string, any>;
  switch (e.type) {
    case "PushEvent": {
      const commits = Array.isArray(p.commits) ? p.commits.length : 0;
      const branch = typeof p.ref === "string" ? p.ref.replace("refs/heads/", "") : "";
      return `Pushed ${commits} commit${commits === 1 ? "" : "s"} to ${branch}`;
    }
    case "PullRequestEvent":
      return `${p.action} pull request #${p.pull_request?.number ?? "?"}: ${p.pull_request?.title ?? ""}`;
    case "IssuesEvent":
      return `${p.action} issue #${p.issue?.number ?? "?"}: ${p.issue?.title ?? ""}`;
    case "IssueCommentEvent":
      return `Commented on issue #${p.issue?.number ?? "?"}`;
    case "CreateEvent":
      return `Created ${p.ref_type}${p.ref ? ` ${p.ref}` : ""}`;
    case "DeleteEvent":
      return `Deleted ${p.ref_type} ${p.ref ?? ""}`;
    case "ReleaseEvent":
      return `Published release ${p.release?.tag_name ?? ""}`;
    case "ForkEvent":
      return "Forked the repository";
    case "WatchEvent":
      return "Starred the repository";
    case "PullRequestReviewEvent":
      return `Reviewed pull request #${p.pull_request?.number ?? "?"}`;
    default:
      return e.type.replace(/Event$/, "");
  }
}

export interface RepoDetails {
  repo: RepoSummary & {
    createdAt: string;
    homepage: string | null;
    license: string | null;
    sizeKb: number;
    watchers: number;
  };
  languages: Record<string, number>;
  events: RepoEvent[];
}

export const getRepoDetails = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ owner: z.string(), repo: z.string() }).parse(data),
  )
  .handler(async ({ data }): Promise<RepoDetails> => {
    const [repoRaw, languages, eventsRaw] = await Promise.all([
      githubFetch(`/repos/${data.owner}/${data.repo}`) as Promise<RawRepo & {
        created_at: string;
        homepage: string | null;
        license: { spdx_id: string } | null;
        size: number;
        watchers_count: number;
      }>,
      githubFetch(`/repos/${data.owner}/${data.repo}/languages`) as Promise<
        Record<string, number>
      >,
      githubFetch(`/repos/${data.owner}/${data.repo}/events?per_page=20`) as Promise<
        RawEvent[]
      >,
    ]);

    return {
      repo: {
        ...mapRepo(repoRaw),
        createdAt: repoRaw.created_at,
        homepage: repoRaw.homepage || null,
        license: repoRaw.license?.spdx_id ?? null,
        sizeKb: repoRaw.size,
        watchers: repoRaw.watchers_count,
      },
      languages,
      events: eventsRaw.map((e) => ({
        id: e.id,
        type: e.type,
        actor: e.actor.login,
        actorAvatar: e.actor.avatar_url,
        createdAt: e.created_at,
        summary: summarizeEvent(e),
      })),
    };
  });
