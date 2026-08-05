"use client";

import React, { useState } from "react";
import { Loader2, X, AlertCircle } from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchRepo: (repoUrl: string) => Promise<void>;
}

export function GitHubModal({ isOpen, onClose, onFetchRepo }: GitHubModalProps) {
  const [repoInput, setRepoInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await onFetchRepo(repoInput);
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to fetch repository.");
    }
  };

  const sampleRepos = [
    { label: "Vercel AI SDK", slug: "vercel/ai" },
    { label: "Zustand", slug: "pmndrs/zustand" },
    { label: "Lucide Icons", slug: "lucide-icons/lucide" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 w-full max-w-md rounded-lg p-6 border border-zinc-800 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-900 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <GitHubIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Import GitHub Repository</h3>
            <p className="text-xs text-zinc-400">Parse AST for public JS/TS repositories</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Repository URL or Slug</label>
            <input
              type="text"
              placeholder="e.g. vercel/ai or owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 rounded px-3 py-2 focus:outline-none focus:border-zinc-700 transition-all"
              autoFocus
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-500 font-sans">Quick select:</span>
            <div className="flex flex-wrap gap-2">
              {sampleRepos.map((sample) => (
                <button
                  key={sample.slug}
                  type="button"
                  onClick={() => setRepoInput(sample.slug)}
                  className="text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-800 transition-all font-mono"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !repoInput.trim()}
              className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching AST...</span>
                </>
              ) : (
                <span>Ingest Repo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
