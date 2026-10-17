import { createClient } from "@supabase/supabase-js";
import { FileInput } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://your-supabase-project.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-supabase-anon-key" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-key"
  );
}

export interface RegisterParams {
  fullName: string;
  username: string;
  email: string;
  country: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    country: string;
  };
  error?: string;
}

/**
 * Check if a username is available in Supabase
 */
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) {
    return { available: false, error: "Username cannot be empty" };
  }

  // If Supabase is not configured yet, check local mock users
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const localUsers = JSON.parse(localStorage.getItem("cartofy_local_users") || "[]");
        const exists = localUsers.some(
          (u: { username?: string }) => (u.username || "").toLowerCase() === cleanUsername
        );
        if (exists) {
          return { available: false, error: "Username is already taken" };
        }
      } catch {
        // ignore
      }
    }
    return { available: true };
  }

  try {
    // 1. Try calling the RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc("check_username_available", {
      username_input: cleanUsername,
    });

    if (!rpcError && typeof rpcData === "boolean") {
      return { available: rpcData };
    }

    // 2. Fallback to direct query on profiles table
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (error) {
      console.warn("Username query fallback error:", error);
      return { available: true }; // non-blocking fallback
    }

    return { available: !data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error checking username";
    return { available: true, error: message };
  }
}

/**
 * Register user with Supabase Auth + metadata
 */
export async function registerWithSupabase(params: RegisterParams): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    // Simulated successful auth with local storage for local development
    const newUser = {
      id: `usr_${Date.now()}`,
      email: params.email.trim(),
      fullName: params.fullName.trim(),
      username: params.username.trim(),
      country: params.country,
      password: params.password,
    };

    if (typeof window !== "undefined") {
      try {
        const localUsers = JSON.parse(localStorage.getItem("cartofy_local_users") || "[]");
        // Check if username or email already taken
        const exists = localUsers.some(
          (u: { username?: string; email?: string }) =>
            (u.username || "").toLowerCase() === newUser.username.toLowerCase() ||
            (u.email || "").toLowerCase() === newUser.email.toLowerCase()
        );
        if (exists) {
          return { success: false, error: "Username or email is already registered." };
        }
        localUsers.push(newUser);
        localStorage.setItem("cartofy_local_users", JSON.stringify(localUsers));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        username: newUser.username,
        country: newUser.country,
      },
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          username: params.username,
          country: params.country,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Registration failed to create user." };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || params.email,
        fullName: params.fullName,
        username: params.username,
        country: params.country,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during signup.";
    return { success: false, error: message };
  }
}

/**
 * Log in with Supabase (supports either Email or Username)
 */
export async function loginWithSupabase(identifier: string, password: string): Promise<AuthResult> {
  const cleanId = identifier.trim().toLowerCase();

  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      try {
        const localUsers = JSON.parse(localStorage.getItem("cartofy_local_users") || "[]");
        const matched = localUsers.find(
          (u: { username?: string; email?: string }) =>
            (u.username || "").toLowerCase() === cleanId ||
            (u.email || "").toLowerCase() === cleanId
        );
        if (matched) {
          if (matched.password && matched.password !== password) {
            return { success: false, error: "Incorrect password. Please try again." };
          }
          return {
            success: true,
            user: {
              id: matched.id,
              email: matched.email,
              fullName: matched.fullName || matched.username,
              username: matched.username,
              country: matched.country || "Global",
            },
          };
        }
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      user: {
        id: `usr_${Date.now()}`,
        email: identifier.includes("@") ? identifier : `${identifier}@cartofy.io`,
        fullName: identifier.split("@")[0],
        username: identifier.includes("@") ? identifier.split("@")[0] : identifier,
        country: "United States",
      },
    };
  }

  try {
    let emailToUse = identifier.trim();

    // If identifier is not an email, lookup user's email by username in profiles table
    if (!identifier.includes("@")) {
      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name, username, country")
        .ilike("username", identifier.trim())
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: "Invalid username or password" };
      }
      emailToUse = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const metadata = data.user.user_metadata || {};

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || emailToUse,
        fullName: metadata.full_name || data.user.email?.split("@")[0] || "Developer",
        username: metadata.username || data.user.email?.split("@")[0] || "developer",
        country: metadata.country || "Global",
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred during login.";
    return { success: false, error: message };
  }
}

/**
 * Supabase User Repository Record Interface
 */
export interface SupabaseUserRepo {
  id: string;
  user_id: string;
  user_email?: string;
  username?: string;
  repo_id: string;
  repo_name: string;
  type: "github" | "upload" | "sample";
  github_url?: string;
  files: FileInput[];
  file_count: number;
  timestamp: number;
}

/**
 * Save / Upsert graph repository data to Supabase `user_repositories` table
 */
export async function saveUserRepoToSupabase(
  user: { id?: string; username?: string; email?: string },
  repo: {
    id: string;
    name: string;
    type: "github" | "upload" | "sample";
    githubUrl?: string;
    files: FileInput[];
    timestamp: number;
    fileCount?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: true };

  const userId = user.username || user.id || user.email || "guest";
  const recordId = `${userId}:${repo.id}`;

  try {
    const payload = {
      id: recordId,
      user_id: userId,
      username: user.username || userId,
      user_email: user.email || "",
      repo_id: repo.id,
      repo_name: repo.name,
      type: repo.type,
      github_url: repo.githubUrl || null,
      files: repo.files,
      file_count: repo.files.length,
      timestamp: repo.timestamp || Date.now(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_repositories")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("Supabase repo upsert warning:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync repo to Supabase";
    return { success: false, error: message };
  }
}

/**
 * Fetch all graph repositories for a user from Supabase `user_repositories` table
 */
export async function fetchUserReposFromSupabase(user: {
  id?: string;
  username?: string;
  email?: string;
}): Promise<SupabaseUserRepo[]> {
  if (!isSupabaseConfigured()) return [];

  const userId = user.username || user.id || user.email || "guest";

  try {
    const { data, error } = await supabase
      .from("user_repositories")
      .select("*")
      .or(`user_id.eq.${userId},username.eq.${user.username || userId}`)
      .order("timestamp", { ascending: false });

    if (error) {
      console.warn("Supabase repo fetch warning:", error.message);
      return [];
    }

    return (data || []) as SupabaseUserRepo[];
  } catch (err: unknown) {
    console.error("Failed to fetch user repos from Supabase:", err);
    return [];
  }
}

/**
 * Delete a repository from Supabase `user_repositories` table
 */
export async function deleteUserRepoFromSupabase(
  user: { id?: string; username?: string; email?: string },
  repoId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const userId = user.username || user.id || user.email || "guest";
  const recordId = `${userId}:${repoId}`;

  try {
    await supabase.from("user_repositories").delete().eq("id", recordId);
  } catch (err) {
    console.error("Failed to delete user repo from Supabase:", err);
  }
}

/**
 * Supabase User GitHub Connection Record Interface
 */
export interface UserGithubConnectionRecord {
  id?: string;
  user_id: string;
  username?: string;
  user_email?: string;
  github_username: string;
  avatar_url?: string;
  profile_url?: string;
  public_repos_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save / Upsert user's connected GitHub handle to Supabase `user_github_connections` table
 */
export async function saveUserGithubConnection(
  user: { id?: string; username?: string; email?: string },
  data: {
    githubUsername: string;
    avatarUrl?: string;
    profileUrl?: string;
    publicReposCount?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  // Prefer user.id (UUID) so it aligns with auth.uid() if authenticated with Supabase
  const primaryId = user.id || user.username || user.email || "guest";
  const username = user.username || (user.id !== primaryId ? user.id : "") || primaryId;
  const cleanGithubUsername = data.githubUsername.trim().replace(/^@/, "");

  // 1. Local development / fallback storage (save under both ID and username for safety)
  if (typeof window !== "undefined") {
    try {
      const storedMap = JSON.parse(localStorage.getItem("cartofy_github_connections") || "{}");
      const record = {
        user_id: primaryId,
        username: username,
        user_email: user.email || "",
        github_username: cleanGithubUsername,
        avatar_url: data.avatarUrl || "",
        profile_url: data.profileUrl || `https://github.com/${cleanGithubUsername}`,
        public_repos_count: data.publicReposCount || 0,
        updated_at: new Date().toISOString(),
      };
      storedMap[primaryId] = record;
      if (user.username && user.username !== primaryId) {
        storedMap[user.username] = record;
      }
      localStorage.setItem("cartofy_github_connections", JSON.stringify(storedMap));
    } catch {
      // ignore
    }
  }

  // 2. Try server-side API endpoint (/api/user/github)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/user/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: primaryId,
          username: username,
          email: user.email || "",
          githubUsername: cleanGithubUsername,
          avatarUrl: data.avatarUrl,
          profileUrl: data.profileUrl,
          publicReposCount: data.publicReposCount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true };
      }
      if (json.error && !json.error.includes("Database not configured")) {
        console.warn("API /api/user/github returned error:", json.error, json.hint);
      }
    } catch (e) {
      console.warn("API /api/user/github fetch error, attempting direct client fallback:", e);
    }
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  // 3. Try client-side RPC save_github_connection (SECURITY DEFINER bypasses RLS)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("save_github_connection", {
      p_user_id: primaryId,
      p_username: username,
      p_user_email: user.email || null,
      p_github_username: cleanGithubUsername,
      p_avatar_url: data.avatarUrl || null,
      p_profile_url: data.profileUrl || `https://github.com/${cleanGithubUsername}`,
      p_public_repos_count: data.publicReposCount || 0,
    });

    if (!rpcError && rpcData) {
      return { success: true };
    }
  } catch {
    // ignore and try direct table upsert
  }

  // 4. Try direct table upsert
  try {
    const payload = {
      user_id: primaryId,
      username: username,
      user_email: user.email || "",
      github_username: cleanGithubUsername,
      avatar_url: data.avatarUrl || null,
      profile_url: data.profileUrl || `https://github.com/${cleanGithubUsername}`,
      public_repos_count: data.publicReposCount || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_github_connections")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.warn("Supabase user_github_connections upsert error:", error.message, error.code);
      return {
        success: false,
        error:
          error.code === "42501"
            ? "Row Level Security (RLS) blocked the update. Please run fix_github_table.sql in your Supabase SQL editor."
            : error.message,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save GitHub connection to database";
    return { success: false, error: message };
  }
}

/**
 * Fetch connected GitHub handle for a user from Supabase `user_github_connections` table
 */
export async function fetchUserGithubConnection(user: {
  id?: string;
  username?: string;
  email?: string;
}): Promise<UserGithubConnectionRecord | null> {
  const primaryId = user.id || user.username || user.email || "guest";
  const username = user.username || "";
  const email = user.email || "";

  // 1. Try server API route first
  if (typeof window !== "undefined") {
    try {
      const q = new URLSearchParams({
        userId: primaryId,
        ...(username ? { username } : {}),
        ...(email ? { email } : {}),
      });
      const res = await fetch(`/api/user/github?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as UserGithubConnectionRecord;
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Direct client query
  if (isSupabaseConfigured()) {
    try {
      const filterParts: string[] = [];
      if (primaryId) filterParts.push(`user_id.eq.${primaryId}`);
      if (username) {
        filterParts.push(`user_id.eq.${username}`);
        filterParts.push(`username.eq.${username}`);
      }
      if (email) filterParts.push(`user_email.eq.${email}`);

      if (filterParts.length > 0) {
        const { data, error } = await supabase
          .from("user_github_connections")
          .select("*")
          .or(filterParts.join(","))
          .maybeSingle();

        if (!error && data) {
          return data as UserGithubConnectionRecord;
        }
      }
    } catch (err) {
      console.warn("Direct Supabase fetch error:", err);
    }
  }

  // 3. Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const storedMap = JSON.parse(localStorage.getItem("cartofy_github_connections") || "{}");
      if (storedMap[primaryId]) return storedMap[primaryId] as UserGithubConnectionRecord;
      if (username && storedMap[username]) return storedMap[username] as UserGithubConnectionRecord;
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Delete connected GitHub handle for a user from Supabase `user_github_connections` table
 */
export async function deleteUserGithubConnection(user: {
  id?: string;
  username?: string;
  email?: string;
}): Promise<void> {
  const primaryId = user.id || user.username || user.email || "guest";
  const username = user.username || "";

  // 1. Clean local storage fallback
  if (typeof window !== "undefined") {
    try {
      const storedMap = JSON.parse(localStorage.getItem("cartofy_github_connections") || "{}");
      delete storedMap[primaryId];
      if (username) delete storedMap[username];
      localStorage.setItem("cartofy_github_connections", JSON.stringify(storedMap));
    } catch {
      // ignore
    }
  }

  // 2. Call server API route
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/user/github", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: primaryId, username }),
      });
    } catch {
      // fallback
    }
  }

  // 3. Direct client delete
  if (isSupabaseConfigured()) {
    try {
      const filterParts: string[] = [];
      if (primaryId) filterParts.push(`user_id.eq.${primaryId}`);
      if (username) {
        filterParts.push(`user_id.eq.${username}`);
        filterParts.push(`username.eq.${username}`);
      }
      if (filterParts.length > 0) {
        await supabase
          .from("user_github_connections")
          .delete()
          .or(filterParts.join(","));
      }
    } catch (err) {
      console.error("Failed to delete user GitHub connection from Supabase:", err);
    }
  }
}



