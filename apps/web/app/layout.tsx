import type { Metadata } from "next";
import { Inter, Space_Grotesk, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "@xterm/xterm/css/xterm.css";
import { MainLayout } from "@/components/MainLayout";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { HydrationGuard } from "@/components/HydrationGuard";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Yapapa - Universal LLM Gateway",
  description:
    "Access 100+ AI models through one unified API. Route to the best model for your task.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let user = session?.user;

  if (user?.email) {
    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });
      if (dbUser) {
        user = { ...user, ...dbUser };
      }
    } catch (error) {
      console.error("Failed to fetch user profile from DB:", error);
      // Continue with basic session user if DB fails
    }
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HydrationGuard />
      </head>
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          instrumentSerif.variable,
          "bg-background font-sans min-h-screen antialiased",
        )}
        suppressHydrationWarning
      >
        <div
          className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
          suppressHydrationWarning
        />
        <Providers>
          <MainLayout user={user}>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
