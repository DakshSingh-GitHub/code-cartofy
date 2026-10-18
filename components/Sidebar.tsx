"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GraphData, GraphNode, CopilotReport, SinglePointOfFailure, AiFixRecord } from "@/lib/types";
import { generateArchitecturalCopilotReport } from "@/lib/aiCopilot";
import { getShortLabel } from "@/lib/graphParser";
import { getUserAiFixHistory, deleteAiFixFromHistory } from "@/lib/storage";
import {
  Info,
  AlertTriangle,
  Sparkles,
  Sliders,
  FileCode,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
  ShieldAlert,
  X,
  Layers,
  ChevronRight,
  History,
  ExternalLink,
  Trash2,
  GitPullRequest,
  Check,
  ClipboardList,
} from "lucide-react";

interface SidebarProps {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  showCyclesOnly: boolean;
  onToggleCyclesOnly: (val: boolean) => void;
  spotlightCycleNodes: string[] | null;
  onSpotlightCycle: (nodes: string[] | null) => void;
  onOpenInspectorModalWithFile: (fileId: string) => void;
  onOpenSpofModal?: (
    spof: SinglePointOfFailure | GraphNode,
    dependents: GraphNode[] | string[],
    fixRecord?: AiFixRecord | null
  ) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  repoId?: string;
  repoName?: string;
}

export function Sidebar({
  graphData,
  selectedNode,
  onSelectNode,
  showCyclesOnly,
  onToggleCyclesOnly,
  spotlightCycleNodes,
  onSpotlightCycle,
  onOpenInspectorModalWithFile,
  onOpenSpofModal,
  isMobileOpen = false,
  onCloseMobile,
  repoId,
  repoName,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"inspector" | "cycles" | "copilot" | "controls" | "history">(
    selectedNode ? "inspector" : "copilot"
  );
  const [fixHistory, setFixHistory] = useState<AiFixRecord[]>([]);
  const [deletingFixId, setDeletingFixId] = useState<string | null>(null);

  // Filter history to ONLY show fixes from the current repository in Cartofy
  const currentRepoFixes = React.useMemo(() => {
    if (!repoId && !repoName) return fixHistory;
    const cleanCurrentName = (repoName || "").replace(/^GitHub:\s*/i, "").trim().toLowerCase();
    const cleanCurrentId = (repoId || "").toLowerCase();

    return fixHistory.filter((fix) => {
      const fixRepoId = (fix.repoId || "").toLowerCase();
      const fixRepoName = (fix.repoName || "").replace(/^GitHub:\s*/i, "").trim().toLowerCase();

      return (
        (cleanCurrentId && fixRepoId === cleanCurrentId) ||
        (cleanCurrentName && fixRepoName === cleanCurrentName) ||
        (cleanCurrentId && fixRepoName === cleanCurrentId) ||
        (cleanCurrentName && fixRepoId === cleanCurrentName)
      );
    });
  }, [fixHistory, repoId, repoName]);

  // Resizable Sidebar width state (default 440px on desktop)
  const [sidebarWidth, setSidebarWidth] = useState<number>(440);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Initialize saved width from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cartofy_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 800) {
          setSidebarWidth(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Resize handler using pointer events
  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const windowWidth = window.innerWidth;
      // Distance from right edge of window
      const newWidth = windowWidth - moveEvent.clientX;
      const clamped = Math.min(Math.max(newWidth, 280), Math.min(windowWidth * 0.75, 760));
      setSidebarWidth(clamped);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setSidebarWidth((latest) => {
        try {
          localStorage.setItem("cartofy_sidebar_width", latest.toString());
        } catch {
          // ignore
        }
        return latest;
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);

  // Breakpoint where tabs turn into icon-only navigator (below 430px)
  const isCompactTabs = sidebarWidth < 430;

  // Switch to inspector when a node is explicitly selected
  const [prevSelectedNodeId, setPrevSelectedNodeId] = useState<string | null>(null);
  if (selectedNode && selectedNode.id !== prevSelectedNodeId) {
    setPrevSelectedNodeId(selectedNode.id);
    setActiveTab("inspector");
  }

  // Load and subscribe to AI fix history for the active user
  useEffect(() => {
    let isCancelled = false;
    getUserAiFixHistory()
      .then((records) => {
        if (!isCancelled) setFixHistory(records);
      })
      .catch((err) => console.warn("Failed to retrieve user AI fixes:", err));

    const handleHistoryUpdate = () => {
      getUserAiFixHistory()
        .then((records) => {
          if (!isCancelled) setFixHistory(records);
        })
        .catch((err) => console.warn("Failed to retrieve user AI fixes:", err));
    };

    window.addEventListener("cartofy_aifix_change", handleHistoryUpdate);
    window.addEventListener("storage", handleHistoryUpdate);
    return () => {
      isCancelled = true;
      window.removeEventListener("cartofy_aifix_change", handleHistoryUpdate);
      window.removeEventListener("storage", handleHistoryUpdate);
    };
  }, []);

  const handleDeleteFix = async (fixId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingFixId(fixId);
      const remaining = await deleteAiFixFromHistory(fixId);
      setFixHistory(remaining);
    } catch (err) {
      console.warn("Failed to delete AI fix:", err);
    } finally {
      setDeletingFixId(null);
    }
  };

  // Generate AI Copilot analysis report
  const copilotReport: CopilotReport = React.useMemo(() => {
    return generateArchitecturalCopilotReport(graphData);
  }, [graphData]);

  // Inbound Dependents (imported by other files)
  const dependentNodes = React.useMemo(() => {
    if (!selectedNode) return [];
    return graphData.links
      .filter((link) => {
        const tgtId = typeof link.target === "string" ? link.target : (link.target as any).id;
        return tgtId === selectedNode.id;
      })
      .map((link) => {
        const srcId = typeof link.source === "string" ? link.source : (link.source as any).id;
        return graphData.nodes.find((n) => n.id === srcId);
      })
      .filter(Boolean) as GraphNode[];
  }, [selectedNode, graphData]);

  // Outbound Dependencies (imports)
  const importedNodes = React.useMemo(() => {
    if (!selectedNode) return [];
    return graphData.links
      .filter((link) => {
        const srcId = typeof link.source === "string" ? link.source : (link.source as any).id;
        return srcId === selectedNode.id;
      })
      .map((link) => {
        const tgtId = typeof link.target === "string" ? link.target : (link.target as any).id;
        return graphData.nodes.find((n) => n.id === tgtId);
      })
      .filter(Boolean) as GraphNode[];
  }, [selectedNode, graphData]);

  const hasCycles = graphData.circularLoops.length > 0;

  return (
    <>
      {/* Invisible overlay while dragging to capture all pointer events smoothly */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-ew-resize select-none pointer-events-auto" />
      )}

      <aside
        style={{ width: isMobileOpen ? undefined : `${sidebarWidth}px` }}
        className={`
          fixed lg:static inset-y-0 right-0 z-40 lg:z-20
          border-l border-white/5 bg-[#0e1117] h-full
          flex flex-col shrink-0 font-sans select-none relative
          ${isDragging ? "transition-none select-none" : "transition-transform duration-300 ease-in-out"}
          shadow-[-12px_0_36px_rgba(0,0,0,0.65)] lg:shadow-none
          ${isMobileOpen ? "translate-x-0 w-80 sm:w-96" : "translate-x-full lg:translate-x-0 w-full max-w-full lg:max-w-none"}
        `}
      >
        {/* Resizer Handle Bar (Desktop only, left edge) */}
        <div
          onPointerDown={startResize}
          className={`
            hidden lg:flex absolute left-0 top-0 bottom-0 w-2.5 -ml-1.25 z-40 cursor-ew-resize
            items-center justify-center group select-none
            ${isDragging ? "bg-white/10" : "hover:bg-white/5"}
          `}
          title="Drag to resize sidebar (compact icons mode below 430px)"
        >
          {/* Subtle tactile grip handle */}
          <div
            className={`
              w-1 rounded-full transition-all duration-150
              ${isDragging ? "bg-white h-16 shadow-lg shadow-white/30" : "bg-white/15 group-hover:bg-white/50 h-10 group-hover:h-14"}
            `}
          />
        </div>

        {/* Mobile Drawer Header */}
        <div className="lg:hidden h-12 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0c0e12]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#181d26] border border-white/5 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <span className="text-xs font-semibold text-white tracking-tight">Inspector & Copilot</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chunky Tactile Tabs Navigation Bar */}
        <div className="p-2 sm:p-2.5 border-b border-white/5 bg-[#0c0e12]">
          <div className="clay-recessed-input p-1 rounded-2xl flex items-center gap-1">
            {/* Tab 1: Copilot */}
            <button
              onClick={() => setActiveTab("copilot")}
              title="Copilot Intelligence"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                activeTab === "copilot"
                  ? "clay-card-raised text-white border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              {!isCompactTabs && <span className="truncate">Copilot</span>}
            </button>

            {/* Tab 2: Inspector */}
            <button
              onClick={() => setActiveTab("inspector")}
              title="Node Inspector"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer relative ${
                activeTab === "inspector"
                  ? "clay-card-raised text-white border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {!isCompactTabs && <span className="truncate">Inspector</span>}
              {selectedNode && (
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-emerald-400 absolute ${
                    isCompactTabs ? "top-1 right-2" : "top-1.5 right-1.5"
                  }`}
                />
              )}
            </button>

            {/* Tab 3: Cycles */}
            <button
              onClick={() => setActiveTab("cycles")}
              title="DFS Cycles Detector"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer relative ${
                activeTab === "cycles"
                  ? "bg-[#241214] text-red-300 border border-red-500/30 shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              {!isCompactTabs && <span className="truncate">Cycles</span>}
              {hasCycles && (
                <span
                  className={`w-2 h-2 rounded-full bg-red-500 absolute animate-pulse ${
                    isCompactTabs ? "top-1 right-2" : "top-1.5 right-1.5"
                  }`}
                />
              )}
            </button>

            {/* Tab 4: History */}
            <button
              onClick={() => setActiveTab("history")}
              title="AI Fix & Scan History"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer relative ${
                activeTab === "history"
                  ? "clay-card-raised text-white border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <History className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              {!isCompactTabs && <span className="truncate">History</span>}
              {currentRepoFixes.length > 0 && (
                <span
                  className={`min-w-[15px] h-[15px] px-1 rounded-full bg-purple-500/80 text-[9px] font-mono font-bold text-white flex items-center justify-center absolute border border-purple-400/50 shadow-sm ${
                    isCompactTabs ? "-top-1 right-1" : "-top-1 -right-1"
                  }`}
                >
                  {currentRepoFixes.length}
                </span>
              )}
            </button>

            {/* Tab 5: Metrics */}
            <button
              onClick={() => setActiveTab("controls")}
              title="AST Metrics & Categories"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                activeTab === "controls"
                  ? "clay-card-raised text-white border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              {!isCompactTabs && <span className="truncate">Metrics</span>}
            </button>
          </div>
        </div>

      {/* Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* TAB 1: COPILOT ARCHITECTURAL INTELLIGENCE */}
        {activeTab === "copilot" && (
          <div className="space-y-4">
            {/* Architecture Audit Health Card */}
            <div className="clay-card-raised rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <div className="w-6 h-6 rounded-lg bg-[#1b212c] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <span>Architecture Audit</span>
                </div>
                <span className="clay-pill-tag text-[10px] font-mono px-2 py-0.5 rounded-full text-zinc-400">
                  AI Evaluated
                </span>
              </div>

              {/* Recessed Stat Gauges */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">Health</p>
                  <p className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {copilotReport.healthScore}
                    <span className="text-[10px] text-zinc-500 font-normal">/100</span>
                  </p>
                </div>
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">Modularity</p>
                  <p className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
                    {copilotReport.modularityScore}%
                  </p>
                </div>
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">Coupling</p>
                  <p className="text-sm sm:text-base font-bold text-amber-400 mt-0.5">
                    {copilotReport.couplingScore}%
                  </p>
                </div>
              </div>
            </div>

            {/* Single Points of Failure Alert */}
            {copilotReport.singlePointsOfFailure.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Single Points of Failure ({copilotReport.singlePointsOfFailure.length})</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Critical Modules</span>
                </div>

                <div className="space-y-2">
                  {copilotReport.singlePointsOfFailure.map((spof) => {
                    const spofDependents = graphData.links
                      .filter((link) => {
                        const tgtId = typeof link.target === "string" ? link.target : (link.target as any).id;
                        return tgtId === spof.nodeId;
                      })
                      .map((link) => {
                        const srcId = typeof link.source === "string" ? link.source : (link.source as any).id;
                        return graphData.nodes.find((n) => n.id === srcId);
                      })
                      .filter(Boolean) as GraphNode[];

                    return (
                      <div
                        key={spof.nodeId}
                        onClick={() => {
                          const n = graphData.nodes.find((item) => item.id === spof.nodeId);
                          if (n) onSelectNode(n);
                        }}
                        className="clay-card-raised rounded-2xl p-3.5 cursor-pointer hover:border-white/15 transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-100 font-semibold group-hover:text-white truncate max-w-[170px]">
                            {spof.label}
                          </span>
                          <span className="text-[10px] text-red-300 font-semibold px-2 py-0.5 rounded-full bg-red-950/60 border border-red-900/60 shrink-0">
                            {spof.dependentCount} Dependents
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{spof.reason}</p>
                        
                        {onOpenSpofModal && (
                          <div className="pt-1 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] text-zinc-500 font-mono">Blast Radius: High</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSpofModal(spof, spofDependents);
                              }}
                              className="px-2.5 py-1 rounded-xl clay-button-white text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-zinc-950" />
                              <span>AI Fix & Issue</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Refactoring Guidance Recommendations */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>Refactoring Guidance</span>
              </div>

              <div className="space-y-2">
                {copilotReport.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="clay-card-raised rounded-2xl p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-zinc-100 font-semibold">{rec.title}</span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          rec.priority === "High"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : rec.priority === "Medium"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{rec.description}</p>
                    {rec.priority === "High" && onOpenSpofModal && (
                      <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <span className="text-[10px] text-red-300 font-mono font-medium">Critical Advisory</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetNode = graphData.nodes.find((n) =>
                              rec.title.toLowerCase().includes(n.label.toLowerCase()) ||
                              rec.description.toLowerCase().includes(n.label.toLowerCase()) ||
                              rec.description.includes(n.id)
                            ) || graphData.nodes[0];

                            if (targetNode) {
                              const synthSpof: SinglePointOfFailure = {
                                nodeId: targetNode.id,
                                label: rec.title,
                                reason: rec.description,
                                dependentCount: targetNode.inDegree || 1,
                                type: targetNode.type,
                                riskLevel: rec.priority === "High" ? "High" : "Medium",
                              };
                              onOpenSpofModal(synthSpof, [targetNode]);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl clay-button-white text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-zinc-950" />
                          <span>AI Fix Recommendation</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NODE INSPECTOR */}
        {activeTab === "inspector" && (
          <div className="space-y-4">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Node Metadata Card */}
                <div className="clay-card-raised rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full inline-block ${
                          selectedNode.type === "route"
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                            : selectedNode.type === "utility"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : selectedNode.type === "module"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-slate-700/30 text-slate-300 border border-slate-600/30"
                        }`}
                      >
                        {selectedNode.type}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5 break-all">
                        {selectedNode.label}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5 break-all">
                        {selectedNode.id}
                      </p>
                    </div>
                  </div>

                  {/* Node Recessed Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="clay-recessed-input p-2 rounded-xl">
                      <p className="text-[9px] text-zinc-500 font-sans uppercase">Lines</p>
                      <p className="text-xs font-bold text-zinc-200 mt-0.5">{selectedNode.lineCount}</p>
                    </div>
                    <div className="clay-recessed-input p-2 rounded-xl">
                      <p className="text-[9px] text-zinc-500 font-sans uppercase">Imports</p>
                      <p className="text-xs font-bold text-zinc-200 mt-0.5">{selectedNode.outDegree}</p>
                    </div>
                    <div className="clay-recessed-input p-2 rounded-xl">
                      <p className="text-[9px] text-zinc-500 font-sans uppercase">Dependents</p>
                      <p className="text-xs font-bold text-zinc-200 mt-0.5">{selectedNode.inDegree}</p>
                    </div>
                  </div>

                  {selectedNode.code && (
                    <button
                      onClick={() => onOpenInspectorModalWithFile(selectedNode.id)}
                      className="clay-button-white w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>View Source Code</span>
                    </button>
                  )}

                  {onOpenSpofModal && selectedNode.inDegree >= 2 && (
                    <button
                      onClick={() => onOpenSpofModal(selectedNode, dependentNodes)}
                      className="w-full py-2 px-3 rounded-xl clay-pill-tag hover:bg-[#1a202c] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer text-amber-300 border border-amber-500/20 shadow-sm transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>AI Decouple & GitHub Issue</span>
                    </button>
                  )}
                </div>

                {/* Inbound Dependents List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                    <div className="flex items-center gap-1.5">
                      <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Imported By ({dependentNodes.length})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Inbound</span>
                  </div>

                  {dependentNodes.length === 0 ? (
                    <div className="clay-recessed-input p-3 rounded-2xl text-[11px] text-zinc-500 italic">
                      No inbound references. Entry point or root file.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs pr-1">
                      {dependentNodes.map((dep) => (
                        <div
                          key={dep.id}
                          onClick={() => onSelectNode(dep)}
                          className="clay-pill-tag p-2.5 rounded-xl hover:bg-[#1a202c] text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer transition-all group"
                        >
                          <span className="truncate group-hover:font-medium">{dep.label}</span>
                          <span className="text-[9px] text-zinc-500 uppercase shrink-0 ml-2">{dep.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outbound Imports List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Imports ({importedNodes.length})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Outbound</span>
                  </div>

                  {importedNodes.length === 0 ? (
                    <div className="clay-recessed-input p-3 rounded-2xl text-[11px] text-zinc-500 italic">
                      No outbound imports. Leaf node.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-xs pr-1">
                      {importedNodes.map((imp) => (
                        <div
                          key={imp.id}
                          onClick={() => onSelectNode(imp)}
                          className="clay-pill-tag p-2.5 rounded-xl hover:bg-[#1a202c] text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer transition-all group"
                        >
                          <span className="truncate group-hover:font-medium">{imp.label}</span>
                          <span className="text-[9px] text-zinc-500 uppercase shrink-0 ml-2">{imp.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="clay-card-raised rounded-2xl text-center py-12 px-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-[#171c26] border border-white/5 flex items-center justify-center mx-auto text-zinc-400 shadow-inner">
                  <Info className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-white">No File Selected</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[220px] mx-auto">
                    Click any node in the 2D interactive canvas to inspect dependencies, AST metrics, and raw source code.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CIRCULAR CYCLES DETECTOR */}
        {activeTab === "cycles" && (
          <div className="space-y-4">
            {/* DFS Cycle Detection Banner */}
            <div className="clay-card-raised rounded-2xl p-4 border-red-950/60 bg-[#160d10] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-red-200">DFS Cycle Detection</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {graphData.circularLoops.length} loop(s) detected
                  </p>
                </div>
              </div>

              {hasCycles && (
                <button
                  onClick={() => onToggleCyclesOnly(!showCyclesOnly)}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 font-semibold ${
                    showCyclesOnly
                      ? "clay-button-white text-zinc-950"
                      : "clay-pill-tag text-red-400 hover:text-red-300"
                  }`}
                >
                  {showCyclesOnly ? "Show All" : "Filter Cycles"}
                </button>
              )}
            </div>

            {!hasCycles ? (
              <div className="clay-card-raised rounded-2xl text-center py-10 px-6 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-semibold text-white">Zero Circular Cycles</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Clean architecture. No recursive import dependencies detected across the graph.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {graphData.circularLoops.map((cycle, idx) => (
                  <div
                    key={idx}
                    className="clay-card-raised rounded-2xl p-3.5 space-y-2.5 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">Cycle #{idx + 1}</span>
                        {onOpenSpofModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstNodeId = cycle[0];
                              const synthSpof: SinglePointOfFailure = {
                                nodeId: firstNodeId,
                                label: `Cycle: ${cycle.map(getShortLabel).join(" → ")}`,
                                reason: `Circular dependency loop detected between ${cycle.length} modules (${cycle.join(" -> ")}). AI Decoupler will propose refactoring patterns to invert dependencies and extract shared contracts.`,
                                dependentCount: cycle.length - 1,
                                type: "module",
                                riskLevel: "High",
                              };
                              onOpenSpofModal(synthSpof, cycle);
                            }}
                            className="px-2 py-0.5 rounded-lg clay-button-white text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-zinc-950" />
                            <span>AI Decouple</span>
                          </button>
                        )}
                      </div>
                      {(() => {
                        const isSpotlighted =
                          spotlightCycleNodes &&
                          spotlightCycleNodes.length === cycle.length &&
                          spotlightCycleNodes.every((n, i) => n === cycle[i]);
                        return (
                          <button
                            onClick={() => onSpotlightCycle(isSpotlighted ? null : cycle)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-xl border transition-all cursor-pointer font-medium ${
                              isSpotlighted
                                ? "bg-red-500/20 text-red-300 border-red-500/40"
                                : "clay-pill-tag text-zinc-300 hover:text-white"
                            }`}
                          >
                            {isSpotlighted ? "Clear" : "Spotlight"}
                          </button>
                        );
                      })()}
                    </div>

                    <div className="space-y-1.5 text-zinc-300 text-[11px]">
                      {cycle.map((nodeId, stepIdx) => (
                        <div key={stepIdx} className="flex items-center gap-2">
                          <span className="text-zinc-500 text-[10px] font-mono">{stepIdx + 1}.</span>
                          <span className="truncate text-zinc-200">{getShortLabel(nodeId)}</span>
                          {stepIdx < cycle.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-red-400 ml-auto shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: METRICS & CATEGORIES */}
        {activeTab === "controls" && (
          <div className="space-y-4 font-mono text-xs">
            {/* AST Metrics Card */}
            <div className="clay-card-raised rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white font-sans">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>AST Parser Engine</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[9px] text-zinc-500 font-sans uppercase">Parse Time</p>
                  <p className="text-sm font-bold text-white mt-0.5">{graphData.parseTimeMs} ms</p>
                </div>
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[9px] text-zinc-500 font-sans uppercase">Total Files</p>
                  <p className="text-sm font-bold text-white mt-0.5">{graphData.stats.totalFiles}</p>
                </div>
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[9px] text-zinc-500 font-sans uppercase">Total Imports</p>
                  <p className="text-sm font-bold text-white mt-0.5">{graphData.stats.totalDependencies}</p>
                </div>
                <div className="clay-recessed-input p-2.5 rounded-xl">
                  <p className="text-[9px] text-zinc-500 font-sans uppercase">Circular Loops</p>
                  <p className={`text-sm font-bold mt-0.5 ${hasCycles ? "text-red-400" : "text-emerald-400"}`}>
                    {graphData.stats.circularLoopCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Categories Breakdown */}
            <div className="clay-card-raised rounded-2xl p-4 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Module Taxonomy</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl clay-recessed-input font-mono">
                  <div className="flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-zinc-300">Routes / Pages</span>
                  </div>
                  <span className="text-white font-bold">{graphData.stats.routeCount}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl clay-recessed-input font-mono">
                  <div className="flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-zinc-300">Components</span>
                  </div>
                  <span className="text-white font-bold">{graphData.stats.componentCount}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl clay-recessed-input font-mono">
                  <div className="flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-zinc-300">Utilities / Helpers</span>
                  </div>
                  <span className="text-white font-bold">{graphData.stats.utilityCount}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl clay-recessed-input font-mono">
                  <div className="flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-zinc-300">Shared Modules</span>
                  </div>
                  <span className="text-white font-bold">{graphData.stats.moduleCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI FIX & SCAN HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4 font-sans">
            {/* History Banner */}
            <div className="clay-card-raised rounded-2xl p-4 border-purple-500/20 bg-[#140f1a] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <History className="w-4 h-4 text-purple-400" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-purple-200">Repository Fix History</h4>
                  <p className="text-[11px] text-zinc-400 font-mono truncate">
                    {currentRepoFixes.length} record{currentRepoFixes.length === 1 ? "" : "s"} for {repoName || "this repository"}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold shrink-0">
                Repo Scoped
              </span>
            </div>

            {currentRepoFixes.length === 0 ? (
              <div className="clay-card-raised rounded-2xl text-center py-10 px-6 space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 shadow-inner">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-white">No Fixes for this Repository</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[240px] mx-auto">
                    No AI fixes or GitHub issues have been created for {repoName || "this repository"} yet. All global fixes across all projects are saved in your Dashboard.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentRepoFixes.map((fix) => {
                  const hasIssue = Boolean(fix.githubIssueUrl && fix.githubIssueNumber);
                  const isDeleting = deletingFixId === fix.id;
                  const dateStr = fix.timestamp
                    ? new Date(fix.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recent";

                  return (
                    <div
                      key={fix.id}
                      className="clay-card-raised rounded-2xl p-3.5 space-y-2.5 text-xs transition-all hover:border-white/15"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white truncate max-w-[200px]" title={fix.title}>
                            {fix.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                            <span className="truncate max-w-[120px]">{fix.repoName}</span>
                            <span>•</span>
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        {hasIssue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            <GitPullRequest className="w-3 h-3 text-emerald-400" />
                            <span>#{fix.githubIssueNumber}</span>
                          </span>
                        ) : fix.fixType === "plan" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                            <ClipboardList className="w-3 h-3 text-sky-400" />
                            <span>Plan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Fix Plan</span>
                          </span>
                        )}
                      </div>

                      {/* Reason Snippet */}
                      {fix.summary && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-sans">
                          {fix.summary}
                        </p>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {onOpenSpofModal && (
                            <button
                              onClick={() => {
                                const synthSpof: SinglePointOfFailure = {
                                  nodeId: fix.targetFile,
                                  label: fix.title,
                                  reason: fix.summary,
                                  dependentCount: 1,
                                  type: "module",
                                  riskLevel: fix.riskLevel === "Low" ? "Medium" : fix.riskLevel,
                                };
                                onOpenSpofModal(synthSpof, [fix.targetFile], fix);
                              }}
                              className="px-2.5 py-1 rounded-xl clay-button-white text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:scale-102 active:scale-95 transition-all cursor-pointer"
                            >
                              {fix.fixType === "plan" ? (
                                <>
                                  <ClipboardList className="w-3 h-3 text-zinc-950" />
                                  <span>Review Plan</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-zinc-950" />
                                  <span>Review Fix</span>
                                </>
                              )}
                            </button>
                          )}

                          {hasIssue && fix.githubIssueUrl && (
                            <a
                              href={fix.githubIssueUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-xl clay-pill-tag text-zinc-300 hover:text-white text-[10px] font-medium flex items-center gap-1 transition-all"
                            >
                              <span>Issue</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleDeleteFix(fix.id, e)}
                          disabled={isDeleting}
                          className="w-6 h-6 rounded-lg clay-pill-tag flex items-center justify-center text-zinc-500 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                          title="Delete from history"
                          aria-label="Delete fix record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  </>
  );
}
