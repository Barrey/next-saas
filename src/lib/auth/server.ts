import { cache } from "react";
import { cookies } from "next/headers";
import { validateSession } from "./session";

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const sessionData = await validateSession(token);
  if (!sessionData) return null;

  return sessionData.user;
});
