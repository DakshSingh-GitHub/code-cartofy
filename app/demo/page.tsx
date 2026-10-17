"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import {
  GitFork,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  ShoppingBag,
  Palette,
  Layers,
  ShieldCheck,
  Check,
  Home,
  LayoutDashboard,
} from "lucide-react";

function DemoContent() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-black/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <GitFork className="w-4 h-4 transform rotate-90 text-indigo-400" />
              </div>
              <span className="font-semibold text-base tracking-tight text-white">
                CodeCartofy
              </span>
            </Link>

            <span className="text-zinc-700 font-mono text-xs">/</span>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>DEMO MODE</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 font-mono"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 space-y-12">
        {/* Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Demo Mode Playground</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pre-loaded Architectural Testbeds
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Test-drive CodeCartofy&apos;s AST dependency engine and circular cycle detection without needing to connect a GitHub repository or sign in.
          </p>
        </div>

        {/* Preloaded Repositories Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {SAMPLE_REPOSITORIES.map((repo) => {
            const isLoopDemo = repo.id === "circular-loop-demo";
            const isEcommerce = repo.id === "nextjs-ecommerce";

            return (
              <div
                key={repo.id}
                className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-6 group relative overflow-hidden shadow-xl"
              >
                {/* Ambient glow */}
                <div
                  className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                    isLoopDemo
                      ? "bg-amber-500/10"
                      : isEcommerce
                      ? "bg-indigo-500/10"
                      : "bg-emerald-500/10"
                  }`}
                />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        isLoopDemo
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : isEcommerce
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {isLoopDemo ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isEcommerce ? (
                        <ShoppingBag className="w-5 h-5" />
                      ) : (
                        <Palette className="w-5 h-5" />
                      )}
                    </div>

                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {repo.category}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-white group-hover:text-zinc-100 transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {repo.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs font-mono text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{repo.files.length} Modules</span>
                    </div>
                    {isLoopDemo && (
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Has Circular Cycle</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/cartofy?demo=true&repo=${repo.id}`}
                  className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg relative z-10 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Launch in Demo Mode</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Feature Highlights for Demo Mode */}
        <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800/80 grid sm:grid-cols-3 gap-6 text-xs text-zinc-400">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Zero Authentication</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Explore full interactive dependency graphs immediately without registering an account.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">DFS Cycle Detection</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Test the Depth-First Search cycle tracer with the Circular Loop demo codebase.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-indigo-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">Client-Side Privacy</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                AST parsing executes strictly inside your browser sandbox with no external code telemetry.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950/80 px-6 py-5 text-xs text-zinc-500 font-mono text-center">
        Demo Mode is strictly for architectural evaluation. Repositories here are pre-loaded testbeds.
      </footer>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DemoContent />
    </Suspense>
  );
}
