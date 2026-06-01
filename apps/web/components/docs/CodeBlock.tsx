"use client";

import { useState } from "react";
import { Check, Copy, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Glass Atelier code block with refined highlighter ── */

const colors = {
  string: "text-amber-200/90",
  keyword: "text-violet-300",
  function: "text-sky-300",
  number: "text-emerald-300/90",
  comment: "text-white/25 italic",
  builtin: "text-rose-300/90",
  flag: "text-cyan-300",
  url: "text-cyan-300 underline underline-offset-2 decoration-white/10",
};

const TOKEN_RE = {
  json:
    /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(\b-?\d+\.?\d*\b)|(\/\/.*$)/gm,
  bash:
    /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go|pip|brew|git|docker)(\s|$)|("(?:[^"\\]|\\.)*")|(-{1,2}[a-zA-Z][\w-]*)|((?:https?:\/\/|localhost)\S*)/gm,
  python:
    /("[^"]*"|'[^']*')|(\b(?:def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None|async|await|yield|lambda|pass|break|continue|self)\b)|(#.*$)|(\b\d+\.?\d*\b)/gm,
  go:
    /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(?:func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|byte|any)\b)|(\/\/.*$)|(\b\d+\.?\d*\b)/gm,
  js: /("[^"]*"|'[^']*'|`[^`]*`)|(\b(?:const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*$)|(\b\d+\.?\d*\b)/gm,
};

function renderTokens(
  code: string,
  lang: string,
): React.ReactNode {
  const regex = TOKEN_RE[lang as keyof typeof TOKEN_RE] ?? TOKEN_RE.bash;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const push = (text: string, cls?: string) => {
    if (cls) {
      parts.push(
        <span key={key++} className={cls}>
          {text}
        </span>,
      );
    } else {
      parts.push(<span key={key++}>{text}</span>);
    }
  };

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      push(code.slice(lastIndex, match.index));
    }

    if (lang === "json") {
      if (match[1]) {
        if (match[2]) {
          push(match[1], colors.function);
          push(match[2]);
        } else {
          push(match[1], colors.string);
        }
      } else if (match[3]) {
        push(match[3], colors.keyword);
      } else if (match[4]) {
        push(match[4], colors.number);
      } else if (match[5]) {
        push(match[5], colors.comment);
      }
    } else if (lang === "bash") {
      if (match[2]) {
        push(match[1] || "");
        push(match[2], colors.keyword);
      } else if (match[3]) {
        push(match[3], colors.string);
      } else if (match[4]) {
        push(match[4], colors.flag);
      } else if (match[5]) {
        push(match[5], colors.url);
      } else {
        push(match[0]);
      }
    } else if (lang === "python") {
      if (match[1]) push(match[1], colors.string);
      else if (match[2]) push(match[2], colors.keyword);
      else if (match[3]) push(match[3], colors.comment);
      else if (match[4]) push(match[4], colors.number);
    } else if (lang === "go") {
      if (match[1]) push(match[1], colors.string);
      else if (match[2]) push(match[2], colors.keyword);
      else if (match[3]) push(match[3], colors.comment);
      else if (match[4]) push(match[4], colors.number);
    } else if (lang === "js") {
      if (match[1]) push(match[1], colors.string);
      else if (match[2]) push(match[2], colors.keyword);
      else if (match[3]) push(match[3], colors.comment);
      else if (match[4]) push(match[4], colors.number);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    push(code.slice(lastIndex));
  }
  return <>{parts}</>;
}

export function getHighlighted(
  code: string,
  lang: string,
): React.ReactNode {
  if (lang === "curl") return renderTokens(code, "bash");
  if (TOKEN_RE[lang as keyof typeof TOKEN_RE]) {
    return renderTokens(code, lang);
  }
  return code;
}

export type Lang = "curl" | "js" | "python" | "go";

export interface CodeExample {
  curl: string;
  js: string;
  python: string;
  go: string;
}

export interface CodeBlockProps {
  code?: string;
  language?: string;
  examples?: CodeExample;
  title?: string;
}

export const CodeBlock = ({
  code,
  language = "bash",
  examples,
  title,
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>("curl");

  if (!code && !examples) return null;

  const displayCode = examples ? examples[activeLang] : (code ?? "");

  const handleCopy = () => {
    void navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langLabels: Record<Lang, string> = {
    curl: "cURL",
    js: "JavaScript",
    python: "Python",
    go: "Go",
  };

  const langMap: Record<string, string> = {
    curl: "bash",
    js: "js",
    python: "python",
    go: "go",
  };

  const highlighted = (() => {
    const langKey = examples ? langMap[activeLang] : language;
    return getHighlighted(displayCode, langKey);
  })();

  const hasSingleLine =
    displayCode.split("\n").filter(Boolean).length <= 3 &&
    displayCode.length < 80;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden group",
        "border border-white/[0.07]",
        "bg-gradient-to-br from-[#0a0a0d] via-[#0a0a0c] to-[#08080a]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.6)]",
        hasSingleLine && "not-prose",
      )}
    >
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

      {/* Atmospheric accent */}
      <div className="absolute -top-12 right-0 w-72 h-24 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-gradient-to-r from-white/[0.02] to-transparent">
        <div className="flex items-center gap-1.5">
          {examples ? (
            <>
              <span className="hidden sm:flex gap-1.5 mr-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 ring-1 ring-rose-500/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 ring-1 ring-amber-500/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 ring-1 ring-emerald-500/20" />
              </span>
              {(Object.keys(examples) as Lang[]).map((lang) => {
                const isActive = activeLang === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={cn(
                      "text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer",
                      isActive
                        ? "text-indigo-100 bg-indigo-500/[0.1] border border-indigo-500/25 shadow-[0_0_12px_-2px_rgba(99,102,241,0.3)]"
                        : "text-white/30 hover:text-white/60 border border-transparent hover:bg-white/[0.02]",
                    )}
                  >
                    {langLabels[lang]}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-indigo-200/60" />
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.18em]">
                {language}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[10px] text-white/25 font-mono hidden sm:block tracking-wide">
              {title}
            </span>
          )}
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer",
              "text-white/30 hover:text-white/70 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]",
              "transition-all duration-200",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              copied && "opacity-100",
            )}
          >
            {copied ? (
              <span className="flex items-center gap-1 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="p-5 overflow-x-auto font-mono text-[13px] leading-[1.75] text-white/70 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
        <code>
          {typeof highlighted === "string" ? displayCode : highlighted}
        </code>
      </pre>
    </div>
  );
};
