import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /cartofy and /dashboard routes and their subroutes
  if (pathname.startsWith("/cartofy") || pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get("cartofy_session");

    if (!sessionCookie || !sessionCookie.value) {
      // User is not signed in or logged in, server-side redirect to /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cartofy/:path*", "/dashboard/:path*"],
};
