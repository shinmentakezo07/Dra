"use client";

import { useState } from "react";
import { Check, Copy, Terminal as TerminalIcon } from "lucide-react";

/* ── Syntax Highlighters ── */

export function highlightJson(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+\.?\d*\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-sky-300">
          {match[1]}
        </span>,
      );
      parts.push(<span key={key++}>:</span>);
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      parts.push(
        <span key={key++} className="text-purple-300">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[5]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightBash(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go)(?=\s|$)|("(?:[^"\\]|\\.)*")|(-[a-zA-Z]|--[a-zA-Z-]+)|((?:https?:\/\/|localhost)\S*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(
        <span key={key++} className="text-green-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-blue-300">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span
          key={key++}
          className="text-cyan-300 underline underline-offset-2 decoration-white/10"
        >
          {match[5]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightPython(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None)\b)|(#.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[5]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightGo(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|any)\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function highlightJS(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(
        <span key={key++} className="text-amber-200/90">
          {match[1]}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <span key={key++} className="text-purple-300 font-semibold">
          {match[2]}
        </span>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={key++} className="text-white/20 italic">
          {match[4]}
        </span>,
      );
    } else if (match[5]) {
      parts.push(
        <span key={key++} className="text-emerald-300">
          {match[5]}
        </span>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function getHighlighted(
  code: string,
  lang: string,
): JSX.Element | string {
  if (lang === "json" || lang === "bash" || lang === "curl") {
    if (lang === "bash") return highlightBash(code);
    if (lang === "curl") return highlightBash(code);
    return highlightJson(code);
  }
  if (lang === "javascript" || lang === "js") return highlightJS(code);
  if (lang === "python") return highlightPython(code);
  if (lang === "go") return highlightGo(code);
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
    navigator.clipboard.writeText(displayCode);
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
    curl: "curl",
    js: "javascript",
    python: "python",
    go: "go",
  };

  const highlightedCode = (() => {
    const langKey = examples ? langMap[activeLang] : language;
    return getHighlighted(displayCode, langKey);
  })();

  const hasSingleLine =
    displayCode.split("\n").filter(Boolean).length <= 3 &&
    displayCode.length < 80;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#0a0a0c] border border-white/[0.08] group ${hasSingleLine ? "not-prose" : ""}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent">
        <div className="flex items-center gap-1.5">
          {examples ? (
            <>
              {/* Terminal dot indicator */}
              <span className="hidden sm:flex gap-1.5 mr-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50 ring-1 ring-red-500/25" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 ring-1 ring-yellow-500/25" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50 ring-1 ring-green-500/25" />
              </span>
              {(Object.keys(examples) as Lang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                    activeLang === lang
                      ? "text-white/90 bg-white/[0.08] border border-white/[0.1] shadow-sm shadow-black/20"
                      : "text-white/25 hover:text-white/50 border border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                  {langLabels[lang]}
                </button>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-white/25" />
              <span className="text-[11px] font-mono text-white/25 uppercase tracking-wider">
                {language}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[11px] text-white/20 font-mono hidden sm:block">
              {title}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {copied ? (
              <span className="flex items-center gap-1 text-emerald-400/90">
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
      <pre className="p-5 overflow-x-auto font-mono text-[13px] leading-[1.7] text-white/70 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
        <code>
          {typeof highlightedCode === "string" ? displayCode : highlightedCode}
        </code>
      </pre>
    </div>
  );
};
