import { createClient } from "@supabase/supabase-js";

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

  // If Supabase is not configured yet, pretend it's available for local preview
  if (!isSupabaseConfigured()) {
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
    // Simulated successful auth for local development when keys aren't set
    return {
      success: true,
      user: {
        id: `usr_${Date.now()}`,
        email: params.email,
        fullName: params.fullName,
        username: params.username,
        country: params.country,
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
  if (!isSupabaseConfigured()) {
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
 * Initiate Google OAuth sign in
 */
export async function loginWithGoogle(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase environment variables (URL & Anon Key) are required for Google OAuth." };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/cartofy`,
      },
    });

    if (error) return { error: error.message };
    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to launch Google Sign In.";
    return { error: message };
  }
}
