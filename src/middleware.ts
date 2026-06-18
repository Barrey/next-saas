import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const path = req.nextUrl.pathname;

  const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");
  const isProtectedRoute = path.startsWith("/dashboard") || path.startsWith("/settings");

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login?redirected_from=1", req.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/register"],
};
