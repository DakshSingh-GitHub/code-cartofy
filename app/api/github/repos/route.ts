import { NextRequest, NextResponse } from "next/server";

interface CacheEntry {
  timestamp: number;
  data: any;
}

const reposCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getEffectiveToken(req: NextRequest): string | null {
  const customHeader = req.headers.get("x-github-token");
  if (customHeader && customHeader.trim()) {
    return customHeader.trim();
  }
  return (
    process.env.GITHUB_ACCESS_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_GITHUB_TOKEN?.trim() ||
    null
  );
}

function getPitchFallbackRepos(username: string) {
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
      isDemo: true,
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
      isDemo: true,
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
      isDemo: true,
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
      isDemo: true,
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
      isDemo: true,
    },
  ];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username") || "";
  const username = rawUsername.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const cacheKey = username.toLowerCase();
  const cached = reposCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const token = getEffectiveToken(req);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CodeCartofy-App",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&type=public`,
      { headers }
    );

    if (res.ok) {
      const rawList = await res.json();
      if (!Array.isArray(rawList)) {
        return NextResponse.json([]);
      }

      const repos = rawList.map((r: any) => ({
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

      reposCache.set(cacheKey, { timestamp: Date.now(), data: repos });
      return NextResponse.json(repos);
    }

    if (res.status === 403) {
      console.warn(`GitHub repos fetch 403 rate limit for ${username}. Falling back to demo repositories.`);
      const fallback = getPitchFallbackRepos(username);
      return NextResponse.json(fallback, {
        headers: { "X-RateLimit-Fallback": "true" },
      });
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: `User '${username}' not found on GitHub.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `GitHub API error (${res.status}): ${res.statusText}` },
      { status: res.status }
    );
  } catch (err: unknown) {
    console.warn("Network error contacting GitHub:", err);
    const fallback = getPitchFallbackRepos(username);
    return NextResponse.json(fallback, {
      headers: { "X-Network-Fallback": "true" },
    });
  }
}

