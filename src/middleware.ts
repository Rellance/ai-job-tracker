import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Edge middleware: protects the app routes. `authorized` in authConfig
// redirects unauthenticated users to /login (with a callbackUrl).
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/board/:path*",
    "/calendar/:path*",
    "/ai/:path*",
    "/resumes/:path*",
    "/settings/:path*",
  ],
};
