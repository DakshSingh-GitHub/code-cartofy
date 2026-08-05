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
  StoredRepo,
} from "@/lib/storage";
import { FileInput, GraphData, GraphNode } from "@/lib/types";

import { Navbar } from "@/components/Navbar";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import { GitHubModal } from "@/components/GitHubModal";
import { FileInspectorModal } from "@/components/FileInspectorModal";
import { ExportModal } from "@/components/ExportModal";
import { UploadCloud, Loader2 } from "lucide-react";

function CartofyWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const repoQuery = searchParams.get("repo");
  const githubQuery = searchParams.get("github");

  // State initialization
  const initialSample = SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery) || SAMPLE_REPOSITORIES[0];
  const [currentRepoId, setCurrentRepoId] = useState<string>(initialSample.id);
  const [currentRepoName, setCurrentRepoName] = useState<string>(initialSample.name);
  const [currentRepoType, setCurrentRepoType] = useState<"github" | "upload" | "sample">("sample");
  const [currentGithubUrl, setCurrentGithubUrl] = useState<string | undefined>(undefined);
  const [currentFiles, setCurrentFiles] = useState<FileInput[]>(initialSample.files);
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

  // Sync recent repos list on mount
  useEffect(() => {
    setRecentRepos(getRecentRepos());
  }, []);

  // Parse repo from URL params or restore from LocalStorage
  useEffect(() => {
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
    } else if (repoQuery) {
      const foundSample = SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery);
      if (foundSample) {
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
      } else {
        const stored = getStoredRepoById(repoQuery);
        if (stored) {
          setCurrentRepoId(stored.id);
          setCurrentRepoName(stored.name);
          setCurrentRepoType(stored.type);
          setCurrentGithubUrl(stored.githubUrl);
          setCurrentFiles(stored.files);
        }
      }
    } else {
      // Restore latest repo from localStorage if no query param is passed
      const recents = getRecentRepos();
      if (recents.length > 0) {
        const latest = recents[0];
        setCurrentRepoId(latest.id);
        setCurrentRepoName(latest.name);
        setCurrentRepoType(latest.type);
        setCurrentGithubUrl(latest.githubUrl);
        setCurrentFiles(latest.files);
      }
    }
  }, [githubQuery, repoQuery]);

  // Re-parse graph whenever files change
  const graphData: GraphData = useMemo(() => {
    return parseRepositoryToGraph(currentFiles);
  }, [currentFiles]);

  // Select/switch a recent repository from localStorage
  const handleSelectRecentRepo = (stored: StoredRepo) => {
    setIsParsing(true);
    setCurrentRepoId(stored.id);
    setCurrentRepoName(stored.name);
    setCurrentRepoType(stored.type);
    setCurrentGithubUrl(stored.githubUrl);
    setCurrentFiles(stored.files);
    setSelectedNode(null);
    setSpotlightCycleNodes(null);
    setShowCyclesOnly(false);

    // Save and bump timestamp
    const updatedRecents = saveRepoToRecents({
      id: stored.id,
      name: stored.name,
      type: stored.type,
      githubUrl: stored.githubUrl,
      files: stored.files,
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
