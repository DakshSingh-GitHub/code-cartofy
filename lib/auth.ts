export interface UserSession {
  id: string;
  name: string;
  email: string;
  username?: string;
  country?: string;
  isGuest?: boolean;
  avatarUrl?: string;
  isVlyxir?: boolean;
}

const COOKIE_NAME = "cartofy_session";

export function getClientSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  // 1. Try reading from cookie
  const cookies = document.cookie.split("; ");
  const sessionCookie = cookies.find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (sessionCookie) {
    let rawVal = sessionCookie.substring(COOKIE_NAME.length + 1);
    if (rawVal) {
      try {
        // Handle single or double URL encoding safely
        try {
          rawVal = decodeURIComponent(rawVal);
        } catch {
          // ignore
        }
        if (rawVal.startsWith("%7B") || rawVal.startsWith("%257B") || rawVal.includes("%22")) {
          try {
            rawVal = decodeURIComponent(rawVal);
          } catch {
            // ignore
          }
        }

        const parsed = JSON.parse(rawVal) as UserSession;
        if (parsed && typeof parsed === "object" && (parsed.id || parsed.email || parsed.name)) {
          if (parsed.email === "guest@cartofy.io" || (parsed.name && parsed.name.toLowerCase().includes("guest"))) {
            parsed.isGuest = true;
          }
          if (!parsed.avatarUrl) {
            parsed.avatarUrl = "/vlyxir/favicon.png";
          }
          return parsed;
        }
      } catch {
        if (rawVal === "true" || rawVal === "1") {
          return {
            id: "usr_default",
            name: "Developer",
            email: "dev@cartofy.io",
            avatarUrl: "/vlyxir/favicon.png",
          };
        }
      }
    }
  }

  // 2. Fallback to localStorage
  try {
    const local = localStorage.getItem("cartofy_user_session");
    if (local) {
      const parsed = JSON.parse(local) as UserSession;
      if (parsed && typeof parsed === "object" && (parsed.id || parsed.email || parsed.name)) {
        if (!parsed.avatarUrl) parsed.avatarUrl = "/vlyxir/favicon.png";
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function loginUser(
  emailOrSession: string | UserSession,
  name?: string,
  isGuest?: boolean
): Promise<UserSession> {
  let user: UserSession;

  if (typeof emailOrSession === "object") {
    user = {
      ...emailOrSession,
      avatarUrl: emailOrSession.avatarUrl || "/vlyxir/favicon.png",
      isGuest: emailOrSession.isGuest || emailOrSession.email === "guest@cartofy.io",
    };
  } else {
    user = {
      id: `usr_${Date.now()}`,
      name: name || emailOrSession.split("@")[0] || "Developer",
      email: emailOrSession || "dev@cartofy.io",
      avatarUrl: "/vlyxir/favicon.png",
      isGuest: isGuest || emailOrSession === "guest@cartofy.io" || (name ? name.toLowerCase().includes("guest") : false),
    };
  }

  try {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch (e) {
    console.error("Auth API call error:", e);
  }

  const sessionStr = encodeURIComponent(JSON.stringify(user));
  document.cookie = `${COOKIE_NAME}=${sessionStr}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

  try {
    localStorage.setItem("cartofy_user_session", JSON.stringify(user));
    window.dispatchEvent(new Event("cartofy_session_change"));
  } catch {
    // ignore
  }

  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error("Logout API call error:", e);
  }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  try {
    localStorage.removeItem("cartofy_user_session");
    window.dispatchEvent(new Event("cartofy_session_change"));
  } catch {
    // ignore
  }
}
