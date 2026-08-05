import { FileInput } from "./types";

export interface StoredRepo {
  id: string;
  name: string;
  type: "github" | "upload" | "sample";
  githubUrl?: string;
  files: FileInput[];
  timestamp: number;
  fileCount: number;
}

const STORAGE_KEY = "cartofy_recent_repos";
const ACTIVE_REPO_KEY = "cartofy_active_repo_id";
const MAX_RECENTS = 10;

/**
 * Safely fetch recent repositories from localStorage sorted by timestamp (descending)
 */
export function getRecentRepos(): StoredRepo[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredRepo[];
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error("Failed to parse recent repos from localStorage:", err);
    return [];
  }
}

/**
 * Save or update a repository in Recents list with automatic deduplication
 */
export function saveRepoToRecents(data: {
  id: string;
  name: string;
  type: "github" | "upload" | "sample";
  githubUrl?: string;
  files: FileInput[];
}): StoredRepo[] {
  if (typeof window === "undefined") return [];

  const existingList = getRecentRepos();
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
    // Update existing record in place and bump timestamp
    newList = [...existingList];
    newList[existingIdx] = updatedEntry;
  } else {
    // Insert new record at top
    newList = [updatedEntry, ...existingList];
  }

  // Cap at MAX_RECENTS
  if (newList.length > MAX_RECENTS) {
    newList = newList.slice(0, MAX_RECENTS);
  }

  // Persist to localStorage with QuotaExceeded fallback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    localStorage.setItem(ACTIVE_REPO_KEY, data.id);
  } catch (err: unknown) {
    console.warn("LocalStorage quota warning when saving repo. Pruning older files...", err);
    try {
      // Emergency quota fallback: prune code content of non-active entries if payload exceeds browser quota
      const prunedList = newList.map((item, idx) => {
        if (idx === 0) return item; // Keep full code for active repo
        return {
          ...item,
          files: item.files.map((f) => ({ path: f.path, code: f.code.slice(0, 500) })),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prunedList));
      localStorage.setItem(ACTIVE_REPO_KEY, data.id);
    } catch {
      console.error("Critical localStorage quota exceeded.");
    }
  }

  return getRecentRepos();
}

/**
 * Get active repo ID from localStorage
 */
export function getActiveRepoId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_REPO_KEY);
}

/**
 * Set active repo ID
 */
export function setActiveRepoId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_REPO_KEY, id);
}

/**
 * Retrieve a specific stored repo by ID
 */
export function getStoredRepoById(id: string): StoredRepo | null {
  const recents = getRecentRepos();
  return recents.find((r) => r.id === id || r.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Remove a repo from Recents list
 */
export function removeRecentRepo(id: string): StoredRepo[] {
  if (typeof window === "undefined") return [];

  const existing = getRecentRepos();
  const filtered = existing.filter((item) => item.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to remove repo from localStorage:", err);
  }

  return filtered;
}

/**
 * Clear all stored recents
 */
export function clearAllRecents(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_REPO_KEY);
  } catch (err) {
    console.error("Failed to clear recents:", err);
  }
}
