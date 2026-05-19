"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function highlightJson(code: string): JSX.Element {
  const parts: JSX.Element[] = [];
  const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+\.?\d*\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-sky-300">{match[1]}</span>);
      parts.push(<span key={key++}>:</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-purple-300">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[5]}</span>);
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
  const regex = /(^|\s)(curl|echo|export|cd|mkdir|npm|node|python|go)(?=\s|$)|("(?:[^"\\]|\\.)*")|(-[a-zA-Z]|--[a-zA-Z-]+)|((?:https?:\/\/|localhost)\S*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[2]) {
      parts.push(<span key={key++} className="text-green-300 font-semibold">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-blue-300">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-cyan-300 underline underline-offset-2 decoration-white/10">{match[5]}</span>);
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
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(def|import|from|class|return|if|else|elif|for|while|print|try|except|as|with|in|not|and|or|True|False|None)\b)|(#.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
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
  const regex = /("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b(func|package|import|return|if|else|for|range|var|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue|nil|true|false|err|error|string|int|bool|float64|any)\b)|(\/\/.*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
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
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(const|let|var|function|async|await|return|import|from|export|default|if|else|for|of|in|try|catch|throw|new|class|extends|this|typeof|instanceof|true|false|null|undefined|Promise|console|fetch)\b)|(\/\/.*)|(\b\d+\.?\d*\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{code.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={key++} className="text-amber-200/90">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={key++} className="text-purple-300 font-semibold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-white/20 italic">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={key++} className="text-emerald-300">{match[5]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < code.length) {
    parts.push(<span key={key++}>{code.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

export function getHighlighted(code: string, lang: string): JSX.Element | string {
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

  const displayCode =
    examples ? examples[activeLang] : code ?? "";

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

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-950 border border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-1">
          {examples ? (
            (Object.keys(examples) as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                  activeLang === lang
                    ? "text-white/80 bg-white/[0.06]"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {langLabels[lang]}
              </button>
            ))
          ) : (
            <span className="text-xs font-mono text-white/25 uppercase tracking-wider">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[11px] text-white/20 font-mono hidden sm:block">{title}</span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-white/30 hover:text-white/60 transition-colors"
          >
            {copied ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Copied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </span>
            )}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-white/70">
        <code>
          {typeof highlightedCode === "string" ? displayCode : highlightedCode}
        </code>
      </pre>
    </div>
  );
};
