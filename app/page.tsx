"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClientSession, logoutUser, UserSession } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import {
  GitFork,
  ArrowRight,
  Cpu,
  ShieldAlert,
  Layers,
  Zap,
  LogOut,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Share2,
  FileCode,
  ShieldCheck,
  FolderGit2,
  Activity,
  Compass,
  LogIn,
} from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

// Left 3D tactile clay dependency cluster
function LeftClayCluster() {
  return (
    <div className="relative w-full h-[320px] flex items-center justify-center transition-transform duration-700 hover:scale-[1.02]">
      <svg
        viewBox="0 0 260 320"
        className="w-full h-full overflow-visible"
        style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.6))" }}
      >
        <defs>
          {/* Ivory Ceramic Clay */}
          <radialGradient id="left-ivory-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#ede7dc" />
            <stop offset="55%" stopColor="#c5bea8" />
            <stop offset="85%" stopColor="#756d5e" />
            <stop offset="100%" stopColor="#302b23" />
          </radialGradient>

          {/* Slate-Blue Ceramic Clay */}
          <radialGradient id="left-slate-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#a7bacc" />
            <stop offset="25%" stopColor="#677b8f" />
            <stop offset="60%" stopColor="#435363" />
            <stop offset="85%" stopColor="#293440" />
            <stop offset="100%" stopColor="#141a22" />
          </radialGradient>

          {/* Charcoal Slate Clay */}
          <radialGradient id="left-charcoal-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#616b7a" />
            <stop offset="25%" stopColor="#3c4551" />
            <stop offset="60%" stopColor="#252b34" />
            <stop offset="85%" stopColor="#161b22" />
            <stop offset="100%" stopColor="#0b0e12" />
          </radialGradient>

          {/* Desaturated Sage Green Clay */}
          <radialGradient id="left-sage-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#8ea89e" />
            <stop offset="25%" stopColor="#556e66" />
            <stop offset="60%" stopColor="#394c45" />
            <stop offset="85%" stopColor="#23302c" />
            <stop offset="100%" stopColor="#121a18" />
          </radialGradient>

          {/* Dark Teal Clay */}
          <radialGradient id="left-teal-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#5b7874" />
            <stop offset="25%" stopColor="#394e4b" />
            <stop offset="60%" stopColor="#233230" />
            <stop offset="85%" stopColor="#14201e" />
            <stop offset="100%" stopColor="#0a1110" />
          </radialGradient>

          {/* Soft Matte Sphere Shadow */}
          <filter id="clay-sphere-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="3" dy="9" stdDeviation="7" floodColor="#000000" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Tactile Wire Connectors */}
        <g stroke="#1b222c" strokeWidth="3.5" strokeLinecap="round">
          <line x1="172" y1="58" x2="128" y2="122" />
          <line x1="128" y1="122" x2="82" y2="188" />
          <line x1="128" y1="122" x2="178" y2="190" />
          <line x1="172" y1="58" x2="178" y2="190" />
          <line x1="82" y1="188" x2="178" y2="190" />
          <line x1="82" y1="188" x2="168" y2="260" />
          <line x1="178" y1="190" x2="168" y2="260" />
          <line x1="82" y1="188" x2="124" y2="268" />
          <line x1="124" y1="268" x2="168" y2="260" />
        </g>

        {/* Tactile 3D Clay Spheres */}
        {/* Node 1: Top Ivory Sphere */}
        <circle
          cx="172"
          cy="58"
          r="23"
          fill="url(#left-ivory-1)"
          filter="url(#clay-sphere-shadow)"
        />

        {/* Node 2: Upper-Left Slate-Blue Sphere */}
        <circle
          cx="128"
          cy="122"
          r="34"
          fill="url(#left-slate-1)"
          filter="url(#clay-sphere-shadow)"
        />

        {/* Node 3: Lower-Left Dark Charcoal Sphere */}
        <circle
          cx="82"
          cy="188"
          r="29"
          fill="url(#left-charcoal-1)"
          filter="url(#clay-sphere-shadow)"
        />

        {/* Node 4: Center-Right Muted Sage Green Sphere */}
        <circle
          cx="178"
          cy="190"
          r="20"
          fill="url(#left-sage-1)"
          filter="url(#clay-sphere-shadow)"
        />

        {/* Node 5: Bottom Cream/Ivory Sphere */}
        <circle
          cx="168"
          cy="260"
          r="27"
          fill="url(#left-ivory-1)"
          filter="url(#clay-sphere-shadow)"
        />

        {/* Node 6: Small Accent Teal Sphere */}
        <circle
          cx="124"
          cy="268"
          r="12"
          fill="url(#left-teal-1)"
          filter="url(#clay-sphere-shadow)"
        />
      </svg>
    </div>
  );
}

// Right 3D tactile clay dependency cluster
function RightClayCluster() {
  return (
    <div className="relative w-full h-[320px] flex items-center justify-center transition-transform duration-700 hover:scale-[1.02]">
      <svg
        viewBox="0 0 260 320"
        className="w-full h-full overflow-visible"
        style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.6))" }}
      >
        <defs>
          {/* Ivory Ceramic Clay */}
          <radialGradient id="right-ivory-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#ede7dc" />
            <stop offset="55%" stopColor="#c5bea8" />
            <stop offset="85%" stopColor="#756d5e" />
            <stop offset="100%" stopColor="#302b23" />
          </radialGradient>

          {/* Slate-Blue Ceramic Clay */}
          <radialGradient id="right-slate-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#a7bacc" />
            <stop offset="25%" stopColor="#677b8f" />
            <stop offset="60%" stopColor="#435363" />
            <stop offset="85%" stopColor="#293440" />
            <stop offset="100%" stopColor="#141a22" />
          </radialGradient>

          {/* Charcoal Slate Clay */}
          <radialGradient id="right-charcoal-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#616b7a" />
            <stop offset="25%" stopColor="#3c4551" />
            <stop offset="60%" stopColor="#252b34" />
            <stop offset="85%" stopColor="#161b22" />
            <stop offset="100%" stopColor="#0b0e12" />
          </radialGradient>

          {/* Desaturated Sage Green Clay */}
          <radialGradient id="right-sage-1" cx="34%" cy="30%" r="66%" fx="28%" fy="24%">
            <stop offset="0%" stopColor="#8ea89e" />
            <stop offset="25%" stopColor="#556e66" />
            <stop offset="60%" stopColor="#394c45" />
            <stop offset="85%" stopColor="#23302c" />
            <stop offset="100%" stopColor="#121a18" />
          </radialGradient>

          {/* Soft Matte Sphere Shadow */}
          <filter id="clay-sphere-shadow-r" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="3" dy="9" stdDeviation="7" floodColor="#000000" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Tactile Wire Connectors */}
        <g stroke="#1b222c" strokeWidth="3.5" strokeLinecap="round">
          <line x1="98" y1="112" x2="162" y2="198" />
          <line x1="152" y1="120" x2="162" y2="198" />
          <line x1="74" y1="182" x2="162" y2="198" />
          <line x1="98" y1="112" x2="74" y2="182" />
          <line x1="162" y1="198" x2="92" y2="258" />
          <line x1="74" y1="182" x2="92" y2="258" />
        </g>

        {/* Tactile 3D Clay Spheres */}
        {/* Node R1: Top-Left Slate-Blue Sphere */}
        <circle
          cx="98"
          cy="112"
          r="27"
          fill="url(#right-slate-1)"
          filter="url(#clay-sphere-shadow-r)"
        />

        {/* Node R2: Top-Right Small Ivory Sphere */}
        <circle
          cx="152"
          cy="120"
          r="14"
          fill="url(#right-ivory-1)"
          filter="url(#clay-sphere-shadow-r)"
        />

        {/* Node R3: Middle-Left Dark Charcoal Sphere */}
        <circle
          cx="74"
          cy="182"
          r="18"
          fill="url(#right-charcoal-1)"
          filter="url(#clay-sphere-shadow-r)"
        />

        {/* Node R4: Middle-Right Desaturated Sage Green Sphere */}
        <circle
          cx="162"
          cy="198"
          r="30"
          fill="url(#right-sage-1)"
          filter="url(#clay-sphere-shadow-r)"
        />

        {/* Node R5: Bottom-Left Large Cream/Ivory Sphere */}
        <circle
          cx="92"
          cy="258"
          r="31"
          fill="url(#right-ivory-1)"
          filter="url(#clay-sphere-shadow-r)"
        />
      </svg>
    </div>
  );
}

// 4-point matte clay star accent
function ClayStar() {
  return (
    <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-16 sm:h-16 overflow-visible">
      <defs>
        <radialGradient id="star-clay" cx="38%" cy="34%" r="65%" fx="32%" fy="28%">
          <stop offset="0%" stopColor="#7c899c" />
          <stop offset="35%" stopColor="#4f5968" />
          <stop offset="75%" stopColor="#2e3540" />
          <stop offset="100%" stopColor="#161b22" />
        </radialGradient>
        <filter id="star-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.65" />
        </filter>
      </defs>
      <path
        d="M 50 4 C 50 26, 26 50, 4 50 C 26 50, 50 74, 50 96 C 50 74, 74 50, 96 50 C 74 50, 50 26, 50 4 Z"
        fill="url(#star-clay)"
        filter="url(#star-shadow)"
      />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const updateSession = () => setSession(getClientSession());
    updateSession();
    window.addEventListener("cartofy_session_change", updateSession);
    return () => window.removeEventListener("cartofy_session_change", updateSession);
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
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setSession(getClientSession())}
      />

      {/* Top Floating Navigation Capsule */}
      <header className="w-full pt-5 px-4 sm:px-6 z-30 sticky top-0">
        <div className="max-w-5xl mx-auto clay-nav-capsule rounded-full px-3.5 sm:px-5 py-2.5 flex items-center justify-between">
          {/* Left: Brand Icon & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.5)] group-hover:border-white/10 transition-all">
              <GitFork className="w-4 h-4 transform rotate-90 text-zinc-300" />
            </div>
            <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
              CodeCartofy
            </span>
          </Link>

          {/* Right: Dashboard button, Profile pill, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="clay-button-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* User Profile or Login Trigger */}
            {session ? (
              <div className="flex items-center gap-2">
                <div
                  className="clay-pill-tag px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-zinc-200 font-medium"
                  title={session.name}
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 bg-[#1e2533] flex items-center justify-center text-[10px] font-bold text-sky-200 shadow-inner">
                    {session.avatarUrl ? (
                      <img
                        src={session.avatarUrl}
                        alt={session.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                        }}
                      />
                    ) : (
                      <span>{session.name ? session.name[0].toUpperCase() : "U"}</span>
                    )}
                  </div>
                  <span className="font-semibold text-zinc-200 tracking-tight hidden xs:inline sm:inline">
                    {session.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-xl bg-[#141720] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-white/10 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)] cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="clay-pill-tag hover:bg-[#1a202c] text-zinc-200 hover:text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Login to CodeCartofy"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 flex-1 flex flex-col justify-center">
        <div className="relative flex items-center justify-between w-full">
          {/* Left Flanking 3D Clay Dependency Cluster */}
          <div className="hidden md:block md:w-48 lg:w-60 xl:w-72 shrink-0 -mr-6 lg:-mr-8 xl:-mr-4 select-none pointer-events-none">
            <LeftClayCluster />
          </div>

          {/* Center Text & Interactive Carved Tray */}
          <div className="flex-1 max-w-2xl mx-auto text-center space-y-6 z-10 px-2 sm:px-4">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-white leading-[1.12]">
                Interactive Codebase &<br className="hidden sm:inline" /> Dependency Mapper
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-normal">
                Transform flat TypeScript and Web directories into interactive force-directed
                graph structures. Resolve module imports, pinpoint high-risk single points of
                failure, and catch circular import loops instantly.
              </p>
            </div>

            {/* Inset Physically Carved GitHub Input Bar */}
            <div className="w-full max-w-lg mx-auto pt-2">
              <form
                onSubmit={handleQuickGitHubSubmit}
                className="clay-recessed-input p-1.5 sm:p-2 rounded-2xl flex items-center gap-2 focus-within:border-zinc-700 transition-all"
              >
                <div className="pl-2.5 text-zinc-400 shrink-0">
                  <GitHubIcon className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  placeholder="Paste GitHub Repo URL (e.g. vercel/ai)..."
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono py-1 px-1 min-w-0"
                />
                <button
                  type="submit"
                  className="clay-button-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Analyze Repo
                </button>
              </form>

              {/* Inline Utility Tags */}
              {/* <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => setGithubUrl("vercel/ai")}
                  className="clay-pill-tag px-3.5 py-1 rounded-full text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Try vercel uploads
                </button>
                <div className="clay-pill-tag px-3.5 py-1 rounded-full text-[11px] font-mono text-zinc-400 select-none">
                  Operates with client-side AST privacy
                </div>
              </div> */}
            </div>

            {/* Elevated Cushioned CTA Button */}
            <div className="pt-2 flex justify-center">
              <Link
                href="/dashboard"
                className="clay-button-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Flanking 3D Clay Dependency Cluster */}
          <div className="hidden md:block md:w-48 lg:w-60 xl:w-72 shrink-0 -ml-6 lg:-ml-8 xl:-ml-4 select-none pointer-events-none">
            <RightClayCluster />
          </div>
        </div>
      </main>

      {/* Feature Cards Section (At Bottom) */}
      <section className="w-full relative mt-6">
        {/* Soft 4-Point Matte Clay Star Accent */}
        <div className="max-w-6xl mx-auto px-6 relative flex justify-end">
          <div className="absolute -top-10 sm:-top-14 right-6 sm:right-10 z-20 pointer-events-none select-none">
            <ClayStar />
          </div>
        </div>

        {/* Deep Slate Heavily Rounded Container */}
        <div className="clay-container-deep rounded-t-[2.5rem] sm:rounded-t-[3.5rem] pt-10 pb-16 px-6 sm:px-10 border-b-0 max-w-6xl mx-auto">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Core Architecture Features
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Minimalist AST parsing and graph intelligence
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Card 1 */}
              <div className="clay-card-raised p-6 rounded-2xl space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                  <Cpu className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                  AST Babel Parser
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Extracts import declarations and dynamic statements with full TypeScript and JSX support.
                </p>
              </div>

              {/* Card 2 */}
              <div className="clay-card-raised p-6 rounded-2xl space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                  <ShieldAlert className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                  DFS Cycle Detector
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Depth-First Search recursion stack algorithm pinpoints circular dependency loops.
                </p>
              </div>

              {/* Card 3 */}
              <div className="clay-card-raised p-6 rounded-2xl space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                  <Layers className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                  2D Physics Graph
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Canvas force simulation with fan-in node scaling and interactive directional particle links.
                </p>
              </div>

              {/* Card 4 */}
              <div className="clay-card-raised p-6 rounded-2xl space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                  <Zap className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                  AI Copilot Audit
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  Evaluates codebase health, modularity, single points of failure, and actionable refactoring advice.
                </p>
              </div>
            </div>

            {/* Quick Demo Mode Banner in tactile clay styling */}
            <div className="pt-2">
              <div className="p-6 sm:p-7 rounded-2xl bg-[#0e1116] border border-white/5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-zinc-300 text-[11px] font-mono">
                    <Sparkles className="w-3 h-3 text-zinc-300" />
                    <span>Instant Architectural Testbed</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    Explore CodeCartofy with preloaded repositories
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Test AST parsing, cycle loops, and force simulation in zero-setup demo mode.
                  </p>
                </div>
                <Link
                  href="/cartofy?demo=true"
                  className="clay-button-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                  <span>Launch Demo Mode</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase: 3D Tactile Topology */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-[11px] font-mono">
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
            <span>TACTILE AST GRAPH VISUALIZATION</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            See Your Entire Codebase in Physical Space
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
            Flat file directories obscure real architectural coupling. CodeCartofy translates module imports into an interconnected physical clay topology where circular loops, shared utilities, and dependency bottlenecks become immediately tangible.
          </p>
        </div>

        {/* Showcase Bezel with Generated Clay Graph Image */}
        <div className="clay-container-deep p-3 sm:p-5 rounded-[2.5rem] relative overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_12px_32px_rgba(0,0,0,0.6)]">
            <img
              src="/clay_dependency_graph.jpg"
              alt="3D Tactile Clay Dependency Topology"
              className="w-full h-auto object-cover max-h-[520px]"
            />
            {/* Subtle Overlay Badges */}
            <div className="absolute top-4 left-4 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-pill-tag bg-[#0a0c10]/90 backdrop-blur-md text-[11px] font-mono text-zinc-300">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              <span>Real-Time D3 Physics Engine</span>
            </div>
            <div className="absolute bottom-4 right-4 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-pill-tag bg-[#0a0c10]/90 backdrop-blur-md text-[11px] font-mono text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Client-Side AST Sandbox</span>
            </div>
          </div>

          {/* Showcase Value Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="clay-card-raised p-5 rounded-2xl space-y-1.5">
              <h4 className="text-xs sm:text-sm font-semibold text-white">Dynamic Mass Sizing</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Nodes automatically expand in physical radius based on inbound dependency fan-in, spotlighting your most critical foundations.
              </p>
            </div>
            <div className="clay-card-raised p-5 rounded-2xl space-y-1.5">
              <h4 className="text-xs sm:text-sm font-semibold text-white">Instant Cycle Highlighting</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                DFS algorithms continuously trace module paths, isolating hazardous circular imports in warning indicators before build crashes.
              </p>
            </div>
            <div className="clay-card-raised p-5 rounded-2xl space-y-1.5">
              <h4 className="text-xs sm:text-sm font-semibold text-white">Zero-Knowledge Privacy</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                AST tokenization and vector physics run entirely on your local machine via in-browser Web Workers. Zero code touches external servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Interactive Architecture Pipeline */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-12">
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-[11px] font-mono">
            <span>HOW IT WORKS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for Architectural Clarity
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            From raw TypeScript source files to interactive graph intelligence in three frictionless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="clay-card-raised p-7 rounded-3xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-zinc-500">01</span>
                <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
                  <Cpu className="w-5 h-5 text-zinc-300" />
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Client-Side AST Parsing
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Zero code leaves your browser. CodeCartofy initiates an in-browser Babel worker thread to traverse ES module import declarations, dynamic <code className="text-zinc-200">import()</code>, CommonJS <code className="text-zinc-200">require</code>, and TSX component hierarchies.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5">
              <span className="text-[11px] font-mono text-zinc-400">
                ⚡ &lt; 350ms parse time for 1,000+ files
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="clay-card-raised p-7 rounded-3xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-zinc-500">02</span>
                <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
                  <Layers className="w-5 h-5 text-zinc-300" />
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Spring Force Physics Graph
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Every module becomes a physical ceramic node. Node radii scale proportionally with in-degree fan-in connectivity, while electrostatic repulsion separates architectural boundaries into intuitive cluster maps.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5">
              <span className="text-[11px] font-mono text-zinc-400">
                🎯 60 FPS hardware accelerated canvas
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="clay-card-raised p-7 rounded-3xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-zinc-500">03</span>
                <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
                  <ShieldAlert className="w-5 h-5 text-zinc-300" />
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Cycle Detection & Copilot Audit
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                Depth-First Search recursion algorithms trace directed graph cycles. High-risk circular loops are immediately illuminated with step-by-step traversal stacks and actionable refactoring recommendations.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5">
              <span className="text-[11px] font-mono text-zinc-400">
                🛡️ Instant cycle loop detection
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Codebase Health & Capabilities Matrix */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-[11px] font-mono">
            <span>ARCHITECTURAL CAPABILITIES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Comprehensive Codebase Diagnostics
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Purpose-built tools to preserve modularity, prevent runtime import crashes, and accelerate refactoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="clay-card-raised p-7 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Circular Dependency Detection
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Catch hazardous A → B → C → A dependency chains before they trigger undefined runtime exports, Next.js hydration failures, or webpack chunk memory leaks.
            </p>
          </div>

          <div className="clay-card-raised p-7 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
              <Zap className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Single Point of Failure (SPOF) Analysis
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Pinpoint high-risk core modules that support an outsized proportion of downstream components. Safeguard your most critical architectural foundations against regression.
            </p>
          </div>

          <div className="clay-card-raised p-7 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
              <FileCode className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Orphan & Dead Code Identification
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Discover unreferenced helper utilities, abandoned UI components, and obsolete test fixtures with zero inbound imports to safely prune repository weight.
            </p>
          </div>

          <div className="clay-card-raised p-7 rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f1218] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
              <Share2 className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Vector SVG & Graph JSON Export
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Export high-resolution architecture diagrams for engineering RFCs, system design docs, and team onboarding in scalable vector SVG, PNG, or JSON matrix formats.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Benchmark Comparison Table */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-[11px] font-mono">
            <span>TOOLING COMPARISON</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Why Developers Choose CodeCartofy
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            How CodeCartofy redefines codebase architecture visualization against traditional alternatives.
          </p>
        </div>

        <div className="clay-container-deep rounded-3xl p-5 sm:p-8 overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-mono text-[11px] uppercase">
                <th className="pb-4 font-semibold">Architectural Dimension</th>
                <th className="pb-4 font-semibold text-white">CodeCartofy</th>
                <th className="pb-4 font-semibold">Traditional CLI Tools</th>
                <th className="pb-4 font-semibold">Cloud Static Linters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              <tr>
                <td className="py-4 font-medium text-white">Visual Spatial Topology</td>
                <td className="py-4 text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Interactive 2D Physics Canvas</span>
                </td>
                <td className="py-4 text-zinc-400">Flat ASCII terminal text</td>
                <td className="py-4 text-zinc-400">None (flat table reports)</td>
              </tr>
              <tr>
                <td className="py-4 font-medium text-white">Circular Import Pinpointing</td>
                <td className="py-4 text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Visual Cycle Stack Highlighting</span>
                </td>
                <td className="py-4 text-zinc-400">Cryptic stack traces</td>
                <td className="py-4 text-zinc-400">Static rule warnings</td>
              </tr>
              <tr>
                <td className="py-4 font-medium text-white">Source Code Privacy</td>
                <td className="py-4 text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>100% Client-Side AST Worker</span>
                </td>
                <td className="py-4 text-zinc-400">Local terminal only</td>
                <td className="py-4 text-zinc-400">Code uploaded to cloud servers</td>
              </tr>
              <tr>
                <td className="py-4 font-medium text-white">Zero-Setup Speed</td>
                <td className="py-4 text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Instant in Browser (&lt; 5s)</span>
                </td>
                <td className="py-4 text-zinc-400">npm install + config files</td>
                <td className="py-4 text-zinc-400">CI/CD pipeline integration</td>
              </tr>
              <tr>
                <td className="py-4 font-medium text-white">Fan-In Mass Proportionality</td>
                <td className="py-4 text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Node Gravity</span>
                </td>
                <td className="py-4 text-zinc-400">Manual reference counting</td>
                <td className="py-4 text-zinc-400">Complex report export</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Frequently Asked Questions (Interactive Tactile Accordion) */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-10">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-[11px] font-mono">
            <span>COMMON QUESTIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Everything you need to know about privacy, AST parsing, and graph mechanics.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Does CodeCartofy upload or store my source code?",
              a: "Never. CodeCartofy operates on a strict zero-knowledge client-side privacy model. All Babel AST token parsing and graph vertex algorithms occur locally within your browser's Web Worker. Zero code bytes ever leave your machine.",
            },
            {
              q: "Can I analyze private repositories or local directories?",
              a: "Yes! In Cartofy Studio, you can drag and drop your local folder directly into the browser to map it with 100% client-side privacy, or connect your public GitHub handle from your personalized dashboard.",
            },
            {
              q: "Which file extensions and module systems are supported?",
              a: "CodeCartofy supports TypeScript (.ts, .tsx), JavaScript (.js, .jsx), ES Modules (import/export), CommonJS (require), dynamic asynchronous imports (import()), Next.js App Router, React, Vue, Vite, and Node.js architectures.",
            },
            {
              q: "How does the circular import detector work?",
              a: "It executes a recursive Depth-First Search (DFS) algorithm with an active recursion stack over the directed import graph. When an import path references an ancestor in the active call stack, the back-edge is tagged and highlighted in the graph.",
            },
            {
              q: "Can I export architectural graphs for system design documentation?",
              a: "Yes. With a single click, you can export your graph as a lossless vector SVG, crystal-clear PNG screenshot, or structured JSON dependency matrix for engineering RFCs and team onboarding.",
            },
          ].map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="clay-card-raised rounded-2xl p-5 cursor-pointer transition-all"
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                    {item.q}
                  </h3>
                  <button className="w-6 h-6 rounded-lg clay-pill-tag flex items-center justify-center text-zinc-400 shrink-0">
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {isOpen && (
                  <p className="mt-3 text-xs text-zinc-400 leading-relaxed font-normal pt-2 border-t border-white/5 animate-fadeIn">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Grand Final Call to Action Chassis */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="clay-container-deep p-8 sm:p-14 rounded-[2.5rem] text-center space-y-6 relative overflow-hidden">
          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Ready to Map Your Codebase Architecture?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
              Untangle dependency loops, inspect module relationships, and build cleaner, more resilient web applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/dashboard"
              className="clay-button-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/cartofy?demo=true"
              className="clay-pill-tag px-5 py-3 rounded-2xl text-xs sm:text-sm text-zinc-300 hover:text-white font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Launch Demo Mode</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-500 pt-2">
            <span>✓ Zero Setup Required</span>
            <span>•</span>
            <span>✓ 100% Client-Side Privacy</span>
            <span>•</span>
            <span>✓ Open Source Friendly</span>
          </div>
        </div>
      </section>

      {/* Minimalist Tactile Obsidian Footer */}
      <footer className="border-t border-white/5 bg-[#0a0c10] px-6 py-6 z-10 relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#141820] border border-white/5 flex items-center justify-center text-zinc-300">
              <GitFork className="w-3.5 h-3.5 transform rotate-90" />
            </div>
            <span className="font-bold text-xs tracking-tight text-white">
              CODECARTOFY
            </span>
          </div>

          <div className="text-zinc-500 font-mono text-[11px] text-center">
            © 2026 CODECARTOFY. Tactile Architecture & Dependency Mapper.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400">
            <Link href="/cartofy" className="hover:text-white transition-colors">
              App
            </Link>
            <Link href="/cartofy?repo=circular-loop-demo" className="hover:text-white transition-colors">
              Samples
            </Link>
            <Link href="/cartofy?repo=ui-design-system" className="hover:text-white transition-colors">
              AST Engine
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


