import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no bcrypt / no DB). Shared by middleware and the full
// Node config in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (onDashboard && !isLoggedIn) {
        // Redirect with a RELATIVE location + relative callbackUrl. The
        // default builds an absolute URL from the server's internal hostname
        // (e.g. https://0.0.0.0:3000), which breaks behind tunnels/proxies.
        const callback = encodeURIComponent(nextUrl.pathname + nextUrl.search);
        return new Response(null, {
          status: 307,
          headers: { Location: `/login?callbackUrl=${callback}` },
        });
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.companyId = (user as { companyId?: string }).companyId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { companyId?: string }).companyId = token.companyId as string;
      }
      return session;
    },
  },
  providers: [], // added in auth.ts
} satisfies NextAuthConfig;
