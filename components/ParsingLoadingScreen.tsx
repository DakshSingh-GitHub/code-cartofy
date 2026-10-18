"use client";

import React, { useState, useEffect } from "react";
import {
  GitFork,
  Cpu,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { formatRepoTitle } from "@/lib/storage";

interface ParsingLoadingScreenProps {
  repoName: string;
}

const PARSING_STAGES = [
  {
    title: "Scanning Repository Tree",
    description: "Filtering source modules, JSON manifests, and route endpoints",
  },
  {
    title: "Parsing Abstract Syntax Trees (AST)",
    description: "Extracting import declarations, require statements, and dynamic calls",
  },
  {
    title: "Constructing Dependency Graph",
    description: "Mapping bidirectional source-to-target dependency edges",
  },
  {
    title: "Running DFS Cycle Audit",
    description: "Tracing recursion stacks to identify circular architectural loops",
  },
];

export function ParsingLoadingScreen({ repoName }: ParsingLoadingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);

  // Cycle through the pipeline stages smoothly to give dynamic real-time feedback
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage((prev) => (prev < PARSING_STAGES.length - 1 ? prev + 1 : prev));
    }, 450);

    return () => clearInterval(timer);
  }, []);

  const displayTitle = formatRepoTitle(repoName) || "Repository";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c0e12]/90 backdrop-blur-md p-4 sm:p-6 animate-fadeIn select-none font-sans">
      <div className="clay-container-deep border border-white/10 rounded-3xl p-6 sm:p-9 max-w-lg w-full text-center space-y-6 shadow-2xl relative">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-pill-tag text-xs font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[10px] text-emerald-400">
            AST Engine Active
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-sans truncate max-w-[180px] font-medium">
            {displayTitle}
          </span>
        </div>

        {/* Central Tactile Squircle Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 rounded-3xl bg-[#1b212c] border border-white/10 flex items-center justify-center mx-auto text-zinc-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.6)]">
            <GitFork className="w-9 h-9 transform rotate-90 text-zinc-200 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl clay-button-white flex items-center justify-center text-zinc-950 shadow-md">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          </div>
        </div>

        {/* Headline & Target */}
        <div className="space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mapping Architecture Graph
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto font-normal">
            Babel AST parser is tracing module vectors, dependencies, and circular loops.
          </p>
        </div>

        {/* Tactile Recessed Progress Bar */}
        <div className="space-y-1.5">
          <div className="clay-recessed-input p-1 rounded-full h-3 w-full overflow-hidden relative">
            <div
              className="clay-button-white h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, (currentStage + 1) * 25)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1">
            <span>Stage {currentStage + 1} of 4</span>
            <span>{Math.min(100, (currentStage + 1) * 25)}% completed</span>
          </div>
        </div>

        {/* 4 Pipeline Stages Checklist */}
        <div className="space-y-2 text-left font-mono">
          {PARSING_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentStage;
            const isCurrent = idx === currentStage;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? "clay-card-raised border-white/15 text-white"
                    : isCompleted
                    ? "bg-[#10141c]/60 border-white/5 text-zinc-300"
                    : "bg-[#0c0e12]/40 border-transparent text-zinc-600 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-200" />
                    ) : (
                      <span className="text-[10px] text-zinc-600 font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className={`text-xs font-semibold truncate ${isCurrent ? "text-white" : isCompleted ? "text-zinc-200" : "text-zinc-500"}`}>
                      {stage.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate font-sans">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : isCurrent
                      ? "bg-white/10 text-white border border-white/20 animate-pulse"
                      : "text-zinc-600"
                  }`}
                >
                  {isCompleted ? "Done" : isCurrent ? "Active" : "Queued"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Privacy & Engine Footer */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>100% Client-Side AST Execution • Code Remains Private</span>
        </div>
      </div>
    </div>
  );
}
