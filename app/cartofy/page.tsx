"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { parseRepositoryToGraph } from "@/lib/graphParser";
import { fetchGitHubRepository } from "@/lib/githubFetcher";
import {
  getRecentRepos,
  saveRepoToRecents,
  getStoredRepoById,
  removeRecentRepo,
  syncUserReposWithSupabase,
  ensureFullRepoFiles,
  StoredRepo,
} from "@/lib/storage";
import { getClientSession, UserSession } from "@/lib/auth";
import { FileInput, GraphData, GraphNode } from "@/lib/types";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import { GitHubModal } from "@/components/GitHubModal";
import { FileInspectorModal } from "@/components/FileInspectorModal";
import { ExportModal } from "@/components/ExportModal";
import { UploadCloud, Loader2, GitFork, ArrowRight, Sparkles } from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function CartofyWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const repoQuery = searchParams.get("repo");
  const githubQuery = searchParams.get("github");
  const demoQuery = searchParams.get("demo");

  // User session state
  const [session, setSession] = useState<UserSession | null>(null);

  // Demo mode detection: explicit demo parameter or guest session
  const isDemoMode = demoQuery === "true" || session?.isGuest === true;

  // Initial repo setup: only pre-load sample repositories if explicitly in demo mode or sample query
  const initialSample = (demoQuery === "true" || (repoQuery && SAMPLE_REPOSITORIES.some(r => r.id === repoQuery)))
    ? (SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery) || SAMPLE_REPOSITORIES[0])
    : null;

  const [currentRepoId, setCurrentRepoId] = useState<string>(initialSample?.id || "");
  const [currentRepoName, setCurrentRepoName] = useState<string>(initialSample?.name || "");
  const [currentRepoType, setCurrentRepoType] = useState<"github" | "upload" | "sample">(initialSample ? "sample" : "github");
  const [currentGithubUrl, setCurrentGithubUrl] = useState<string | undefined>(undefined);
  const [currentFiles, setCurrentFiles] = useState<FileInput[]>(initialSample?.files || []);
  const [recentRepos, setRecentRepos] = useState<StoredRepo[]>([]);

  // Workspace controls
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCyclesOnly, setShowCyclesOnly] = useState<boolean>(false);
  const [spotlightCycleNodes, setSpotlightCycleNodes] = useState<string[] | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Modals state
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [inspectorFileId, setInspectorFileId] = useState<string | null>(null);

  // Drag and drop overlay state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sync recent repos list on mount and fetch user's Supabase repositories
  useEffect(() => {
    const activeSession = getClientSession();
    setSession(activeSession);
    setRecentRepos(getRecentRepos(activeSession));

    if (activeSession) {
      syncUserReposWithSupabase(activeSession).then((synced) => {
        if (synced && synced.length > 0) {
          setRecentRepos(synced);
        }
      });
    }
  }, []);

  // Parse repo from URL params or restore from LocalStorage
  useEffect(() => {
    const activeSession = getClientSession();
    const isDemo = demoQuery === "true" || activeSession?.isGuest === true;

    if (githubQuery) {
      setIsParsing(true);
      fetchGitHubRepository(githubQuery)
        .then((res) => {
          const repoId = `github:${res.repoName.toLowerCase()}`;
          const repoName = `GitHub: ${res.repoName}`;
          setCurrentRepoId(repoId);
          setCurrentRepoName(repoName);
          setCurrentRepoType("github");
          setCurrentGithubUrl(githubQuery);
          setCurrentFiles(res.files);

          const updatedRecents = saveRepoToRecents({
            id: repoId,
            name: repoName,
            type: "github",
            githubUrl: githubQuery,
            files: res.files,
          });
          setRecentRepos(updatedRecents);
          setIsParsing(false);
        })
        .catch((err) => {
          console.error("GitHub URL load error:", err);
          setIsParsing(false);
        });
    } else if (isDemo) {
      // In Demo Mode: load preloaded sample repository
      const foundSample = SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery) || SAMPLE_REPOSITORIES[0];
      setCurrentRepoId(foundSample.id);
      setCurrentRepoName(foundSample.name);
      setCurrentRepoType("sample");
      setCurrentGithubUrl(undefined);
      setCurrentFiles(foundSample.files);

      const updatedRecents = saveRepoToRecents({
        id: foundSample.id,
        name: foundSample.name,
        type: "sample",
        files: foundSample.files,
      });
      setRecentRepos(updatedRecents);
    } else if (repoQuery) {
      // Normal workspace: check if it matches a stored user repository
      const stored = getStoredRepoById(repoQuery, activeSession);
      if (stored && stored.type !== "sample") {
        setCurrentRepoId(stored.id);
        setCurrentRepoName(stored.name);
        setCurrentRepoType(stored.type);
        setCurrentGithubUrl(stored.githubUrl);
        ensureFullRepoFiles(stored, activeSession).then((files: FileInput[]) => {
          if (files && files.length > 0) setCurrentFiles(files);
        });
      } else {
        // If query is a sample repo but not in demo mode, redirect to demo mode
        const isSample = SAMPLE_REPOSITORIES.some((r) => r.id === repoQuery);
        if (isSample) {
          router.replace(`/cartofy?demo=true&repo=${repoQuery}`);
        }
      }
    } else {
      // Normal workspace without query params: load most recent repository
      const recents = getRecentRepos(activeSession);
      if (recents.length > 0) {
        const latest = recents[0];
        setCurrentRepoId(latest.id);
        setCurrentRepoName(latest.name);
        setCurrentRepoType(latest.type);
        setCurrentGithubUrl(latest.githubUrl);
        ensureFullRepoFiles(latest, activeSession).then((files: FileInput[]) => {
          if (files && files.length > 0) setCurrentFiles(files);
        });
      } else {
        // No repository active: leave empty to show clean workspace prompt
        setCurrentRepoId("");
        setCurrentRepoName("");
        setCurrentFiles([]);
      }
    }
  }, [githubQuery, repoQuery, demoQuery]);

  // Re-parse graph whenever files change
  const graphData: GraphData = useMemo(() => {
    return parseRepositoryToGraph(currentFiles);
  }, [currentFiles]);

  // Select/switch a recent repository from localStorage
  const handleSelectRecentRepo = async (stored: StoredRepo) => {
    setIsParsing(true);
    setCurrentRepoId(stored.id);
    setCurrentRepoName(stored.name);
    setCurrentRepoType(stored.type);
    setCurrentGithubUrl(stored.githubUrl);

    const fullFiles = await ensureFullRepoFiles(stored, session);
    setCurrentFiles(fullFiles);

    setSelectedNode(null);
    setSpotlightCycleNodes(null);
    setShowCyclesOnly(false);

    // Save and bump timestamp
    const updatedRecents = saveRepoToRecents({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      githubUrl: stored.githubUrl,
      files: fullFiles,
    });
    setRecentRepos(updatedRecents);

    if (stored.type === "sample") {
      router.push(`/cartofy?repo=${stored.id}`, { scroll: false });
    } else if (stored.type === "github" && stored.githubUrl) {
      router.push(`/cartofy?github=${encodeURIComponent(stored.githubUrl)}`, { scroll: false });
    } else {
      router.push(`/cartofy`, { scroll: false });
    }

    setTimeout(() => setIsParsing(false), 200);
  };

  // Handle switching pre-loaded sample repositories
  const handleSelectSampleRepo = (id: string) => {
    const found = SAMPLE_REPOSITORIES.find((r) => r.id === id);
    if (found) {
      setIsParsing(true);
      setCurrentRepoId(found.id);
      setCurrentRepoName(found.name);
      setCurrentRepoType("sample");
      setCurrentGithubUrl(undefined);
      setCurrentFiles(found.files);
      setSelectedNode(null);
      setSpotlightCycleNodes(null);
      setShowCyclesOnly(false);

      const updatedRecents = saveRepoToRecents({
        id: found.id,
        name: found.name,
        type: "sample",
        files: found.files,
      });
      setRecentRepos(updatedRecents);

      router.push(`/cartofy?repo=${id}`, { scroll: false });
      setTimeout(() => setIsParsing(false), 200);
    }
  };

  // Handle local uploaded directory files
  const handleDirectoryUpload = (files: FileInput[], customName?: string) => {
    setIsParsing(true);
    const repoName = customName || "Uploaded Workspace";
    const repoId = `upload:${Date.now()}`;

    const codeFiles = files.filter(
      (f) =>
        /\.(js|jsx|ts|tsx)$/i.test(f.path) &&
        !f.path.includes("node_modules") &&
        !f.path.includes(".next") &&
        !f.path.includes("dist")
    );

    const jsonFiles = files.filter(
      (f) =>
        /\.json$/i.test(f.path) &&
        !f.path.includes("node_modules") &&
        !f.path.includes("package-lock")
    );

    const finalFiles = codeFiles.length > 0 ? [...codeFiles, ...jsonFiles] : files;

    setCurrentRepoId(repoId);
    setCurrentRepoName(repoName);
    setCurrentRepoType("upload");
    setCurrentGithubUrl(undefined);
    setCurrentFiles(finalFiles);
    setSelectedNode(null);
    setSpotlightCycleNodes(null);
    setShowCyclesOnly(false);

    const updatedRecents = saveRepoToRecents({
      id: repoId,
      name: repoName,
      type: "upload",
      files: finalFiles,
    });
    setRecentRepos(updatedRecents);

    setTimeout(() => setIsParsing(false), 300);
  };

  // Handle GitHub repository fetch with deduplication
  const handleFetchGitHubRepo = async (repoUrl: string) => {
    setIsParsing(true);
    try {
      const result = await fetchGitHubRepository(repoUrl);
      const repoId = `github:${result.repoName.toLowerCase()}`;
      const repoName = `GitHub: ${result.repoName}`;

      setCurrentRepoId(repoId);
      setCurrentRepoName(repoName);
      setCurrentRepoType("github");
      setCurrentGithubUrl(repoUrl);
      setCurrentFiles(result.files);
      setSelectedNode(null);
      setSpotlightCycleNodes(null);
      setShowCyclesOnly(false);

      const updatedRecents = saveRepoToRecents({
        id: repoId,
        name: repoName,
        type: "github",
        githubUrl: repoUrl,
        files: result.files,
      });
      setRecentRepos(updatedRecents);
    } catch (err) {
      console.error("Failed to fetch GitHub repo:", err);
    } finally {
      setIsParsing(false);
    }
  };

  // Reload/Refresh current repository directly from source
  const handleReloadCurrentRepo = async () => {
    setIsParsing(true);
    try {
      if (currentRepoType === "github" || currentGithubUrl || currentRepoName.startsWith("GitHub:")) {
        const urlToFetch = currentGithubUrl || currentRepoName.replace("GitHub: ", "");
        const result = await fetchGitHubRepository(urlToFetch);
        const repoId = currentRepoId || `github:${result.repoName.toLowerCase()}`;
        const repoName = `GitHub: ${result.repoName}`;

        setCurrentFiles(result.files);
        setSelectedNode(null);

        const updatedRecents = saveRepoToRecents({
          id: repoId,
          name: repoName,
          type: "github",
          githubUrl: urlToFetch,
          files: result.files,
        });
        setRecentRepos(updatedRecents);
      } else if (currentRepoType === "sample") {
        const found = SAMPLE_REPOSITORIES.find((r) => r.id === currentRepoId || r.name === currentRepoName);
        if (found) {
          setCurrentFiles(found.files);
          const updatedRecents = saveRepoToRecents({
            id: found.id,
            name: found.name,
            type: "sample",
            files: found.files,
          });
          setRecentRepos(updatedRecents);
        }
      } else {
        // Refresh local files timestamp
        const updatedRecents = saveRepoToRecents({
          id: currentRepoId,
          name: currentRepoName,
          type: currentRepoType,
          files: currentFiles,
        });
        setRecentRepos(updatedRecents);
      }
    } catch (err) {
      console.error("Error reloading repository:", err);
    } finally {
      setTimeout(() => setIsParsing(false), 300);
    }
  };

  // Remove a recent repository item
  const handleRemoveRecentRepo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeRecentRepo(id);
    setRecentRepos(updated);
  };

  // Open file inspector for specific node/file
  const handleOpenInspectorWithFile = (fileId: string) => {
    setInspectorFileId(fileId);
    setIsInspectorModalOpen(true);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const scanFileEntry = async (entry: any, path = ""): Promise<FileInput[]> => {
    const files: FileInput[] = [];

    if (entry.isFile) {
      if (/\.(js|jsx|ts|tsx|json)$/i.test(entry.name)) {
        const file: File = await new Promise((resolve) => entry.file(resolve));
        const code = await file.text();
        files.push({ path: path ? `${path}/${entry.name}` : entry.name, code });
      }
    } else if (entry.isDirectory) {
      const ignoreDirs = ["node_modules", ".next", "dist", "build", ".git", "coverage"];
      if (!ignoreDirs.includes(entry.name)) {
        const dirReader = entry.createReader();
        const entries: any[] = await new Promise((resolve) => {
          dirReader.readEntries((res: any[]) => resolve(res));
        });

        for (const subEntry of entries) {
          const subFiles = await scanFileEntry(
            subEntry,
            path ? `${path}/${entry.name}` : entry.name
          );
          files.push(...subFiles);
        }
      }
    }

    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    setIsParsing(true);
    const collectedFiles: FileInput[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;

      if (entry) {
        const files = await scanFileEntry(entry, "");
        collectedFiles.push(...files);
      } else {
        const file = item.getAsFile();
        if (file && /\.(js|jsx|ts|tsx|json)$/i.test(file.name)) {
          const text = await file.text();
          collectedFiles.push({ path: file.name, code: text });
        }
      }
    }

    if (collectedFiles.length > 0) {
      handleDirectoryUpload(collectedFiles);
    } else {
      setIsParsing(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen flex flex-col bg-black text-zinc-100 overflow-hidden relative font-sans select-none"
    >
      {/* Top Navbar */}
      <Navbar
        currentRepoName={currentRepoName}
        currentRepoId={currentRepoId}
        isDemoMode={isDemoMode}
        graphData={graphData}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSampleRepo={handleSelectSampleRepo}
        recentRepos={recentRepos}
        onSelectRecentRepo={handleSelectRecentRepo}
        onRemoveRecentRepo={handleRemoveRecentRepo}
        onReloadCurrentRepo={handleReloadCurrentRepo}
        onOpenGithubModal={() => setIsGithubModalOpen(true)}
        onOpenInspectorModal={() => {
          setInspectorFileId(selectedNode ? selectedNode.id : null);
          setIsInspectorModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onDirectoryUpload={handleDirectoryUpload}
        isParsing={isParsing}
      />

      {/* Main Canvas & Sidebar Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Demo Mode Badge */}
        {isDemoMode && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-950/90 border border-emerald-500/30 backdrop-blur-md shadow-xl text-xs text-zinc-300 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Demo Mode</span>
            <span className="text-zinc-600">•</span>
            <span className="font-semibold text-white truncate max-w-[200px]">{currentRepoName}</span>
            <span className="text-zinc-600">|</span>
            <Link
              href="/dashboard"
              className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
            >
              Exit Demo
            </Link>
          </div>
        )}

        {/* Empty Workspace State when non-demo user has no repository loaded */}
        {!isDemoMode && currentFiles.length === 0 && !isParsing ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-6 pointer-events-auto">
            <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-6 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-300 shadow-sm">
                <GitFork className="w-6 h-6 transform rotate-90 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">No Active Repository Loaded</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Select a repository from your dashboard, import a public GitHub URL, or launch Demo Mode to test-drive sample codebases.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setIsGithubModalOpen(true)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  <span>Import GitHub Repository</span>
                </button>
                <Link
                  href="/cartofy?demo=true"
                  className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore in Demo Mode</span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Force Directed Graph Canvas */}
        <div className="flex-1 h-full relative">
          <GraphCanvas
            graphData={graphData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            searchQuery={searchQuery}
            showCyclesOnly={showCyclesOnly}
            spotlightCycleNodes={spotlightCycleNodes}
            onReloadCurrentRepo={handleReloadCurrentRepo}
            isParsing={isParsing}
          />
        </div>

        {/* Sidebar Panel */}
        <Sidebar
          graphData={graphData}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          showCyclesOnly={showCyclesOnly}
          onToggleCyclesOnly={setShowCyclesOnly}
          spotlightCycleNodes={spotlightCycleNodes}
          onSpotlightCycle={setSpotlightCycleNodes}
          onOpenInspectorModalWithFile={handleOpenInspectorWithFile}
        />
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center border-2 border-dashed border-zinc-600 m-4 rounded-lg">
          <UploadCloud className="w-12 h-12 text-zinc-400 mb-3 animate-bounce" />
          <h2 className="text-lg font-semibold text-white">Drop Codebase Folder Here</h2>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            AST parser will recursively scan JS/TS modules & map imports
          </p>
        </div>
      )}

      {/* Modals */}
      <GitHubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onFetchRepo={handleFetchGitHubRepo}
      />

      <FileInspectorModal
        isOpen={isInspectorModalOpen}
        onClose={() => setIsInspectorModalOpen(false)}
        files={currentFiles}
        selectedFileId={inspectorFileId}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        graphData={graphData}
        repoName={currentRepoName}
      />
    </div>
  );
}

export default function CartofyWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-black flex items-center justify-center text-zinc-400 text-xs font-mono gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>Loading CodeCartofy Graph Workspace...</span>
        </div>
      }
    >
      <CartofyWorkspaceContent />
    </Suspense>
  );
}
