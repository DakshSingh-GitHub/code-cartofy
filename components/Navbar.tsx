"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  UserCheck,
  LogOut,
  Lock,
  Clock,
  Trash2,
  RotateCw,
} from "lucide-react";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { GraphData } from "@/lib/types";
import { getClientSession, logoutUser, UserSession } from "@/lib/auth";
import { StoredRepo } from "@/lib/storage";

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
  currentRepoId?: string;
  graphData: GraphData | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectSampleRepo: (id: string) => void;
  recentRepos?: StoredRepo[];
  onSelectRecentRepo?: (repo: StoredRepo) => void;
  onRemoveRecentRepo?: (id: string, e: React.MouseEvent) => void;
  onReloadCurrentRepo?: () => void;
  onOpenGithubModal: () => void;
  onOpenInspectorModal: () => void;
  onOpenExportModal: () => void;
  onDirectoryUpload: (files: { path: string; code: string }[]) => void;
  isParsing: boolean;
}

export function Navbar({
  currentRepoName,
  currentRepoId,
  graphData,
  searchQuery,
  onSearchChange,
  onSelectSampleRepo,
  recentRepos = [],
  onSelectRecentRepo,
  onRemoveRecentRepo,
  onReloadCurrentRepo,
  onOpenGithubModal,
  onOpenInspectorModal,
  onOpenExportModal,
  onDirectoryUpload,
  isParsing,
}: NavbarProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

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

  const stats = graphData?.stats;
  const hasCycles = (stats?.circularLoopCount || 0) > 0;
  const isCustomWorkspace = !SAMPLE_REPOSITORIES.some((r) => r.name === currentRepoName);
  const isGuestMode = session?.isGuest || session?.email === "guest@cartofy.io" || (session?.name && session.name.toLowerCase().includes("guest"));

  const handleNativeFolderSelect = async () => {
    if (isGuestMode) return;
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
    if (isGuestMode) return;
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

  return (
    <header className="flex flex-col border-b border-zinc-800 bg-zinc-950 z-30 relative shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        className="hidden"
      />

      {/* ROW 1: Brand, Active Repository Selector, Recents Bar & Session */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-zinc-800/80">
        {/* Left: Brand Logo & Repo Selector with Reload */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
              <GitFork className="w-3.5 h-3.5 transform rotate-90 text-indigo-400" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              CodeCartofy
            </span>
          </Link>

          <span className="text-zinc-700 font-mono text-xs">/</span>

          {/* Repo Selector & Reload Button Group */}
          <div className="flex items-center gap-1">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 rounded-md px-2.5 py-1 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-sm max-w-[260px] sm:max-w-[320px]"
              >
                <div className="flex items-center gap-2 truncate">
                  {currentRepoName.startsWith("GitHub:") ? (
                    <GitHubIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : isCustomWorkspace ? (
                    <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : currentRepoName.includes("Circular") ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : currentRepoName.includes("E-Commerce") ? (
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : (
                    <Palette className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {!isCustomWorkspace && (
                    <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-800/90 border border-zinc-700/80 px-1 py-0.2 rounded shrink-0">
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

              {/* Dropdown Popover Menu with Recents */}
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-84 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-fadeIn max-h-[85vh] overflow-y-auto">
                  
                  {/* RECENT REPOSITORIES SECTION */}
                  {recentRepos.length > 0 && (
                    <div className="space-y-1 pb-2 border-b border-zinc-800/80">
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          Recent Repositories ({recentRepos.length})
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">LocalStorage</span>
                      </div>

                      <div className="space-y-1">
                        {recentRepos.map((repo) => {
                          const isSelected = repo.name === currentRepoName || repo.id === currentRepoId;
                          return (
                            <div
                              key={repo.id}
                              onClick={() => {
                                if (onSelectRecentRepo) onSelectRecentRepo(repo);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm"
                                  : "bg-zinc-950/60 border-transparent hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                  {repo.type === "github" ? (
                                    <GitHubIcon className="w-3 h-3 text-blue-400" />
                                  ) : repo.type === "upload" ? (
                                    <Folder className="w-3 h-3 text-indigo-400" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                                    {repo.name}
                                  </p>
                                  <p className="text-[9px] font-mono text-zinc-500 truncate">
                                    {repo.fileCount} Files • {new Date(repo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected ? (
                                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      if (onRemoveRecentRepo) onRemoveRecentRepo(repo.id, e);
                                    }}
                                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-900 rounded transition-colors"
                                    title="Remove from Recents"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SAMPLE REPOSITORIES SECTION */}
                  <div className="space-y-1">
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Sample Repositories
                      </span>
                    </div>

                    {SAMPLE_REPOSITORIES.map((repo) => {
                      const isSelected = repo.name === currentRepoName;
                      return (
                        <button
                          key={repo.id}
                          onClick={() => {
                            onSelectSampleRepo(repo.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-3 group ${
                            isSelected
                              ? "bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm"
                              : "bg-transparent border-transparent hover:bg-zinc-900/60 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${
                                repo.id === "circular-loop-demo"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : repo.id === "nextjs-ecommerce"
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              }`}
                            >
                              {repo.id === "circular-loop-demo" ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : repo.id === "nextjs-ecommerce" ? (
                                <ShoppingBag className="w-3 h-3" />
                              ) : (
                                <Palette className="w-3 h-3" />
                              )}
                            </div>

                            <div className="truncate">
                              <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">
                                {repo.name.replace(/^[^\s]+\s/, "")}
                              </p>
                              <p className="text-[9px] font-mono text-zinc-500 truncate">
                                {repo.files.length} Files • {repo.category}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reload / Refresh Repo Button */}
            {onReloadCurrentRepo && (
              <button
                onClick={onReloadCurrentRepo}
                disabled={isParsing}
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                title="Reload/Refresh current repository from source"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isParsing ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Right: User Session Profile Badge & Sign Out */}
        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-2">
              {isGuestMode && (
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded shadow-sm">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>GUEST MODE</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[120px]">{session.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/60 transition-all cursor-pointer"
                title="Sign Out (Lock Session)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium rounded-md transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ROW 2: Search, Recents Bar Pills, Graph Summary Stats, Import & Export Actions */}
      <div className="h-10 px-4 flex items-center justify-between bg-zinc-950/90 text-xs gap-3 overflow-x-auto">
        {/* Left: Search & Quick Recents Bar Pills */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-40 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search module or file..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 rounded-md pl-8 pr-3 py-0.5 focus:outline-none focus:border-zinc-700 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Recents Pills Bar */}
          {recentRepos.length > 0 && onSelectRecentRepo && (
            <div className="hidden lg:flex items-center gap-1.5 border-l border-zinc-800 pl-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                Recents:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[360px] no-scrollbar">
                {recentRepos.slice(0, 4).map((r) => {
                  const isActive = r.name === currentRepoName || r.id === currentRepoId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelectRecentRepo(r)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all truncate max-w-[130px] flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? "bg-zinc-800 text-zinc-100 border-zinc-700 font-semibold"
                          : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      <span className="truncate">{r.name.replace("GitHub: ", "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Graph Stats Badge */}
          {graphData && (
            <div className="hidden xl:flex items-center gap-2.5 bg-zinc-900/70 border border-zinc-800 rounded-md px-2.5 py-0.5 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-zinc-300">
                <FileCode className="w-3 h-3 text-zinc-400" />
                <span>{stats?.totalFiles} files</span>
              </div>
              <div className="h-3 w-[1px] bg-zinc-800" />
              <div className="flex items-center gap-1 text-zinc-300">
                <Layers className="w-3 h-3 text-zinc-400" />
                <span>{stats?.totalDependencies} imports</span>
              </div>
              {hasCycles && (
                <>
                  <div className="h-3 w-[1px] bg-zinc-800" />
                  <div className="flex items-center gap-1 text-red-400 font-semibold px-1 py-0.2 rounded bg-red-950/40 border border-red-900/60">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{stats?.circularLoopCount} Cycles</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Import & Export Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isGuestMode ? (
            /* Restricted Ingestion Controls in Guest Mode */
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-zinc-500 text-[11px] font-mono cursor-not-allowed"
                title="Custom folder uploads require a free account. Select any pre-loaded Sample Repository or Sign In."
              >
                <Lock className="w-3 h-3 text-amber-500/80" />
                <span className="hidden sm:inline">Folder Upload (Guest Restricted)</span>
              </div>

              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-zinc-500 text-[11px] font-mono cursor-not-allowed"
                title="GitHub repo fetching requires a free account. Select any pre-loaded Sample Repository or Sign In."
              >
                <Lock className="w-3 h-3 text-amber-500/80" />
                <span className="hidden sm:inline">GitHub Repo (Guest Restricted)</span>
              </div>
            </div>
          ) : (
            /* Full Access Ingestion Controls */
            <div className="flex items-center gap-2">
              <button
                onClick={handleNativeFolderSelect}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
                title="Ingest local project directory"
              >
                {isParsing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <FolderUp className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span className="hidden sm:inline">Folder Upload</span>
              </button>

              <button
                onClick={onOpenGithubModal}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
                title="Fetch public GitHub repository"
              >
                <GitHubIcon className="w-3.5 h-3.5 text-zinc-900" />
                <span className="hidden sm:inline">GitHub Repo</span>
              </button>
            </div>
          )}

          {/* File Inspector Trigger */}
          <button
            onClick={onOpenInspectorModal}
            className="p-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Inspect Files & Raw Code"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Export Trigger */}
          <button
            onClick={onOpenExportModal}
            className="p-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Export Image / Report"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
