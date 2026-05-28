import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: any }) => {
  const isLoggedIn = !!req.auth?.user;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnAuth =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup");

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isOnAuth && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
