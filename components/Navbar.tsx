"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  GitFork,
  FolderUp,
  Search,
  Download,
  AlertTriangle,
  FileCode,
  Layers,
  RefreshCw,
  Eye,
  ChevronDown,
  Check,
  Folder,
  Sparkles,
  ShoppingBag,
  Palette,
} from "lucide-react";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { GraphData } from "@/lib/types";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface NavbarProps {
  currentRepoName: string;
  graphData: GraphData | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectSampleRepo: (id: string) => void;
  onOpenGithubModal: () => void;
  onOpenInspectorModal: () => void;
  onOpenExportModal: () => void;
  onDirectoryUpload: (files: { path: string; code: string }[]) => void;
  isParsing: boolean;
}

export function Navbar({
  currentRepoName,
  graphData,
  searchQuery,
  onSearchChange,
  onSelectSampleRepo,
  onOpenGithubModal,
  onOpenInspectorModal,
  onOpenExportModal,
  onDirectoryUpload,
  isParsing,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNativeFolderSelect = async () => {
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: { path: string; code: string }[] = [];

        async function scanDirectory(handle: any, currentPath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === "file") {
              if (/\.(js|jsx|ts|tsx|json)$/i.test(entry.name) && !entry.name.startsWith(".")) {
                const file = await entry.getFile();
                const text = await file.text();
                const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                files.push({ path: relPath, code: text });
              }
            } else if (entry.kind === "directory") {
              const ignoreDirs = ["node_modules", ".next", "dist", "build", ".git", "coverage"];
              if (!ignoreDirs.includes(entry.name)) {
                const subPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                await scanDirectory(entry, subPath);
              }
            }
          }
        }

        await scanDirectory(dirHandle, "");
        if (files.length > 0) {
          onDirectoryUpload(files);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles) return;

    const filesArray: { path: string; code: string }[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < inputFiles.length; i++) {
      const file = inputFiles[i];
      if (/\.(js|jsx|ts|tsx|json)$/i.test(file.name)) {
        const relativePath = file.webkitRelativePath || file.name;
        const promise = file.text().then((text) => {
          filesArray.push({ path: relativePath, code: text });
        });
        promises.push(promise);
      }
    }

    Promise.all(promises).then(() => {
      if (filesArray.length > 0) {
        onDirectoryUpload(filesArray);
      }
    });
  };

  const stats = graphData?.stats;
  const hasCycles = (stats?.circularLoopCount || 0) > 0;
  const isCustomWorkspace = !SAMPLE_REPOSITORIES.some((r) => r.name === currentRepoName);

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between z-30 relative shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        className="hidden"
      />

      {/* Brand Logo & Name (Clickable link to home / route) */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
        <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
          <GitFork className="w-3.5 h-3.5 transform rotate-90" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-zinc-100">
          CodeCartofy
        </span>
      </Link>

      {/* Center Controls: Custom Translucent Dropdown & Search */}
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block" ref={dropdownRef}>
          {/* Dropdown Trigger Button */}
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="bg-zinc-900/70 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800/90 hover:border-zinc-700 text-xs text-zinc-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 min-w-[250px] max-w-[350px] transition-all cursor-pointer shadow-md"
          >
            <div className="flex items-center gap-2 truncate">
              {isCustomWorkspace ? (
                <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : currentRepoName.includes("Circular") ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : currentRepoName.includes("E-Commerce") ? (
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              {!isCustomWorkspace && (
                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-800/90 border border-zinc-700/80 px-1.5 py-0.2 rounded shrink-0">
                  [SAMPLE]
                </span>
              )}
              <span className="truncate font-medium text-zinc-100">{currentRepoName}</span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isDropdownOpen ? "transform rotate-180 text-zinc-200" : ""
              }`}
            />
          </button>

          {/* Translucent Popover Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-84 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/90 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-fadeIn">
              {/* Header Badge */}
              <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-zinc-400" />
                  Select Repository
                </span>
                <span className="text-[10px] font-mono text-zinc-600">AST Mapper</span>
              </div>

              {/* Sample Codebases */}
              <div className="space-y-1">
                {SAMPLE_REPOSITORIES.map((repo) => {
                  const isSelected = repo.name === currentRepoName;
                  return (
                    <button
                      key={repo.id}
                      onClick={() => {
                        onSelectSampleRepo(repo.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 group ${
                        isSelected
                          ? "bg-zinc-900/90 border-zinc-700 text-zinc-100 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                            repo.id === "circular-loop-demo"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : repo.id === "nextjs-ecommerce"
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          }`}
                        >
                          {repo.id === "circular-loop-demo" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : repo.id === "nextjs-ecommerce" ? (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          ) : (
                            <Palette className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded shrink-0">
                              [SAMPLE]
                            </span>
                            <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">
                              {repo.name.replace(/^[^\s]+\s/, "")}
                            </p>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                            {repo.files.length} Files • {repo.category}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Custom Workspace */}
              {isCustomWorkspace && (
                <div className="border-t border-zinc-900 pt-1.5 space-y-1">
                  <span className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Loaded Workspace
                  </span>
                  <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                        <Folder className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-zinc-100 truncate">
                          {currentRepoName}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          Parsed Active Codebase
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-44 lg:w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search module or file..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 rounded-md pl-8 pr-3 py-1 focus:outline-none focus:border-zinc-700 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1.5 text-zinc-400 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Stats Summary Badge */}
        {graphData && (
          <div className="hidden xl:flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-md px-2.5 py-1 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              <span>{stats?.totalFiles} files</span>
            </div>
            <div className="h-3 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>{stats?.totalDependencies} imports</span>
            </div>
            {hasCycles && (
              <>
                <div className="h-3 w-[1px] bg-zinc-800" />
                <div className="flex items-center gap-1 text-red-400 font-semibold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/60">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{stats?.circularLoopCount} Cycles</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upload Folder */}
        <button
          onClick={handleNativeFolderSelect}
          disabled={isParsing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-all disabled:opacity-50"
          title="Ingest local project directory"
        >
          {isParsing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          ) : (
            <FolderUp className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span className="hidden sm:inline">Folder Upload</span>
        </button>

        {/* GitHub Import */}
        <button
          onClick={onOpenGithubModal}
          disabled={isParsing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-all disabled:opacity-50"
          title="Fetch public GitHub repository"
        >
          <GitHubIcon className="w-3.5 h-3.5 text-zinc-900" />
          <span className="hidden sm:inline">GitHub Repo</span>
        </button>

        {/* File Inspector Trigger */}
        <button
          onClick={onOpenInspectorModal}
          className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
          title="Inspect Files & Raw Code"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Export Trigger */}
        <button
          onClick={onOpenExportModal}
          className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
          title="Export Image / Report"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
