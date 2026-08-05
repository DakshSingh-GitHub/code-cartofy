import { FileInput } from "./types";

export interface GitHubParseResult {
  repoName: string;
  files: FileInput[];
  truncated: boolean;
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

  // 1. Fetch default branch info
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository '${repoSlug}' not found or is private.`);
    }
    if (repoRes.status === 403) {
      throw new Error(`GitHub API rate limit reached. Try again shortly or use local folder upload.`);
    }
    throw new Error(`GitHub API error (${repoRes.status}): ${repoRes.statusText}`);
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || "main";

  // 2. Fetch file tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch file tree for '${repoSlug}'.`);
  }

  const treeData = await treeRes.json();
  const allTreeItems: { path: string; type: string; url: string }[] = treeData.tree || [];

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
