import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let isServerSupabaseOffline = false;
let serverOfflineUntil = 0;
const SERVER_OFFLINE_COOLDOWN_MS = 60 * 1000; // 60s cooldown

function withTimeout<T>(promise: PromiseLike<T>, ms: number = 1500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase request timed out")), ms)
    ),
  ]);
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key if available, else anon key
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("placeholder")) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const username = searchParams.get("username");
  const email = searchParams.get("email");

  if (isServerSupabaseOffline && Date.now() < serverOfflineUntil) {
    return NextResponse.json({ success: false, offline: true, error: "Database offline" }, { status: 200 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, offline: true, error: "Database not configured" }, { status: 200 });
  }

  try {
    const filters: string[] = [];
    if (userId) filters.push(`user_id.eq.${userId}`);
    if (username) {
      filters.push(`user_id.eq.${username}`);
      filters.push(`username.eq.${username}`);
    }
    if (email) filters.push(`user_email.eq.${email}`);

    if (filters.length === 0) {
      return NextResponse.json({ success: false, error: "Missing user identifier" }, { status: 400 });
    }

    const { data, error } = await withTimeout(
      supabase
        .from("user_github_connections")
        .select("*")
        .or(filters.join(","))
        .maybeSingle(),
      1500
    );

    if (error) {
      if (error.message?.includes("fetch failed") || error.message?.includes("Load failed")) {
        isServerSupabaseOffline = true;
        serverOfflineUntil = Date.now() + SERVER_OFFLINE_COOLDOWN_MS;
        return NextResponse.json({ success: false, offline: true, error: error.message }, { status: 200 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    if (msg.includes("timed out") || msg.includes("fetch failed") || msg.includes("Load failed")) {
      isServerSupabaseOffline = true;
      serverOfflineUntil = Date.now() + SERVER_OFFLINE_COOLDOWN_MS;
      return NextResponse.json({ success: false, offline: true, error: msg }, { status: 200 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      username,
      email,
      githubUsername,
      avatarUrl,
      profileUrl,
      publicReposCount,
    } = body;

    if (!userId || !githubUsername) {
      return NextResponse.json(
        { success: false, error: "userId and githubUsername are required" },
        { status: 400 }
      );
    }

    if (isServerSupabaseOffline && Date.now() < serverOfflineUntil) {
      return NextResponse.json({ success: false, offline: true, error: "Database offline" }, { status: 200 });
    }

    const cleanGh = String(githubUsername).trim().replace(/^@/, "");
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { success: false, offline: true, error: "Database not configured" },
        { status: 200 }
      );
    }

    // 1. Try calling the SECURITY DEFINER RPC first (immune to RLS policies) with timeout
    try {
      const { data: rpcData, error: rpcError } = await withTimeout(
        supabase.rpc("save_github_connection", {
          p_user_id: String(userId),
          p_username: username ? String(username) : String(userId),
          p_user_email: email ? String(email) : null,
          p_github_username: cleanGh,
          p_avatar_url: avatarUrl || null,
          p_profile_url: profileUrl || `https://github.com/${cleanGh}`,
          p_public_repos_count: Number(publicReposCount) || 0,
        }),
        1500
      );

      if (!rpcError && rpcData) {
        return NextResponse.json({ success: true, data: rpcData });
      }
    } catch {
      // Fallback to direct table upsert
    }

    // 2. Direct table upsert fallback
    const payload = {
      user_id: String(userId),
      username: username ? String(username) : String(userId),
      user_email: email ? String(email) : "",
      github_username: cleanGh,
      avatar_url: avatarUrl || null,
      profile_url: profileUrl || `https://github.com/${cleanGh}`,
      public_repos_count: Number(publicReposCount) || 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await withTimeout(
      supabase
        .from("user_github_connections")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .maybeSingle(),
      1500
    );

    if (error) {
      if (error.message?.includes("fetch failed") || error.message?.includes("Load failed")) {
        isServerSupabaseOffline = true;
        serverOfflineUntil = Date.now() + SERVER_OFFLINE_COOLDOWN_MS;
      }
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          hint: error.code === "42501" ? "Row-level security policy violation. Run fix_github_table.sql in Supabase SQL editor." : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    if (msg.includes("timed out") || msg.includes("fetch failed") || msg.includes("Load failed")) {
      isServerSupabaseOffline = true;
      serverOfflineUntil = Date.now() + SERVER_OFFLINE_COOLDOWN_MS;
      return NextResponse.json({ success: false, offline: true, error: msg }, { status: 200 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, username } = body;

    if (!userId && !username) {
      return NextResponse.json({ success: false, error: "Missing identifier" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    }

    const targetId = userId || username;
    const { error } = await supabase
      .from("user_github_connections")
      .delete()
      .or(`user_id.eq.${targetId},username.eq.${targetId}`);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
