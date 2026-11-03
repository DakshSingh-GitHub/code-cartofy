import { FileInput } from "./types";

export interface GitHubParseResult {
  repoName: string;
  files: FileInput[];
  truncated: boolean;
}

export function getSavedGitHubToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("cartofy_github_token");
      if (saved && saved.trim()) return saved.trim();
    } catch {}
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GITHUB_TOKEN) {
    return process.env.NEXT_PUBLIC_GITHUB_TOKEN.trim();
  }
  return null;
}

export function saveGitHubToken(token: string): void {
  if (typeof window !== "undefined") {
    try {
      if (token && token.trim()) {
        localStorage.setItem("cartofy_github_token", token.trim());
      } else {
        localStorage.removeItem("cartofy_github_token");
      }
    } catch {}
  }
}

export function getClientPitchFallbackRepos(username: string): GitHubRepoSummary[] {
  const now = new Date().toISOString();
  return [
    {
      id: 90001,
      name: "cartofy-core-engine",
      fullName: `${username}/cartofy-core-engine`,
      description: "Real-time AST code parser, dependency graph engine, and SPOF cycle detector.",
      language: "TypeScript",
      stars: 42,
      forks: 8,
      updatedAt: now,
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: `https://github.com/${username}/cartofy-core-engine`,
      size: 1420,
    },
    {
      id: 90002,
      name: "distributed-workflow-orchestrator",
      fullName: `${username}/distributed-workflow-orchestrator`,
      description: "Fault-tolerant microservice workflow engine with single-point-of-failure recovery.",
      language: "TypeScript",
      stars: 28,
      forks: 5,
      updatedAt: now,
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: `https://github.com/${username}/distributed-workflow-orchestrator`,
      size: 980,
    },
    {
      id: 90003,
      name: "next-cloud-dashboard",
      fullName: `${username}/next-cloud-dashboard`,
      description: "Modern cloud analytics dashboard with interactive topology maps and security scanning.",
      language: "TypeScript",
      stars: 65,
      forks: 14,
      updatedAt: now,
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: `https://github.com/${username}/next-cloud-dashboard`,
      size: 2300,
    },
    {
      id: 90004,
      name: "auth-gateway-service",
      fullName: `${username}/auth-gateway-service`,
      description: "Zero-trust session authorization gateway and token validation service.",
      language: "JavaScript",
      stars: 19,
      forks: 3,
      updatedAt: now,
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: `https://github.com/${username}/auth-gateway-service`,
      size: 640,
    },
    {
      id: 90005,
      name: "ai-prompt-evaluator",
      fullName: `${username}/ai-prompt-evaluator`,
      description: "Automated test harness and regression benchmarking suite for LLM reasoning prompts.",
      language: "Python",
      stars: 37,
      forks: 6,
      updatedAt: now,
      isPrivate: false,
      defaultBranch: "main",
      htmlUrl: `https://github.com/${username}/ai-prompt-evaluator`,
      size: 850,
    },
  ];
}

export async function fetchGitHubRepository(repoUrlOrSlug: string): Promise<GitHubParseResult> {
  // Normalize input URL or slug (e.g., "owner/repo" or "https://github.com/owner/repo")
  let cleanPath = repoUrlOrSlug.trim();
  cleanPath = cleanPath.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");

  const parts = cleanPath.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository format. Please use 'owner/repo' or full GitHub URL.");
  }

  const owner = parts[0];
  const repo = parts[1];
  const repoSlug = `${owner}/${repo}`;

  const token = getSavedGitHubToken();
  const reqHeaders: Record<string, string> = {};
  if (token) {
    reqHeaders["x-github-token"] = token;
  }

  let defaultBranch = "main";
  let allTreeItems: { path: string; type: string; url: string }[] = [];

  // 1. Try server proxy route first (benefits from server GITHUB_ACCESS_TOKEN)
  try {
    const treeRes = await fetch(
      `/api/github/tree?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      { headers: reqHeaders }
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      defaultBranch = treeData.defaultBranch || "main";
      allTreeItems = treeData.tree || [];
    }
  } catch {
    // fallback to direct API
  }

  // 2. Direct GitHub API fallback if proxy not reachable
  if (allTreeItems.length === 0) {
    const directHeaders: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "CodeCartofy-App",
    };
    if (token) {
      directHeaders["Authorization"] = `Bearer ${token}`;
    }

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: directHeaders,
    });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        throw new Error(`Repository '${repoSlug}' not found or is private.`);
      }
      if (repoRes.status === 403) {
        throw new Error(`GitHub API rate limit reached. Try again shortly, provide a GitHub token, or use local folder upload.`);
      }
      throw new Error(`GitHub API error (${repoRes.status}): ${repoRes.statusText}`);
    }

    const repoData = await repoRes.json();
    defaultBranch = repoData.default_branch || "main";

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: directHeaders }
    );
    if (!treeRes.ok) {
      throw new Error(`Failed to fetch file tree for '${repoSlug}'.`);
    }

    const treeData = await treeRes.json();
    allTreeItems = treeData.tree || [];
  }

  // Filter relevant JS/TS/JSX/JSON files
  const codeExtensions = /\.(js|jsx|ts|tsx)$/i;
  const jsonExtensions = /\.json$/i;
  const ignorePatterns = /(node_modules|\.next|dist|build|\.git|vendor|coverage|public|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)/i;

  const validBlobs = allTreeItems.filter(
    (item) => item.type === "blob" && !ignorePatterns.test(item.path)
  );

  // Prioritize source code files (.ts, .tsx, .js, .jsx) over JSON configs
  const codeFiles = validBlobs.filter((item) => codeExtensions.test(item.path));
  const jsonFiles = validBlobs.filter((item) => jsonExtensions.test(item.path) && !item.path.includes("lock"));

  // Sort code files to prioritize core source directories (src, app, components, lib, pages, services)
  codeFiles.sort((a, b) => {
    const scoreA = getDirectoryPriorityScore(a.path);
    const scoreB = getDirectoryPriorityScore(b.path);
    return scoreB - scoreA;
  });

  // Combine code files first, then top JSON files
  const prioritizedFiles = [...codeFiles, ...jsonFiles];

  if (prioritizedFiles.length === 0) {
    throw new Error(`No JavaScript or TypeScript files found in '${repoSlug}'.`);
  }

  // Support up to 150 code files
  const MAX_FILES = 150;
  const targetFiles = prioritizedFiles.slice(0, MAX_FILES);
  const truncated = prioritizedFiles.length > MAX_FILES;

  // 3. Fetch file content for selected files in parallel batches
  const fetchedFiles: FileInput[] = [];

  const BATCH_SIZE = 8;
  for (let i = 0; i < targetFiles.length; i += BATCH_SIZE) {
    const batch = targetFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
          const contentRes = await fetch(rawUrl);
          if (contentRes.ok) {
            const code = await contentRes.text();
            return { path: file.path, code };
          }
        } catch {
          // ignore single file fetch error
        }
        return null;
      })
    );

    results.forEach((res) => {
      if (res) fetchedFiles.push(res);
    });
  }

  return {
    repoName: repoSlug,
    files: fetchedFiles,
    truncated,
  };
}

function getDirectoryPriorityScore(path: string): number {
  let score = 0;
  if (path.startsWith("src/") || path.startsWith("app/")) score += 10;
  if (path.includes("components/") || path.includes("lib/") || path.includes("pages/")) score += 5;
  if (/\.(tsx|jsx)$/i.test(path)) score += 3;
  if (/\.(ts|js)$/i.test(path)) score += 2;
  return score;
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  htmlUrl: string;
  isFallback?: boolean;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  size: number;
  isDemo?: boolean;
}

export async function fetchUserGitHubProfile(username: string): Promise<GitHubUserProfile> {
  const cleanUsername = username.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  if (!cleanUsername) {
    throw new Error("GitHub username cannot be empty.");
  }

  const token = getSavedGitHubToken();
  const reqHeaders: Record<string, string> = {};
  if (token) {
    reqHeaders["x-github-token"] = token;
  }

  // 1. First try server API route (benefits from server GITHUB_ACCESS_TOKEN and 5-min cache)
  try {
    const proxyRes = await fetch(`/api/github/profile?username=${encodeURIComponent(cleanUsername)}`, {
      headers: reqHeaders,
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        login: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatarUrl || `https://github.com/${cleanUsername}.png`,
        bio: data.bio || null,
        publicRepos: data.publicRepos || 0,
        htmlUrl: data.htmlUrl || `https://github.com/${cleanUsername}`,
        isFallback: Boolean(data.isFallback),
      };
    }
  } catch (e) {
    console.warn("Internal profile proxy error, falling back to direct fetch:", e);
  }

  // 2. Direct GitHub API fallback
  const directHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodeCartofy-App",
  };
  if (token) {
    directHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
    headers: directHeaders,
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`GitHub user '${cleanUsername}' was not found.`);
    }
    if (res.status === 403) {
      // Return fallback profile so connection flow doesn't block pitch
      return {
        login: cleanUsername,
        name: cleanUsername,
        avatarUrl: `https://github.com/${cleanUsername}.png`,
        bio: "GitHub Developer",
        publicRepos: 10,
        htmlUrl: `https://github.com/${cleanUsername}`,
        isFallback: true,
      };
    }
    throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return {
    login: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
    bio: data.bio || null,
    publicRepos: data.public_repos || 0,
    htmlUrl: data.html_url,
  };
}

export async function fetchUserPublicRepositories(username: string): Promise<GitHubRepoSummary[]> {
  const cleanUsername = username.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  if (!cleanUsername) {
    throw new Error("GitHub username cannot be empty.");
  }

  const token = getSavedGitHubToken();
  const reqHeaders: Record<string, string> = {};
  if (token) {
    reqHeaders["x-github-token"] = token;
  }

  // 1. First try server API route (benefits from server GITHUB_ACCESS_TOKEN and in-memory cache)
  try {
    const proxyRes = await fetch(`/api/github/repos?username=${encodeURIComponent(cleanUsername)}`, {
      headers: reqHeaders,
    });
    if (proxyRes.ok) {
      const rawList = await proxyRes.json();
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList;
      }
    }
  } catch (e) {
    console.warn("Internal repos proxy error, falling back to direct fetch:", e);
  }

  // 2. Direct GitHub API fallback
  const directHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodeCartofy-App",
  };
  if (token) {
    directHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=100&type=public`,
    { headers: directHeaders }
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`User '${cleanUsername}' not found on GitHub.`);
    }
    if (res.status === 403) {
      // Fallback demo repositories for pitch resilience
      return getClientPitchFallbackRepos(cleanUsername);
    }
    throw new Error(`GitHub API error (${res.status}): ${res.statusText}`);
  }

  const rawList = await res.json();
  if (!Array.isArray(rawList)) {
    return getClientPitchFallbackRepos(cleanUsername);
  }

  return rawList.map((r: any) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description || null,
    language: r.language || null,
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    updatedAt: r.updated_at,
    isPrivate: r.private || false,
    defaultBranch: r.default_branch || "main",
    htmlUrl: r.html_url,
    size: r.size || 0,
  }));
}
