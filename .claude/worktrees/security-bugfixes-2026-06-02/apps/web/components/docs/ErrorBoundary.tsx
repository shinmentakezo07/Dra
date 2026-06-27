"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.15] flex items-center justify-center mb-5 shadow-lg shadow-red-500/[0.05]">
            <AlertTriangle className="w-6 h-6 text-red-400/80" />
          </div>
          <h2 className="text-lg font-semibold text-white/80 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-white/35 max-w-md mb-6 leading-relaxed">
            This page encountered an unexpected error. Try refreshing, or
            navigate to another page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/55 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Page
          </button>
          {this.state.error && (
            <details className="mt-6 max-w-lg">
              <summary className="text-xs text-white/15 cursor-pointer hover:text-white/30 transition-colors font-mono">
                Error details
              </summary>
              <pre className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-red-400/60 font-mono text-left overflow-x-auto whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
