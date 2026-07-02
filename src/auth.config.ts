import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / bcrypt imports) so it can be used by
 * `middleware.ts`. The Credentials provider + adapter live in `auth.ts` (Node).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // Middleware only runs on protected route prefixes (see middleware.ts),
      // so any hit here must be authenticated.
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
