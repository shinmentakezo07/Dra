"use client";

import { X, Share2, Copy, Check, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
}

export default function ShareModal({ isOpen, onClose, code, language }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateShareLink = async () => {
    setIsGenerating(true);
    
    // Simulate share link generation (in real app, call API)
    const encoded = btoa(JSON.stringify({ code, language }));
    const url = `${window.location.origin}/playground?share=${encoded.slice(0, 50)}...`;
    setShareUrl(url);
    
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Share Code</h2>
              <p className="text-sm text-gray-400">Share your code with others</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Copy Code */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Copy Code
            </label>
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="text-sm text-white">Copy code to clipboard</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          {/* Generate Link */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Share Link
            </label>
            {!shareUrl ? (
              <button
                onClick={generateShareLink}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium"
              >
                <LinkIcon className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate Share Link"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-300 outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Note: Share functionality is a demo. In production, this would generate a real shareable link.
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 Share links are read-only. Recipients can view and copy your code but cannot modify the original.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
