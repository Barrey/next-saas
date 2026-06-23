import { facebookOAuth } from "@/lib/auth/oauth";
import { generateState, generateCodeVerifier } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const state = generateState();
  const url = facebookOAuth.createAuthorizationURL(state, ["email", "public_profile"]);

  const cookieStore = await cookies();
  cookieStore.set("facebook_oauth_state", state, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 600,
    sameSite: "lax"
  });

  return NextResponse.redirect(url);
}
