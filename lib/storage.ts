import { FileInput } from "./types";
import { UserSession, getClientSession } from "./auth";
import { SAMPLE_REPOSITORIES } from "./sampleRepositories";
import { fetchGitHubRepository } from "./githubFetcher";
import {
  saveUserRepoToSupabase,
  fetchUserReposFromSupabase,
  deleteUserRepoFromSupabase,
} from "./supabase";

export interface StoredRepo {
  id: string;
  name: string;
  type: "github" | "upload" | "sample";
  githubUrl?: string;
  files: FileInput[];
  timestamp: number;
  fileCount: number;
}

const DEFAULT_STORAGE_KEY = "cartofy_recent_repos";
const ACTIVE_REPO_KEY = "cartofy_active_repo_id";
const MAX_RECENTS = 10;

/**
 * Get account-specific storage key to isolate repositories per user
 */
export function getStorageKeyForUser(user?: UserSession | null): string {
  const currentSession = user !== undefined ? user : getClientSession();

  if (!currentSession) {
    return `${DEFAULT_STORAGE_KEY}_guest`;
  }

  const accountId =
    currentSession.username ||
    currentSession.id ||
    currentSession.email ||
    "guest";

  const cleanKey = accountId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `${DEFAULT_STORAGE_KEY}_${cleanKey}`;
}

/**
 * Ensure 100% full un-truncated source code files are loaded for AST import parsing and graph links.
 */
export async function ensureFullRepoFiles(
  repo: StoredRepo,
  user?: UserSession | null
): Promise<FileInput[]> {
  if (!repo) return [];

  // 1. Check if repo.files already has full valid non-empty code strings
  const hasFullCode =
    repo.files &&
    repo.files.length > 0 &&
    repo.files.some((f) => f.code && f.code.trim().length > 30);

  if (hasFullCode) {
    return repo.files;
  }

  // 2. If sample repository, restore full files from SAMPLE_REPOSITORIES
  if (repo.type === "sample") {
    const foundSample = SAMPLE_REPOSITORIES.find(
      (s) => s.id === repo.id || s.name === repo.name
    );
    if (foundSample && foundSample.files) {
      return foundSample.files;
    }
  }

  // 3. Check active payload cache in LocalStorage
  if (typeof window !== "undefined") {
    const storageKey = getStorageKeyForUser(user);
    try {
      const activePayloadRaw = localStorage.getItem(`cartofy_full_payload_${storageKey}_${repo.id}`);
      if (activePayloadRaw) {
        const parsedFiles = JSON.parse(activePayloadRaw) as FileInput[];
        if (parsedFiles && parsedFiles.length > 0 && parsedFiles.some((f) => f.code && f.code.trim().length > 30)) {
          return parsedFiles;
        }
      }
    } catch {}
  }

  // 4. Fetch full payload from Supabase `user_repositories` database table
  const activeUser = user !== undefined ? user : getClientSession();
  if (activeUser) {
    try {
      const remoteRepos = await fetchUserReposFromSupabase(activeUser);
      const matched = remoteRepos.find(
        (r) => r.repo_id === repo.id || r.repo_name === repo.name
      );
      if (matched && matched.files && matched.files.some((f) => f.code && f.code.trim().length > 30)) {
        return matched.files;
      }
    } catch (e) {
      console.warn("Supabase full payload fetch error:", e);
    }
  }

  // 5. If GitHub repo, re-fetch full repository from GitHub API
  if (repo.type === "github" || repo.githubUrl) {
    const urlToFetch = repo.githubUrl || repo.name.replace("GitHub: ", "");
    try {
      const result = await fetchGitHubRepository(urlToFetch);
      if (result.files && result.files.length > 0) {
        return result.files;
      }
    } catch (e) {
      console.warn("GitHub API re-fetch error:", e);
    }
  }

  return repo.files || [];
}

/**
 * Safely persist repository recents to LocalStorage without corrupting AST source code
 */
function safeSetLocalStorage(
  storageKey: string,
  dataList: StoredRepo[],
  activeId: string
): void {
  if (typeof window === "undefined") return;

  const activeEntry = dataList.find((r) => r.id === activeId) || dataList[0];

  // Store full active files payload in a dedicated key for local caching
  if (activeEntry && activeEntry.files && activeEntry.files.length > 0) {
    try {
      localStorage.setItem(
        `cartofy_full_payload_${storageKey}_${activeEntry.id}`,
        JSON.stringify(activeEntry.files)
      );
    } catch {}
  }

  // Tier 1: Save recents list directly
  try {
    localStorage.setItem(storageKey, JSON.stringify(dataList));
    localStorage.setItem(`${ACTIVE_REPO_KEY}_${storageKey}`, activeId);
    return;
  } catch (quotaErr) {
    console.warn("LocalStorage limit reached. Preserving metadata recents list...", quotaErr);
  }

  // Tier 2: Metadata list for older recents (active repo keeps full files; recents rely on Supabase/re-fetch)
  try {
    const metadataList = dataList.map((item) => {
      if (item.id === activeId) return item;
      return {
        ...item,
        files: item.files.map((f) => ({ path: f.path, code: "" })),
      };
    });
    localStorage.setItem(storageKey, JSON.stringify(metadataList));
    localStorage.setItem(`${ACTIVE_REPO_KEY}_${storageKey}`, activeId);
  } catch (err) {
    console.warn("Unable to save recents to LocalStorage due to browser storage policy.", err);
  }
}

/**
 * Safely fetch recent repositories for the active user account from localStorage
 */
export function getRecentRepos(user?: UserSession | null): StoredRepo[] {
  if (typeof window === "undefined") return [];

  const key = getStorageKeyForUser(user);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredRepo[];
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error(`Failed to parse recent repos for key ${key} from localStorage:`, err);
    return [];
  }
}

/**
 * Save or update a repository for the active user account in LocalStorage
 * AND sync graph data payload to Supabase database table `user_repositories`.
 */
export function saveRepoToRecents(
  data: {
    id: string;
    name: string;
    type: "github" | "upload" | "sample";
    githubUrl?: string;
    files: FileInput[];
  },
  user?: UserSession | null
): StoredRepo[] {
  if (typeof window === "undefined") return [];

  const activeUser = user !== undefined ? user : getClientSession();
  const storageKey = getStorageKeyForUser(activeUser);
  const existingList = getRecentRepos(activeUser);
  const now = Date.now();

  // Normalize ID / GitHub URL for deduplication check
  const cleanId = data.id.toLowerCase().trim();
  const cleanGithubUrl = data.githubUrl ? data.githubUrl.toLowerCase().trim() : null;

  // Find existing index by ID or GitHub URL
  const existingIdx = existingList.findIndex((item) => {
    if (item.id.toLowerCase().trim() === cleanId) return true;
    if (cleanGithubUrl && item.githubUrl && item.githubUrl.toLowerCase().trim() === cleanGithubUrl) {
      return true;
    }
    return false;
  });

  const updatedEntry: StoredRepo = {
    id: data.id,
    name: data.name,
    type: data.type,
    githubUrl: data.githubUrl,
    files: data.files,
    timestamp: now,
    fileCount: data.files.length,
  };

  let newList: StoredRepo[];

  if (existingIdx !== -1) {
    newList = [...existingList];
    newList[existingIdx] = updatedEntry;
  } else {
    newList = [updatedEntry, ...existingList];
  }

  // Cap at MAX_RECENTS
  if (newList.length > MAX_RECENTS) {
    newList = newList.slice(0, MAX_RECENTS);
  }

  // 1. Persist safely to account-scoped LocalStorage
  safeSetLocalStorage(storageKey, newList, data.id);

  // 2. Sync graph data asynchronously to Supabase `user_repositories` table
  if (activeUser && activeUser.email !== "guest@cartofy.io") {
    saveUserRepoToSupabase(activeUser, updatedEntry).catch((e) =>
      console.warn("Supabase repo sync failed:", e)
    );
  }

  return getRecentRepos(activeUser);
}

/**
 * Fetch repositories from Supabase `user_repositories` table for the user account
 * and sync them into LocalStorage.
 */
export async function syncUserReposWithSupabase(
  user?: UserSession | null
): Promise<StoredRepo[]> {
  const activeUser = user !== undefined ? user : getClientSession();
  if (!activeUser || typeof window === "undefined") return getRecentRepos(activeUser);

  try {
    const remoteRepos = await fetchUserReposFromSupabase(activeUser);
    if (!remoteRepos || remoteRepos.length === 0) {
      return getRecentRepos(activeUser);
    }

    const localRepos = getRecentRepos(activeUser);
    const mergedMap = new Map<string, StoredRepo>();

    // Add local repos first
    localRepos.forEach((r) => mergedMap.set(r.id.toLowerCase(), r));

    // Upsert remote repos from Supabase
    remoteRepos.forEach((r) => {
      const formatted: StoredRepo = {
        id: r.repo_id,
        name: r.repo_name,
        type: r.type,
        githubUrl: r.github_url,
        files: r.files || [],
        timestamp: r.timestamp || Date.now(),
        fileCount: r.file_count || (r.files ? r.files.length : 0),
      };
      const existing = mergedMap.get(r.repo_id.toLowerCase());
      if (!existing || (r.timestamp && r.timestamp > existing.timestamp)) {
        mergedMap.set(r.repo_id.toLowerCase(), formatted);
      }
    });

    const combinedList = Array.from(mergedMap.values()).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    const storageKey = getStorageKeyForUser(activeUser);
    const activeId = combinedList.length > 0 ? combinedList[0].id : "";
    safeSetLocalStorage(storageKey, combinedList.slice(0, MAX_RECENTS), activeId);

    return getRecentRepos(activeUser);
  } catch (err) {
    console.error("Error syncing user repos with Supabase:", err);
    return getRecentRepos(activeUser);
  }
}

/**
 * Get active repo ID for user account from localStorage
 */
export function getActiveRepoId(user?: UserSession | null): string | null {
  if (typeof window === "undefined") return null;
  const storageKey = getStorageKeyForUser(user);
  return localStorage.getItem(`${ACTIVE_REPO_KEY}_${storageKey}`);
}

/**
 * Set active repo ID for user account
 */
export function setActiveRepoId(id: string, user?: UserSession | null): void {
  if (typeof window === "undefined") return;
  const storageKey = getStorageKeyForUser(user);
  localStorage.setItem(`${ACTIVE_REPO_KEY}_${storageKey}`, id);
}

/**
 * Retrieve a specific stored repo by ID for current account
 */
export function getStoredRepoById(
  id: string,
  user?: UserSession | null
): StoredRepo | null {
  const recents = getRecentRepos(user);
  return recents.find((r) => r.id === id || r.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Remove a repo from account's Recents list and Supabase table
 */
export function removeRecentRepo(
  id: string,
  user?: UserSession | null
): StoredRepo[] {
  if (typeof window === "undefined") return [];

  const activeUser = user !== undefined ? user : getClientSession();
  const storageKey = getStorageKeyForUser(activeUser);
  const existing = getRecentRepos(activeUser);
  const filtered = existing.filter((item) => item.id !== id);

  safeSetLocalStorage(storageKey, filtered, "");

  if (activeUser) {
    deleteUserRepoFromSupabase(activeUser, id).catch((e) =>
      console.warn("Supabase repo deletion failed:", e)
    );
  }

  return filtered;
}

/**
 * Clear all stored recents for user account
 */
export function clearAllRecents(user?: UserSession | null): void {
  if (typeof window === "undefined") return;
  const storageKey = getStorageKeyForUser(user);
  try {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${ACTIVE_REPO_KEY}_${storageKey}`);
  } catch (err) {
    console.error("Failed to clear recents:", err);
  }
}
