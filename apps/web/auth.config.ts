import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/signup");
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }
      
      // Redirect logged-in users away from auth pages
      if (isOnAuth && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      
      return true;
    },
    async signIn({ user, account }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // If redirecting after login, go to dashboard
      if (url.startsWith("/login") || url.startsWith("/signup")) {
        return `${baseUrl}/dashboard`;
      }
      // If callback URL is provided, use it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to dashboard for authenticated users
      return `${baseUrl}/dashboard`;
    },
  },
} satisfies NextAuthConfig;
