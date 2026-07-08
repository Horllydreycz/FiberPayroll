import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Run on dashboard routes; skip static assets and api/auth.
  matcher: ["/dashboard/:path*"],
};
