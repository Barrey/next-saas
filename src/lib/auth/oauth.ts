import { Google, GitHub, Facebook } from "arctic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const googleOAuth = new Google(
  process.env.GOOGLE_CLIENT_ID || "mock-google-id",
  process.env.GOOGLE_CLIENT_SECRET || "mock-google-secret",
  `${appUrl}/api/auth/oauth/google/callback`
);

export const githubOAuth = new GitHub(
  process.env.GITHUB_CLIENT_ID || "mock-github-id",
  process.env.GITHUB_CLIENT_SECRET || "mock-github-secret",
  `${appUrl}/api/auth/oauth/github/callback`
);

export const facebookOAuth = new Facebook(
  process.env.FACEBOOK_CLIENT_ID || "mock-facebook-id",
  process.env.FACEBOOK_CLIENT_SECRET || "mock-facebook-secret",
  `${appUrl}/api/auth/oauth/facebook/callback`
);
