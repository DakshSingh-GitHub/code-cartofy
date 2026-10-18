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
  LogOut,
  Lock,
  Clock,
  Trash2,
  RotateCw,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { SAMPLE_REPOSITORIES } from "@/lib/sampleRepositories";
import { GraphData } from "@/lib/types";
import { getClientSession, logoutUser, UserSession } from "@/lib/auth";
import { StoredRepo, formatRepoTitle, getRepoOwner } from "@/lib/storage";

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
  isDemoMode?: boolean;
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
  isDemoMode,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recentsDropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRecentsDropdownOpen, setIsRecentsDropdownOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const updateSession = () => {
      setSession(getClientSession());
    };
    updateSession();

    window.addEventListener("cartofy_session_change", updateSession);
    return () => window.removeEventListener("cartofy_session_change", updateSession);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = "/";
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (recentsDropdownRef.current && !recentsDropdownRef.current.contains(event.target as Node)) {
        setIsRecentsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = graphData?.stats;
  const hasCycles = (stats?.circularLoopCount || 0) > 0;
  const isCustomWorkspace = !SAMPLE_REPOSITORIES.some((r) => r.name === currentRepoName);
  const isGuestMode = session?.isGuest || session?.email === "guest@cartofy.io" || (session?.name && session.name.toLowerCase().includes("guest"));
  const inDemoMode = !!isDemoMode || !!isGuestMode || (currentRepoId ? SAMPLE_REPOSITORIES.some((r) => r.id === currentRepoId) : false);

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
    <header className="flex flex-col border-b border-white/5 bg-[#0c0e12] z-30 relative shrink-0 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        className="hidden"
      />

      {/* ROW 1: Brand, Active Repository Selector, Recents Bar & Session */}
      <div className="h-12 px-3 sm:px-5 flex items-center justify-between border-b border-white/5">
        {/* Left: Brand Logo & Repo Selector with Reload */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer shrink-0">
            <div className="w-7 h-7 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.4)]">
              <GitFork className="w-3.5 h-3.5 transform rotate-90 text-zinc-300" />
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-white hidden xs:inline sm:inline">
              CodeCartofy
            </span>
          </Link>

          <span className="text-zinc-600 font-mono text-xs hidden sm:inline">/</span>

          {inDemoMode && (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full clay-pill-tag text-zinc-300 text-[10px] font-mono uppercase font-semibold">
              <Sparkles className="w-3 h-3 text-zinc-300" />
              <span>Demo</span>
            </div>
          )}

          {/* Repo Selector & Reload Button Group */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="clay-pill-tag text-xs text-zinc-200 rounded-xl px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 transition-all cursor-pointer max-w-[130px] xs:max-w-[190px] sm:max-w-[280px] md:max-w-[340px]"
              >
                <div className="flex items-center gap-2 truncate">
                  {currentRepoName.startsWith("GitHub:") ? (
                    <GitHubIcon className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  ) : isCustomWorkspace ? (
                    <Folder className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  ) : currentRepoName.includes("Circular") ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : currentRepoName.includes("E-Commerce") ? (
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  ) : (
                    <Palette className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  )}
                  {!isCustomWorkspace && (
                    <span className="text-[9px] font-mono font-bold text-zinc-400 bg-[#161a22] border border-white/5 px-1 py-0.2 rounded shrink-0">
                      SAMPLE
                    </span>
                  )}
                  <span className="truncate font-medium text-white">{formatRepoTitle(currentRepoName)}</span>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? "transform rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {/* Dropdown Popover Menu with Recents */}
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 clay-container-deep border border-white/10 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 animate-fadeIn max-h-[80vh] overflow-y-auto">
                  {/* RECENT REPOSITORIES SECTION */}
                  {recentRepos.length > 0 && (
                    <div className="space-y-1.5 pb-2.5 border-b border-white/5">
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          Recent Repositories ({recentRepos.length})
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">Local Cache</span>
                      </div>

                      <div className="space-y-1">
                        {recentRepos.map((repo) => {
                          const isSelected = repo.name === currentRepoName || repo.id === currentRepoId;
                          const title = formatRepoTitle(repo.name);
                          const owner = getRepoOwner(repo.name);
                          return (
                            <div
                              key={repo.id}
                              onClick={() => {
                                if (onSelectRecentRepo) onSelectRecentRepo(repo);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                                isSelected
                                  ? "clay-card-raised border-white/10 text-white shadow-sm"
                                  : "border-transparent hover:bg-[#161a22] text-zinc-400 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <div className="w-6 h-6 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
                                  {repo.type === "github" ? (
                                    <GitHubIcon className="w-3 h-3 text-zinc-300" />
                                  ) : repo.type === "upload" ? (
                                    <Folder className="w-3 h-3 text-zinc-300" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 text-zinc-300" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                                    {title}
                                  </p>
                                  <p className="text-[10px] font-mono text-zinc-500 truncate">
                                    {owner ? `${owner} • ` : ""}{repo.fileCount} Files • {new Date(repo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-[#1f1315] rounded transition-colors"
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

                  {/* SAMPLE REPOSITORIES SECTION - ONLY VISIBLE IN DEMO MODE */}
                  {inDemoMode ? (
                    <div className="space-y-1.5">
                      <div className="px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-zinc-300" />
                          Demo Repositories
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">Preloaded</span>
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
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                              isSelected
                                ? "clay-card-raised border-white/10 text-white shadow-sm"
                                : "border-transparent hover:bg-[#161a22] text-zinc-400 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-6 h-6 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
                                {repo.id === "circular-loop-demo" ? (
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                ) : repo.id === "nextjs-ecommerce" ? (
                                  <ShoppingBag className="w-3 h-3 text-zinc-300" />
                                ) : (
                                  <Palette className="w-3 h-3 text-zinc-300" />
                                )}
                              </div>

                              <div className="truncate">
                                <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate">
                                  {repo.name.replace(/^[^\s]+\s/, "")}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-500 truncate">
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
                  ) : (
                    <div className="pt-2 border-t border-white/5">
                      <Link
                        href="/cartofy?demo=true"
                        onClick={() => setIsDropdownOpen(false)}
                        className="clay-card-raised w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 text-zinc-300 hover:text-white group"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="text-xs font-medium">Switch to Demo Mode</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Reload / Refresh Repo Button */}
            {onReloadCurrentRepo && (
              <button
                onClick={onReloadCurrentRepo}
                disabled={isParsing}
                className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer shrink-0"
                title="Reload/Refresh repository from source"
              >
                <RotateCw className={`w-3 h-3 ${isParsing ? "animate-spin text-zinc-200" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Dashboard Link, Profile Badge & Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="clay-button-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Go to Dashboard"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {isGuestMode && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>GUEST</span>
            </div>
          )}

          {session ? (
            <div className="flex items-center gap-2">
              <div className="clay-pill-tag px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-2 text-xs text-zinc-200 font-mono">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 bg-[#1e2533] flex items-center justify-center text-[10px] font-bold text-sky-200 shadow-inner">
                  <img
                    src={session.avatarUrl || "/vlyxir/favicon.png"}
                    alt={session.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                    }}
                  />
                </div>
                <span className="truncate max-w-[110px] font-medium text-zinc-100 hidden md:inline">{session.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="clay-pill-tag hover:bg-[#1a202c] px-3.5 py-1.5 rounded-xl text-xs text-zinc-200 hover:text-white transition-all font-semibold flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* ROW 2: Search, Recents Bar Pills, Graph Summary Stats, Import & Export Actions */}
      <div className="h-11 px-3 sm:px-5 flex items-center justify-between text-xs gap-2 sm:gap-3 relative">
        {/* Left: Search & Quick Recents Bar Pills */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="relative w-28 xs:w-36 sm:w-48 md:w-56">
            <Search className="w-3 h-3 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search module or file..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="clay-recessed-input w-full text-xs text-zinc-100 placeholder-zinc-500 rounded-xl pl-8 pr-6 py-1 focus:outline-none transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Recents Dropdown */}
          {recentRepos.length > 0 && onSelectRecentRepo && (
            <div className="relative shrink-0 border-l border-white/5 pl-2 sm:pl-2.5" ref={recentsDropdownRef}>
              <button
                onClick={() => setIsRecentsDropdownOpen((prev) => !prev)}
                className="clay-pill-tag text-xs text-zinc-300 hover:text-white rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-1.5 cursor-pointer transition-all font-mono"
                title="View recent repositories"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-sans text-xs font-semibold text-zinc-200">Recents</span>
                <span className="text-[10px] font-mono text-zinc-400 bg-[#161a22] border border-white/5 px-1.5 py-0.2 rounded-full font-bold">
                  {recentRepos.length}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                    isRecentsDropdownOpen ? "transform rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {/* Recents Dropdown Popover Menu */}
              {isRecentsDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-2rem)] clay-container-deep border border-white/10 rounded-2xl shadow-2xl z-[60] p-2.5 space-y-1.5 animate-fadeIn max-h-80 overflow-y-auto">
                  <div className="px-2 py-1 flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      Recent Repositories ({recentRepos.length})
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">History</span>
                  </div>

                  <div className="space-y-1">
                    {recentRepos.map((repo) => {
                      const isActive = repo.name === currentRepoName || repo.id === currentRepoId;
                      const title = formatRepoTitle(repo.name);
                      const owner = getRepoOwner(repo.name);

                      return (
                        <div
                          key={repo.id}
                          onClick={() => {
                            onSelectRecentRepo(repo);
                            setIsRecentsDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 group cursor-pointer ${
                            isActive
                              ? "clay-card-raised border-white/10 text-white shadow-sm"
                              : "border-transparent hover:bg-[#161a22] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
                              {repo.type === "github" ? (
                                <GitHubIcon className="w-3.5 h-3.5 text-zinc-300" />
                              ) : repo.type === "upload" ? (
                                <Folder className="w-3.5 h-3.5 text-zinc-300" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                              )}
                            </div>
                            <div className="truncate min-w-0">
                              <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                                {title}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-500 truncate">
                                {owner ? `${owner} • ` : ""}{repo.fileCount} files
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isActive ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            ) : onRemoveRecentRepo ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveRecentRepo(repo.id, e);
                                }}
                                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-[#1f1315] rounded transition-colors"
                                title="Remove from Recents"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Graph Stats Badge */}
          {graphData && (
            <div className="hidden xl:flex items-center gap-2.5 clay-pill-tag rounded-full px-3 py-1 font-mono text-[11px]">
              <div className="flex items-center gap-1 text-zinc-300">
                <FileCode className="w-3 h-3 text-zinc-400" />
                <span>{stats?.totalFiles} files</span>
              </div>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1 text-zinc-300">
                <Layers className="w-3 h-3 text-zinc-400" />
                <span>{stats?.totalDependencies} imports</span>
              </div>
              {hasCycles && (
                <>
                  <div className="h-3 w-[1px] bg-white/10" />
                  <div className="flex items-center gap-1 text-red-300 font-semibold px-2 py-0.2 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>{stats?.circularLoopCount} Loops</span>
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
                className="flex items-center gap-1 px-3 py-1 rounded-xl clay-pill-tag text-zinc-500 text-[11px] font-mono cursor-not-allowed"
                title="Custom folder uploads require a free account."
              >
                <Lock className="w-3 h-3 text-amber-500/70" />
                <span className="hidden sm:inline">Folder Upload</span>
              </div>

              <div
                className="flex items-center gap-1 px-3 py-1 rounded-xl clay-pill-tag text-zinc-500 text-[11px] font-mono cursor-not-allowed"
                title="GitHub repo fetching requires a free account."
              >
                <Lock className="w-3 h-3 text-amber-500/70" />
                <span className="hidden sm:inline">GitHub Repo</span>
              </div>
            </div>
          ) : (
            /* Full Access Ingestion Controls */
            <div className="flex items-center gap-2">
              <button
                onClick={handleNativeFolderSelect}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl clay-pill-tag text-zinc-300 hover:text-white text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl clay-button-white text-zinc-950 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
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
            className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Inspect Files & Raw Code"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Export Trigger */}
          <button
            onClick={onOpenExportModal}
            className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Export Image / Report"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
