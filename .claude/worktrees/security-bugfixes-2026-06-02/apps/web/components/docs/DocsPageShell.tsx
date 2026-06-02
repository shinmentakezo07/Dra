"use client";

import { ErrorBoundary } from "@/components/docs/ErrorBoundary";
import { PrevNextNav } from "@/components/docs/PrevNextNav";
import { usePathname } from "next/navigation";

export function DocsPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentId = pathname.replace("/docs/", "").replace("/", "") || "index";
  const isIndex = currentId === "index";

  return (
    <ErrorBoundary>
      {children}
      {!isIndex && <PrevNextNav currentId={currentId} />}
    </ErrorBoundary>
  );
}
