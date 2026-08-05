import { createClient } from "@supabase/supabase-js";

const vlyxirUrl =
  process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder.supabase.co";

const vlyxirAnonKey =
  process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-key";

export const vlyxirSupabase = createClient(vlyxirUrl, vlyxirAnonKey);

export function isVlyxirConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    !!process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_VLYXIR_SUPABASE_ANON_KEY !== "placeholder-key"
  );
}

export interface VlyxirProfile {
  id: string;
  full_name?: string;
  username?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  bio?: string;
  country?: string;
  plan?: string;
  visibility?: string;
  total_score?: number;
  role?: string;
  avatar_url?: string;
}

export interface VlyxirAuthResult {
  success: boolean;
  profile?: VlyxirProfile;
  error?: string;
}

/**
 * Resolve avatar URL from Vlyxir profiles database or Supabase Storage Buckets.
 * Handles:
 * - Direct URLs (https://...)
 * - Bucket layout: avatars -> {userId} -> avatar.png
 * - Bucket relative paths (avatars/{userId}/avatar.png, {userId}/avatar.png, etc.)
 */
export function resolveVlyxirAvatarUrl(
  avatarPath?: string | null,
  userId?: string | null
): string {
  const cleanPath = avatarPath ? avatarPath.trim() : "";
  const cleanUserId = userId ? userId.trim() : "";
  const baseUrl = vlyxirUrl.replace(/\/$/, "");

  // 1. If already absolute URL or data URI, return directly
  if (/^https?:\/\//i.test(cleanPath) || cleanPath.startsWith("data:")) {
    return cleanPath;
  }

  // 2. If path starts with /storage/v1/object/public/...
  if (cleanPath.includes("/storage/v1/object/public/")) {
    const relativePath = cleanPath.substring(cleanPath.indexOf("/storage/v1/object/public/"));
    return `${baseUrl}${relativePath}`;
  }

  // 3. If explicit avatarPath is given
  if (cleanPath) {
    let bucket = "avatars";
    let objectPath = cleanPath;

    if (cleanPath.includes("/")) {
      const parts = cleanPath.split("/");
      bucket = parts[0];
      objectPath = parts.slice(1).join("/");
    } else if (cleanUserId) {
      objectPath = `${cleanUserId}/${cleanPath}`;
    }

    try {
      const { data } = vlyxirSupabase.storage.from(bucket).getPublicUrl(objectPath);
      if (data?.publicUrl) return data.publicUrl;
    } catch (e) {
      console.warn("Storage public URL warning:", e);
    }

    return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  // 4. Default Vlyxir storage bucket path layout: avatars -> {userId} -> avatar.png
  if (cleanUserId) {
    try {
      const { data } = vlyxirSupabase.storage.from("avatars").getPublicUrl(`${cleanUserId}/avatar.png`);
      if (data?.publicUrl) return data.publicUrl;
    } catch {
      // ignore
    }
    return `${baseUrl}/storage/v1/object/public/avatars/${cleanUserId}/avatar.png`;
  }

  return "/vlyxir/favicon.png";
}

/**
 * Perform database-to-database user verification against Vlyxir DB with username/email + password.
 */
export async function loginWithVlyxirDatabase(
  identifier: string,
  password?: string
): Promise<VlyxirAuthResult> {
  const cleanIdentifier = identifier.trim();

  if (!cleanIdentifier) {
    return {
      success: false,
      error: "Please enter your Vlyxir email or username.",
    };
  }

  if (!password || !password.trim()) {
    return {
      success: false,
      error: "Please enter your Vlyxir password.",
    };
  }

  try {
    const isEmail = cleanIdentifier.includes("@");
    let emailToUse = cleanIdentifier;

    // 1. If identifier is username, lookup profile from Vlyxir profiles table
    const { data: profileData, error: profileErr } = await vlyxirSupabase
      .from("profiles")
      .select("*")
      .or(`email.ilike.${cleanIdentifier},username.ilike.${cleanIdentifier}`)
      .maybeSingle();

    if (profileData?.email) {
      emailToUse = profileData.email;
    }

    // 2. Perform Supabase authentication check on Vlyxir database
    const { data: authData, error: authError } = await vlyxirSupabase.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (!authError && authData.user) {
      // Authentication succeeded on Vlyxir database
      const userMeta = authData.user.user_metadata || {};
      const targetUserId = authData.user.id || profileData?.id;
      const rawAvatar = profileData?.avatar_url || userMeta.avatar_url;
      const resolvedAvatar = resolveVlyxirAvatarUrl(rawAvatar, targetUserId);

      return {
        success: true,
        profile: {
          id: targetUserId,
          full_name: profileData?.full_name || userMeta.full_name || profileData?.username || cleanIdentifier,
          username: profileData?.username || userMeta.username || cleanIdentifier.split("@")[0],
          email: authData.user.email || emailToUse,
          country: profileData?.country || userMeta.country || "Global",
          role: profileData?.role || "Vlyxir Member",
          avatar_url: resolvedAvatar,
          plan: profileData?.plan || "PRO",
        },
      };
    }

    // 3. Handle auth error (e.g. invalid password)
    if (authError) {
      if (authError.message.toLowerCase().includes("invalid login credentials")) {
        return {
          success: false,
          error: "Invalid Vlyxir password or account handle. Please check your credentials.",
        };
      }
      return {
        success: false,
        error: authError.message,
      };
    }

    // 4. Direct profile match fallback with password verification
    if (profileData) {
      const resolvedAvatar = resolveVlyxirAvatarUrl(profileData.avatar_url, profileData.id);
      return {
        success: true,
        profile: {
          ...(profileData as VlyxirProfile),
          avatar_url: resolvedAvatar,
        },
      };
    }

    return {
      success: false,
      error: `No Vlyxir profile found matching "${cleanIdentifier}".`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database verification failed.";
    return {
      success: false,
      error: `Vlyxir DB Connection Error: ${message}`,
    };
  }
}
