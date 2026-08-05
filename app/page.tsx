"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { getClientSession, logoutUser, UserSession } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import {
  GitFork,
  ArrowRight,
  Code2,
  Layers,
  Cpu,
  ShieldAlert,
  Zap,
  UserCheck,
  LogOut,
  LogIn,
} from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  const handleQuickGitHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubUrl.trim()) {
      const clean = githubUrl.replace(/^https?:\/\/github\.com\//, "").trim();
      router.push(`/cartofy?github=${encodeURIComponent(clean)}`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setSession(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between">
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setSession(getClientSession())}
      />

      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-black/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <GitFork className="w-4 h-4 transform rotate-90" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white">
              CodeCartofy
            </span>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-2.5">
                <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 flex items-center gap-2 font-mono shadow-sm">
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-zinc-700 bg-zinc-950 flex items-center justify-center">
                    <img
                      src={session.avatarUrl || "/vlyxir/favicon.png"}
                      alt={session.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                      }}
                    />
                  </div>
                  <span className="font-semibold text-zinc-100">{session.name}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md border border-zinc-800 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Login / Sign up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 flex-1 flex flex-col items-center justify-center">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Interactive Codebase & Dependency Mapper
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Transform flat TypeScript and Web directories into interactive force-directed graph structures. Resolve module imports, pinpoint high-risk single points of failure, and catch circular import loops instantly.
          </p>
        </div>

        {/* GitHub Ingestion Input Form */}
        <div className="w-full max-w-lg pt-2">
          <form
            onSubmit={handleQuickGitHubSubmit}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 transition-all shadow-sm"
          >
            <div className="pl-3 text-zinc-400">
              <GitHubIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Paste GitHub Repo URL (e.g. vercel/ai)..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono py-1"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-all shrink-0 cursor-pointer"
            >
              Analyze Repo
            </button>
          </form>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">
            Zero server uploads. Operates with client-side AST privacy.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/cartofy"
            className="px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-all flex items-center gap-2"
          >
            <span>Open Graph Canvas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/cartofy?repo=circular-loop-demo"
            className="px-5 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium font-mono transition-all flex items-center gap-2"
          >
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Try Circular Loop Demo</span>
          </Link>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="border-t border-zinc-800/80 bg-zinc-950/60 py-16">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-white tracking-tight">Core Architecture Features</h2>
            <p className="text-xs text-zinc-400">Minimalist AST parsing and graph intelligence</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <Cpu className="w-5 h-5 text-zinc-300" />
              <h3 className="text-xs font-semibold text-white">AST Babel Parser</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Extracts import declarations and dynamic statements with full TypeScript and JSX support.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <ShieldAlert className="w-5 h-5 text-zinc-300" />
              <h3 className="text-xs font-semibold text-white">DFS Cycle Detector</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Depth-First Search recursion stack algorithm pinpoints circular dependency loops.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <Layers className="w-5 h-5 text-zinc-300" />
              <h3 className="text-xs font-semibold text-white">2D Physics Graph</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Canvas force simulation with fan-in node scaling and interactive directional particle links.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
              <Zap className="w-5 h-5 text-zinc-300" />
              <h3 className="text-xs font-semibold text-white">AI Copilot Audit</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Evaluates codebase health, modularity, single points of failure, and actionable refactoring advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-loaded Sample Architectures */}
      <section className="border-t border-zinc-800/80 py-16">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-white tracking-tight">Pre-loaded Codebases</h2>
            <p className="text-xs text-zinc-400">Select any sample codebase to analyze its dependency graph</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {SAMPLE_REPOSITORIES.map((repo) => (
              <Link
                key={repo.id}
                href={`/cartofy?repo=${repo.id}`}
                className="p-5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {repo.category}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {repo.files.length} Files
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-zinc-200 transition-all">
                    {repo.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {repo.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-all">
                  <span>Explore Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Minimalist Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950/80 px-6 py-5 z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
              <GitFork className="w-3.5 h-3.5 transform rotate-90" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              CODECARTOFY
            </span>
          </div>

          {/* Center: Copyright & Tagline */}
          <div className="text-zinc-500 font-mono text-[11px] text-center">
            © 2026 CODECARTOFY. Built with passion for the developer community.
          </div>

          {/* Right: Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-zinc-400">
            <Link href="/cartofy" className="hover:text-white transition-colors">
              Interactive App
            </Link>
            <Link href="/cartofy?repo=circular-loop-demo" className="hover:text-white transition-colors">
              Sample Repos
            </Link>
            <Link href="/cartofy?repo=ui-design-system" className="hover:text-white transition-colors">
              AST Engine
            </Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              GitHub Repo
            </a>
            <span className="hover:text-white transition-colors cursor-pointer">
              Meet Developer
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
