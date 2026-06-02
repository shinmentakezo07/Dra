import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { z } from "zod";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

if (!secret) {
  throw new Error(
    "AUTH_SECRET or NEXTAUTH_SECRET environment variable is required",
  );
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (!payload.exp) return false;
    // Treat as expired if less than 60 seconds remaining
    return payload.exp < Math.floor(Date.now() / 1000) + 60;
  } catch {
    return true;
  }
}

async function backendLogin(email: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;
  return json.data as {
    user: { id: string; name: string; email: string; role: string };
    token: string;
  };
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  secret,
  providers: [
    GitHub,
    Google,
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const data = await backendLogin(email, password);
          if (data) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              backendToken: data.token,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider !== "credentials") {
        return Boolean(user.email);
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.backendToken = user.backendToken;
        token.provider = account?.provider;
      }

      if (token.backendToken && isTokenExpired(token.backendToken as string)) {
        token.backendToken = undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.backendToken = token.backendToken;
      }
      return session;
    },
  },
});
