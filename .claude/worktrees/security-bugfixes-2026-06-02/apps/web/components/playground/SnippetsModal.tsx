"use client";

import { X, Search, BookOpen, Code2, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { codeSnippets, CodeSnippet, getAllCategories } from "./CodeSnippets";

interface SnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelectSnippet: (snippet: CodeSnippet) => void;
}

export default function SnippetsModal({
  isOpen,
  onClose,
  currentLanguage,
  onSelectSnippet,
}: SnippetsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...getAllCategories()];

  const filteredSnippets = useMemo(() => {
    let snippets = codeSnippets.filter((s) => s.language === currentLanguage);

    if (selectedCategory !== "All") {
      snippets = snippets.filter((s) => s.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      snippets = snippets.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query),
      );
    }

    return snippets;
  }, [currentLanguage, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Code Snippets</h2>
              <p className="text-sm text-gray-400">
                Browse and insert ready-to-use code examples
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-4 border-b border-white/10 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-white placeholder-gray-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Snippets List */}
        <div className="flex-1 overflow-y-auto p-6 hero-scroll">
          {filteredSnippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Code2 className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">No snippets found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => {
                    onSelectSnippet(snippet);
                    onClose();
                  }}
                  className="text-left p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                      {snippet.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                      {snippet.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {snippet.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Sparkles className="w-3 h-3" />
                    <span>Click to insert</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
