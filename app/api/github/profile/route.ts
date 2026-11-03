import { NextRequest, NextResponse } from "next/server";

interface CacheEntry {
  timestamp: number;
  data: any;
}

const profileCache = new Map<string, CacheEntry>();
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username") || "";
  const username = rawUsername.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const cacheKey = username.toLowerCase();
  const cached = profileCache.get(cacheKey);
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
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      const profile = {
        login: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
        bio: data.bio || null,
        publicRepos: data.public_repos || 0,
        htmlUrl: data.html_url,
        isFallback: false,
      };

      profileCache.set(cacheKey, { timestamp: Date.now(), data: profile });
      return NextResponse.json(profile);
    }

    // Rate limited or error handling
    if (res.status === 403) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      console.warn(`GitHub profile fetch 403 rate limit for ${username}. Remaining: ${remaining}`);

      // Fail-safe fallback profile so hackathon pitches don't crash
      const fallbackProfile = {
        login: username,
        name: username,
        avatarUrl: `https://github.com/${username}.png`,
        bio: "GitHub Developer",
        publicRepos: 10,
        htmlUrl: `https://github.com/${username}`,
        isFallback: true,
        rateLimited: true,
      };

      return NextResponse.json(fallbackProfile);
    }

    if (res.status === 404) {
      return NextResponse.json(
        { error: `GitHub user '${username}' was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `GitHub API error (${res.status}): ${res.statusText}` },
      { status: res.status }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error contacting GitHub";
    // Emergency pitch fallback in case of no connection to GitHub API
    return NextResponse.json({
      login: username,
      name: username,
      avatarUrl: `https://github.com/${username}.png`,
      bio: "GitHub Developer",
      publicRepos: 10,
      htmlUrl: `https://github.com/${username}`,
      isFallback: true,
      notice: msg,
    });
  }
}

