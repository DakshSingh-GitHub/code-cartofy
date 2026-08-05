"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { parseRepositoryToGraph } from "@/lib/graphParser";
import { fetchGitHubRepository } from "@/lib/githubFetcher";
import { FileInput, GraphData, GraphNode } from "@/lib/types";

import { Navbar } from "@/components/Navbar";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import { GitHubModal } from "@/components/GitHubModal";
import { FileInspectorModal } from "@/components/FileInspectorModal";
import { ExportModal } from "@/components/ExportModal";
import { UploadCloud, ArrowLeft, Loader2 } from "lucide-react";

function CartofyWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const repoQuery = searchParams.get("repo");
  const githubQuery = searchParams.get("github");

  // State initialization
  const initialSample = SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery) || SAMPLE_REPOSITORIES[0];
  const [currentRepoName, setCurrentRepoName] = useState<string>(initialSample.name);
  const [currentFiles, setCurrentFiles] = useState<FileInput[]>(initialSample.files);
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

  // Parse GitHub repo if passed in URL query
  useEffect(() => {
    if (githubQuery) {
      setIsParsing(true);
      fetchGitHubRepository(githubQuery)
        .then((res) => {
          setCurrentRepoName(`GitHub: ${res.repoName}`);
          setCurrentFiles(res.files);
          setIsParsing(false);
        })
        .catch((err) => {
          console.error("GitHub URL load error:", err);
          setIsParsing(false);
        });
    } else if (repoQuery) {
      const found = SAMPLE_REPOSITORIES.find((r) => r.id === repoQuery);
      if (found) {
        setCurrentRepoName(found.name);
        setCurrentFiles(found.files);
      }
    }
  }, [githubQuery, repoQuery]);

  // Re-parse graph whenever files change
  const graphData: GraphData = useMemo(() => {
    return parseRepositoryToGraph(currentFiles);
  }, [currentFiles]);

  // Handle switching pre-loaded sample repositories
  const handleSelectSampleRepo = (id: string) => {
    const found = SAMPLE_REPOSITORIES.find((r) => r.id === id);
    if (found) {
      setIsParsing(true);
      setCurrentRepoName(found.name);
      setCurrentFiles(found.files);
      setSelectedNode(null);
      setSpotlightCycleNodes(null);
      setShowCyclesOnly(false);
      router.push(`/cartofy?repo=${id}`, { scroll: false });
      setTimeout(() => setIsParsing(false), 200);
    }
  };

  // Handle local uploaded directory files
  const handleDirectoryUpload = (files: FileInput[]) => {
    setIsParsing(true);
    setCurrentRepoName("Uploaded Workspace");

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

    setCurrentFiles(finalFiles);
    setSelectedNode(null);
    setSpotlightCycleNodes(null);
    setShowCyclesOnly(false);
    setTimeout(() => setIsParsing(false), 300);
  };

  // Handle GitHub repository fetch
  const handleFetchGitHubRepo = async (repoUrl: string) => {
    setIsParsing(true);
    const result = await fetchGitHubRepository(repoUrl);
    setCurrentRepoName(`GitHub: ${result.repoName}`);
    setCurrentFiles(result.files);
    setSelectedNode(null);
    setSpotlightCycleNodes(null);
    setShowCyclesOnly(false);
    setIsParsing(false);
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
        graphData={graphData}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSampleRepo={handleSelectSampleRepo}
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
