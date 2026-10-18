"use client";

import React, { useState } from "react";
import { GraphNode, SinglePointOfFailure, FileInput } from "@/lib/types";
import {
  X,
  Sparkles,
  ShieldAlert,
  Layers,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  GitPullRequest,
  Code2,
  FileCode,
  Loader2,
  Zap,
} from "lucide-react";
import { AiFixRecord } from "@/lib/types";
import { saveAiFixToHistory } from "@/lib/storage";
import { getClientSession } from "@/lib/auth";

function generateFixId(): string {
  return `fix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

interface SpofFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  spofNode: GraphNode | SinglePointOfFailure | null;
  dependentNodes: GraphNode[] | string[];
  currentFiles: FileInput[];
  repoName?: string;
  githubUrl?: string;
  repoId?: string;
  initialFixRecord?: AiFixRecord | null;
}

interface AnalysisResult {
  summary: string;
  riskLevel: "Critical" | "High" | "Medium";
  architecturalPattern: string;
  blastRadiusDescription: string;
  refactoringPlan: string[];
  proposedModules: {
    path: string;
    description: string;
    codeSnippet: string;
  }[];
  githubIssue: {
    title: string;
    body: string;
    labels: string[];
  };
}

function getCleanRepoSlug(githubUrl?: string, repoName?: string): string {
  if (githubUrl) {
    return githubUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  }
  if (repoName && repoName.toLowerCase().startsWith("github:")) {
    return repoName.replace(/^github:\s*/i, "");
  }
  if (repoName && repoName.includes("/")) {
    return repoName;
  }
  return "";
}

export function SpofFixModal({
  isOpen,
  onClose,
  spofNode,
  dependentNodes,
  currentFiles,
  repoName = "",
  githubUrl = "",
  repoId = "",
  initialFixRecord = null,
}: SpofFixModalProps) {
  // Target repository state derived from props
  const [targetRepo, setTargetRepo] = useState<string>(() => getCleanRepoSlug(githubUrl, repoName));

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    if (!initialFixRecord) return null;
    return {
      summary: initialFixRecord.summary,
      riskLevel: initialFixRecord.riskLevel === "Low" ? "Medium" : initialFixRecord.riskLevel,
      architecturalPattern: initialFixRecord.architecturalPattern || "Architectural Decoupling",
      blastRadiusDescription: `Archived fix report for ${initialFixRecord.targetFile}`,
      refactoringPlan: initialFixRecord.refactoringPlan,
      proposedModules: initialFixRecord.proposedModules || [],
      githubIssue: {
        title: initialFixRecord.title,
        body: "",
        labels: ["architecture", "refactoring", "codecartofy"],
      },
    };
  });
  const [activeFixRecord, setActiveFixRecord] = useState<AiFixRecord | null>(() => initialFixRecord || null);

  // GitHub Issue Dispatch state
  const [issueTitle, setIssueTitle] = useState<string>(() => initialFixRecord?.title || "");
  const [issueBody, setIssueBody] = useState<string>("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState<boolean>(false);
  const [issueSubmitError, setIssueSubmitError] = useState<string | null>(null);
  const [createdIssueUrl, setCreatedIssueUrl] = useState<string | null>(() => initialFixRecord?.githubIssueUrl || null);
  const [createdIssueNumber, setCreatedIssueNumber] = useState<number | null>(() => initialFixRecord?.githubIssueNumber || null);

  // Active sub-module tab
  const [activeModuleTab, setActiveModuleTab] = useState<number>(0);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  const nodeLabel = spofNode?.label || "Unknown Module";
  const nodeId = spofNode ? ("nodeId" in spofNode ? spofNode.nodeId : spofNode.id) : "";
  const dependentCount = spofNode ? ("dependentCount" in spofNode ? spofNode.dependentCount : spofNode.inDegree) : 0;

  // Extract source code of the SPOF node from currentFiles
  const targetFileObj = spofNode
    ? currentFiles.find(
        (f) => f.path === nodeId || f.path.endsWith(nodeId) || nodeId.endsWith(f.path)
      )
    : undefined;
  const fileCode = targetFileObj?.code || (spofNode && "code" in spofNode ? spofNode.code : "") || "// Source code loaded from AST";

  // Dependent file names
  const dependentNames: string[] = (dependentNodes || []).map((n) =>
    typeof n === "string" ? n : n.label || n.id || ""
  );

  // Run Gemini Analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCreatedIssueUrl(null);

    try {
      const res = await fetch("/api/ai/analyze-spof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          label: nodeLabel,
          dependentCount,
          dependents: dependentNames,
          code: fileCode,
          repoName: targetRepo || repoName || "Repository",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze module with Gemini.");
      }

      setAnalysisResult(data.analysis);
      setIssueTitle(data.analysis.githubIssue.title);
      setIssueBody(data.analysis.githubIssue.body);

      // Auto-save to User AI Fixes History (LocalStorage + Supabase)
      const activeUser = getClientSession();
      const newRecord: AiFixRecord = {
        id: generateFixId(),
        userId: activeUser?.username || activeUser?.id || activeUser?.email || "guest",
        username: activeUser?.username,
        userEmail: activeUser?.email,
        repoId: repoId || targetRepo || repoName || "current_repo",
        repoName: targetRepo || repoName || "Repository",
        fixType: "spof",
        targetFile: nodeId,
        riskLevel: (data.analysis.riskLevel as "Critical" | "High" | "Medium" | "Low") || "High",
        title: data.analysis.githubIssue.title,
        summary: data.analysis.summary,
        architecturalPattern: data.analysis.architecturalPattern,
        refactoringPlan: data.analysis.refactoringPlan || [],
        proposedModules: data.analysis.proposedModules || [],
        timestamp: getCurrentTimestamp(),
      };
      saveAiFixToHistory(newRecord, activeUser);
      setActiveFixRecord(newRecord);
    } catch (err: unknown) {
      console.error("Gemini Analysis error:", err);
      const msg = err instanceof Error ? err.message : "Failed to execute AI analysis.";
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create GitHub Issue via API
  const handleCreateGitHubIssue = async () => {
    if (!targetRepo) {
      setIssueSubmitError("Please enter the target GitHub repository (e.g. 'owner/repo').");
      return;
    }

    setIsSubmittingIssue(true);
    setIssueSubmitError(null);

    try {
      const res = await fetch("/api/github/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrlOrSlug: targetRepo,
          title: issueTitle,
          body: issueBody,
          labels: analysisResult?.githubIssue.labels || ["architecture", "refactoring", "codecartofy"],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create issue on GitHub.");
      }

      setCreatedIssueUrl(data.issueUrl);
      setCreatedIssueNumber(data.issueNumber);

      // Update AI fix history record with live GitHub Issue URL
      const activeUser = getClientSession();
      if (activeFixRecord) {
        const updatedRecord: AiFixRecord = {
          ...activeFixRecord,
          githubIssueUrl: data.issueUrl,
          githubIssueNumber: data.issueNumber,
        };
        saveAiFixToHistory(updatedRecord, activeUser);
        setActiveFixRecord(updatedRecord);
      }
    } catch (err: unknown) {
      console.error("GitHub Issue creation error:", err);
      const msg = err instanceof Error ? err.message : "Failed to create issue on GitHub.";
      setIssueSubmitError(msg);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(issueBody);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  if (!isOpen || !spofNode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="clay-container-deep border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0c0e12] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Single Point of Failure AI Decoupler
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 font-bold uppercase">
                  {dependentCount} Dependents
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono truncate max-w-md">
                Module: <span className="text-zinc-200 font-semibold">{nodeLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: SPOF Target Summary Card */}
          <div className="clay-card-raised rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Identified Bottleneck</p>
                <h3 className="text-base font-bold text-white font-mono">{nodeId}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 font-semibold font-mono">
                  {dependentCount} Inbound Dependents
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                  {targetFileObj ? `${targetFileObj.code.split("\n").length} Lines` : "Source Code Ready"}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              This module is heavily imported across the application. Any changes here create an extensive blast radius,
              increasing the probability of regression bugs and cyclic import traps.
            </p>

            {/* Downstream files tags */}
            {dependentNames.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Direct Downstream Dependents:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {dependentNames.slice(0, 15).map((dep, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg clay-pill-tag text-zinc-400"
                    >
                      {dep}
                    </span>
                  ))}
                  {dependentNames.length > 15 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400">
                      +{dependentNames.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Run Analysis CTA */}
            {!analysisResult && (
              <div className="pt-2">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-3 clay-button-white text-zinc-950 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Synthesizing Architectural Decoupling Plan with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-zinc-900" />
                      <span>Analyze with Gemini & Propose Decoupled Architecture</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {analysisError && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-start gap-3 text-red-200 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{analysisError}</p>
                <p className="text-zinc-400 text-[11px]">
                  Please ensure the server has <code className="text-emerald-300">GEMINI_API_KEY</code> configured in <code className="text-emerald-300">.env.local</code>.
                </p>
              </div>
            </div>
          )}

          {/* Section 2: AI Analysis Results */}
          {analysisResult && (
            <div className="space-y-6 animate-fadeIn">
              {/* Pattern & Blast Radius */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Pattern Recommendation */}
                <div className="clay-card-raised rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <span>Recommended Architectural Pattern</span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {analysisResult.architecturalPattern}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {analysisResult.summary}
                  </p>
                </div>

                {/* Card 2: Blast Radius */}
                <div className="clay-card-raised rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Blast Radius & Risk Assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${analysisResult.riskLevel === "Critical"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                    >
                      {analysisResult.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {analysisResult.blastRadiusDescription}
                  </p>
                </div>
              </div>

              {/* Step-by-Step Refactoring Plan */}
              <div className="clay-card-raised rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Step-by-Step Refactoring Protocol</span>
                </div>
                <div className="space-y-2">
                  {analysisResult.refactoringPlan.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 font-sans">
                      <div className="w-5 h-5 rounded-full bg-[#181d26] border border-white/10 flex items-center justify-center shrink-0 font-mono text-[10px] text-emerald-400 font-bold">
                        {idx + 1}
                      </div>
                      <p className="pt-0.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Sub-Modules & Code Diffs */}
              {analysisResult.proposedModules.length > 0 && (
                <div className="clay-card-raised rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Code2 className="w-4 h-4 text-sky-400" />
                      <span>Proposed Atomic Sub-Modules</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {analysisResult.proposedModules.length} Modules Suggested
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {analysisResult.proposedModules.map((mod, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveModuleTab(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${activeModuleTab === idx
                            ? "clay-button-white text-zinc-950 font-bold"
                            : "clay-pill-tag text-zinc-400 hover:text-white"
                          }`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{mod.path.split("/").pop()}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Tab Content */}
                  {analysisResult.proposedModules[activeModuleTab] && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-400 font-semibold">
                          {analysisResult.proposedModules[activeModuleTab].path}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyCode(
                              analysisResult.proposedModules[activeModuleTab].codeSnippet,
                              activeModuleTab
                            )
                          }
                          className="px-2.5 py-1 rounded-lg clay-pill-tag hover:bg-[#1f2530] text-[11px] text-zinc-300 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedCodeIndex === activeModuleTab ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 font-sans">
                        {analysisResult.proposedModules[activeModuleTab].description}
                      </p>
                      <pre className="p-3.5 rounded-xl bg-[#080a0e] border border-white/5 font-mono text-xs text-zinc-200 overflow-x-auto max-h-60">
                        <code>{analysisResult.proposedModules[activeModuleTab].codeSnippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Direct GitHub Issue Publishing */}
              <div className="clay-card-raised rounded-2xl p-4 sm:p-5 space-y-4 border-t-2 border-t-emerald-500/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Publish Architectural Issue to GitHub
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Auto-Formatted Issue Report
                  </span>
                </div>

                {/* Target Repo Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400">Target GitHub Repository (owner/repo):</label>
                  <input
                    type="text"
                    value={targetRepo}
                    onChange={(e) => setTargetRepo(e.target.value)}
                    placeholder="e.g. facebook/react or owner/repository"
                    className="w-full clay-recessed-input px-3 py-2 rounded-xl text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                {/* Issue Title Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400">Issue Title:</label>
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    className="w-full clay-recessed-input px-3 py-2 rounded-xl text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                {/* Issue Markdown Body Preview */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-zinc-400">Issue Body (Markdown):</label>
                    <button
                      onClick={handleCopyMarkdown}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedMarkdown ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={issueBody}
                    onChange={(e) => setIssueBody(e.target.value)}
                    className="w-full clay-recessed-input p-3 rounded-xl text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none resize-y"
                  />
                </div>

                {/* Issue Creation Error */}
                {issueSubmitError && (
                  <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/30 text-xs text-red-200 space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{issueSubmitError}</span>
                    </div>
                    {targetRepo && (
                      <div className="pl-6 pt-1">
                        <a
                          href={`https://github.com/${targetRepo}/issues/new?title=${encodeURIComponent(
                            issueTitle
                          )}&body=${encodeURIComponent(issueBody)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors border border-white/10 cursor-pointer shadow-xs"
                        >
                          <span>Open Pre-filled on GitHub (No Token Permissions Needed)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Banner */}
                {createdIssueUrl && (
                  <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Issue #{createdIssueNumber} Successfully Created on GitHub!</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-sans">
                      The architectural single-point-of-failure report and decoupling steps have been published to your repository.
                    </p>
                    <a
                      href={createdIssueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md"
                    >
                      <span>View Issue on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    onClick={handleCreateGitHubIssue}
                    disabled={isSubmittingIssue}
                    className="w-full sm:flex-1 py-3 clay-button-white text-zinc-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingIssue ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        <span>Publishing to GitHub API...</span>
                      </>
                    ) : (
                      <>
                        <GitPullRequest className="w-4 h-4 text-zinc-900" />
                        <span>Raise Issue Directly on GitHub</span>
                      </>
                    )}
                  </button>

                  {/* Fallback button: Open GitHub in new tab with pre-filled issue URL */}
                  {targetRepo && (
                    <a
                      href={`https://github.com/${targetRepo}/issues/new?title=${encodeURIComponent(
                        issueTitle
                      )}&body=${encodeURIComponent(issueBody)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-4 py-3 clay-pill-tag hover:bg-[#1a202c] text-zinc-300 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span>Open Pre-filled on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-[#0c0e12] flex items-center justify-between shrink-0 text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Powered by Google Gemini 2.5 & GitHub REST API
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-xl clay-pill-tag text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
