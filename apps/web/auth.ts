import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { z } from "zod";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

if (!secret) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET environment variable is required');
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
  return json.data as { user: { id: string; name: string; email: string; role: string }; token: string };
}

async function backendOAuth(email: string, name: string, provider: string) {
  const res = await fetch(`${BACKEND_URL}/auth/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, provider }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;
  return json.data as { user: { id: string; name: string; email: string; role: string }; token: string };
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
      // Allow all sign-ins; OAuth backend sync happens in jwt callback
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // On initial sign-in (credentials or OAuth), user is present
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.backendToken = user.backendToken;
      }

      // For OAuth providers, sync with backend if we don't have a backend token yet
      if (account && account.provider !== "credentials" && !token.backendToken) {
        const email = token.email as string;
        const name = (token.name as string) || (profile?.name as string) || email;
        if (email) {
          const data = await backendOAuth(email, name, account.provider);
          if (data) {
            token.id = data.user.id;
            token.role = data.user.role;
            token.backendToken = data.token;
          }
        }
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
  }
});
