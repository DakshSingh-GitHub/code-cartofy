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

  const cookies = document.cookie.split("; ");
  const sessionCookie = cookies.find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (!sessionCookie) return null;

  try {
    const rawVal = decodeURIComponent(sessionCookie.split("=")[1]);
    if (!rawVal) return null;
    const parsed = JSON.parse(rawVal) as UserSession;
    if (parsed.email === "guest@cartofy.io" || (parsed.name && parsed.name.toLowerCase().includes("guest"))) {
      parsed.isGuest = true;
    }
    if (!parsed.avatarUrl) {
      parsed.avatarUrl = "/vlyxir/favicon.png";
    }
    return parsed;
  } catch {
    const val = sessionCookie.split("=")[1];
    if (val === "true" || val) {
      return {
        id: "usr_default",
        name: "Developer",
        email: "dev@cartofy.io",
        avatarUrl: "/vlyxir/favicon.png",
      };
    }
    return null;
  }
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

  return user;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error("Logout API call error:", e);
  }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
