import { NextRequest, NextResponse } from "next/server";

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
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and repo are required." }, { status: 400 });
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
    // 1. Fetch repo info (to get default branch)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return NextResponse.json({ error: `Repository '${owner}/${repo}' not found or is private.` }, { status: 404 });
      }
      if (repoRes.status === 403) {
        return NextResponse.json({ error: "GitHub API rate limit reached. Please wait a few moments or provide a token." }, { status: 403 });
      }
      return NextResponse.json({ error: `GitHub API error (${repoRes.status}): ${repoRes.statusText}` }, { status: repoRes.status });
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    // 2. Fetch git tree recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      return NextResponse.json({ error: `Failed to fetch file tree for '${owner}/${repo}'.` }, { status: treeRes.status });
    }

    const treeData = await treeRes.json();
    return NextResponse.json({
      defaultBranch,
      tree: treeData.tree || [],
      truncated: Boolean(treeData.truncated),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch repository tree";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

