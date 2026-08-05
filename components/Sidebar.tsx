"use client";

import React, { useState } from "react";
import { GraphData, GraphNode, CopilotReport } from "@/lib/types";
import { generateArchitecturalCopilotReport } from "@/lib/aiCopilot";
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
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"inspector" | "cycles" | "copilot" | "controls">(
    selectedNode ? "inspector" : "copilot"
  );

  // Generate AI Copilot analysis report
  const copilotReport: CopilotReport = React.useMemo(() => {
    return generateArchitecturalCopilotReport(graphData);
  }, [graphData]);

  // Inbound Dependents
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

  // Outbound Dependencies
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
    <aside className="w-80 lg:w-96 border-l border-zinc-800 bg-zinc-950 h-[calc(100vh-3.5rem)] flex flex-col z-20 shrink-0 font-sans">
      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800 p-1 bg-zinc-950">
        <button
          onClick={() => setActiveTab("copilot")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "copilot"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Copilot</span>
        </button>

        <button
          onClick={() => setActiveTab("inspector")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "inspector"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("cycles")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all relative ${
            activeTab === "cycles"
              ? "bg-red-950/60 text-red-300 border border-red-900/60"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Cycles</span>
          {hasCycles && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-1.5 right-1.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("controls")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "controls"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Metrics</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: COPILOT */}
        {activeTab === "copilot" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Architecture Audit</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  AI Evaluated
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 font-mono">
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <p className="text-[10px] text-zinc-500">Health</p>
                  <p className="text-sm font-semibold text-zinc-100">{copilotReport.healthScore}/100</p>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <p className="text-[10px] text-zinc-500">Modularity</p>
                  <p className="text-sm font-semibold text-emerald-400">{copilotReport.modularityScore}%</p>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <p className="text-[10px] text-zinc-500">Coupling</p>
                  <p className="text-sm font-semibold text-amber-400">{copilotReport.couplingScore}%</p>
                </div>
              </div>
            </div>

            {copilotReport.singlePointsOfFailure.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Single Points of Failure ({copilotReport.singlePointsOfFailure.length})</span>
                </div>
                {copilotReport.singlePointsOfFailure.map((spof) => (
                  <div
                    key={spof.nodeId}
                    onClick={() => {
                      const n = graphData.nodes.find((item) => item.id === spof.nodeId);
                      if (n) onSelectNode(n);
                    }}
                    className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-200 truncate">{spof.label}</span>
                      <span className="text-[10px] text-red-400 font-semibold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/60">
                        {spof.dependentCount} Dependents
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">{spof.reason}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>Refactoring Guidance</span>
              </h4>

              {copilotReport.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-zinc-200">{rec.title}</span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{rec.priority}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INSPECTOR */}
        {activeTab === "inspector" && (
          <div className="space-y-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {selectedNode.type}
                      </span>
                      <h3 className="text-sm font-semibold text-white mt-1 break-all">
                        {selectedNode.label}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5 break-all">
                        {selectedNode.id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-zinc-800/80 font-mono text-xs">
                    <div>
                      <p className="text-[10px] text-zinc-500">Lines</p>
                      <p className="font-semibold text-zinc-200">{selectedNode.lineCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">Imports</p>
                      <p className="font-semibold text-zinc-200">{selectedNode.outDegree}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500">Dependents</p>
                      <p className="font-semibold text-zinc-200">{selectedNode.inDegree}</p>
                    </div>
                  </div>

                  {selectedNode.code && (
                    <button
                      onClick={() => onOpenInspectorModalWithFile(selectedNode.id)}
                      className="w-full mt-2 py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>View Source Code</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Imported By ({dependentNodes.length})</span>
                  </h4>
                  {dependentNodes.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic bg-zinc-900/30 p-2.5 rounded">
                      No inbound references. Entry point or root file.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs">
                      {dependentNodes.map((dep) => (
                        <div
                          key={dep.id}
                          onClick={() => onSelectNode(dep)}
                          className="p-2 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <span className="truncate">{dep.label}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">{dep.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Imports ({importedNodes.length})</span>
                  </h4>
                  {importedNodes.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic bg-zinc-900/30 p-2.5 rounded">
                      No outbound imports. Leaf node.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs">
                      {importedNodes.map((imp) => (
                        <div
                          key={imp.id}
                          onClick={() => onSelectNode(imp)}
                          className="p-2 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <span className="truncate">{imp.label}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">{imp.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-2">
                <Info className="w-5 h-5 text-zinc-600 mx-auto" />
                <h4 className="text-xs font-medium text-zinc-400">No File Selected</h4>
                <p className="text-[11px] text-zinc-600 max-w-[200px] mx-auto">
                  Click any node in the 2D graph to inspect its imports and metrics.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CYCLES */}
        {activeTab === "cycles" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg border border-red-900/50 bg-red-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="text-xs">
                  <h4 className="font-semibold text-red-300">DFS Cycle Detection</h4>
                  <p className="text-[11px] text-zinc-400">
                    {graphData.circularLoops.length} loop(s) detected
                  </p>
                </div>
              </div>

              {hasCycles && (
                <button
                  onClick={() => onToggleCyclesOnly(!showCyclesOnly)}
                  className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                    showCyclesOnly
                      ? "bg-red-900 text-white border-red-700"
                      : "bg-zinc-900 text-red-400 border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {showCyclesOnly ? "Show All" : "Filter Cycles"}
                </button>
              )}
            </div>

            {!hasCycles ? (
              <div className="text-center py-10 space-y-2 bg-zinc-900/20 p-4 rounded border border-zinc-800">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <h4 className="text-xs font-medium text-zinc-200">Zero Circular Cycles</h4>
                <p className="text-[11px] text-zinc-500">
                  Clean architecture. No recursive import dependencies detected.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {graphData.circularLoops.map((cycle, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                      <span className="text-red-400 font-semibold">Cycle #{idx + 1}</span>
                      <button
                        onClick={() => onSpotlightCycle(cycle)}
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 transition-all"
                      >
                        Spotlight
                      </button>
                    </div>

                    <div className="space-y-1 text-zinc-300 text-[11px]">
                      {cycle.map((nodeId, stepIdx) => (
                        <div key={stepIdx} className="flex items-center gap-1.5">
                          <span className="text-zinc-600">{stepIdx + 1}.</span>
                          <span className="truncate">{nodeId.split("/").pop()}</span>
                          {stepIdx < cycle.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-red-500 ml-auto shrink-0" />
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

        {/* TAB 4: CONTROLS */}
        {activeTab === "controls" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-3">
              <h4 className="font-semibold text-zinc-200">AST Parser Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                  <p className="text-[10px] text-zinc-500">Parse Time</p>
                  <p className="font-semibold text-zinc-200">{graphData.parseTimeMs} ms</p>
                </div>
                <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                  <p className="text-[10px] text-zinc-500">File Count</p>
                  <p className="font-semibold text-zinc-200">{graphData.stats.totalFiles}</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-2">
              <h4 className="font-semibold text-zinc-200">Categories</h4>
              <div className="space-y-1.5 text-zinc-400">
                <div className="flex justify-between">
                  <span>Routes / Pages</span>
                  <span className="text-zinc-200 font-bold">{graphData.stats.routeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Components</span>
                  <span className="text-zinc-200 font-bold">{graphData.stats.componentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilities</span>
                  <span className="text-zinc-200 font-bold">{graphData.stats.utilityCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modules</span>
                  <span className="text-zinc-200 font-bold">{graphData.stats.moduleCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
