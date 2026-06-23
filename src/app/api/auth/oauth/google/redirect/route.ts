import { googleOAuth } from "@/lib/auth/oauth";
import { generateState, generateCodeVerifier } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleOAuth.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 600, // 10 mins
    sameSite: "lax"
  });
  cookieStore.set("google_oauth_code_verifier", codeVerifier, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax"
  });

  return NextResponse.redirect(url);
}
