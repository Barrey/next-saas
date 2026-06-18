import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (token) {
      await revokeSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("session_token");
    return response;
  } catch (err) {
    console.error("Logout Error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
