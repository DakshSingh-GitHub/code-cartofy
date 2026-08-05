import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionData = JSON.stringify(body || { id: "usr_guest", name: "Developer", email: "dev@cartofy.io" });

    const response = NextResponse.json({ success: true, user: body });
    response.cookies.set({
      name: "cartofy_session",
      value: encodeURIComponent(sessionData),
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true, user: { name: "Developer" } });
    response.cookies.set({
      name: "cartofy_session",
      value: "true",
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return response;
  }
}
