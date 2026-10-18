import { NextResponse } from "next/server";

interface CreateIssueRequest {
  repoUrlOrSlug: string;
  title: string;
  body: string;
  labels?: string[];
}

export async function POST(request: Request) {
  try {
    const data: CreateIssueRequest = await request.json();
    const { repoUrlOrSlug, title, body, labels = ["architecture", "refactoring", "codecartofy"] } = data;

    const token = process.env.GITHUB_ACCESS_TOKEN?.trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "GitHub Access Token is not configured on the server. Please set GITHUB_ACCESS_TOKEN in .env.local to enable automated issue creation.",
          missingToken: true,
        },
        { status: 500 }
      );
    }

    if (!repoUrlOrSlug) {
      return NextResponse.json(
        { error: "Repository URL or slug is missing (e.g., 'owner/repo')." },
        { status: 400 }
      );
    }

    // Clean owner/repo
    const cleanPath = repoUrlOrSlug.trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/^GitHub:\s*/i, "")
      .replace(/^github:/i, "")
      .replace(/\.git$/, "")
      .replace(/^\//, "");

    const parts = cleanPath.split("/").filter(Boolean);
    if (parts.length < 2) {
      return NextResponse.json(
        { error: `Invalid GitHub repository: '${repoUrlOrSlug}'. Must be in 'owner/repo' format.` },
        { status: 400 }
      );
    }

    const owner = parts[0];
    const repo = parts[1];

    const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;

    const res = await fetch(githubApiUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CodeCartofy-Architectural-Bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.message || `GitHub API error (${res.status}): ${res.statusText}`;

      if (res.status === 404) {
        return NextResponse.json(
          {
            error: `Repository '${owner}/${repo}' not found or your token does not have access permissions. Ensure your token has 'repo' or 'public_repo' scope.`,
          },
          { status: 404 }
        );
      }

      if (res.status === 401 || res.status === 403) {
        if (errMsg.toLowerCase().includes("resource not accessible")) {
          return NextResponse.json(
            {
              error: `Token permission error: Your Fine-Grained Personal Access Token lacks write access to issues. Please edit your token on GitHub, go to 'Repository permissions' -> 'Issues', and select 'Read and write' (or generate a Classic token with 'public_repo' scope).`,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            error: `Authentication failed (${errMsg}). Please check your GITHUB_ACCESS_TOKEN permissions in .env.local.`,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const createdIssue = await res.json();

    return NextResponse.json({
      success: true,
      issueUrl: createdIssue.html_url,
      issueNumber: createdIssue.number,
      title: createdIssue.title,
    });
  } catch (error: unknown) {
    console.error("Create GitHub Issue error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create issue on GitHub.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
