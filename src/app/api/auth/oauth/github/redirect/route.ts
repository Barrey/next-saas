import { githubOAuth } from "@/lib/auth/oauth";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const state = generateState();
  const url = githubOAuth.createAuthorizationURL(state, ["user:email"]);

  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax"
  });

  return NextResponse.redirect(url);
}
