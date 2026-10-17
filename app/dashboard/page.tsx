"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getClientSession,
  logoutUser,
  updateUserSession,
  UserSession,
} from "@/lib/auth";
import {
  fetchUserGitHubProfile,
  fetchUserPublicRepositories,
  GitHubUserProfile,
  GitHubRepoSummary,
} from "@/lib/githubFetcher";
import { getRecentRepos, StoredRepo, removeRecentRepo } from "@/lib/storage";
import {
  saveUserGithubConnection,
  fetchUserGithubConnection,
  deleteUserGithubConnection,
} from "@/lib/supabase";
import {
  GitFork,
  LogOut,
  Search,
  Star,
  GitBranch,
  ArrowRight,
  Sparkles,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Code2,
  Shield,
  Unlink,
  FolderGit2,
  Activity,
  Globe,
  Loader2,
  Trash2,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function getLanguageColor(language: string | null): string {
  if (!language) return "#71717a";
  switch (language.toLowerCase()) {
    case "typescript":
      return "#3178c6";
    case "javascript":
      return "#f7df1e";
    case "python":
      return "#3572a5";
    case "go":
      return "#00add8";
    case "rust":
      return "#dea584";
    case "html":
      return "#e34c26";
    case "css":
      return "#563d7c";
    case "c++":
    case "cpp":
      return "#f34b7d";
    case "c#":
    case "csharp":
      return "#178600";
    case "php":
      return "#4f5d95";
    case "ruby":
      return "#701516";
    case "java":
      return "#b07219";
    case "swift":
      return "#f05138";
    default:
      return "#a1a1aa";
  }
}

function DashboardContent() {
  const router = useRouter();

  // Session & User State
  const [session, setSession] = useState<UserSession | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<StoredRepo[]>([]);

  // GitHub Connection State
  const [githubInput, setGithubInput] = useState("");
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState<GitHubUserProfile | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [dbNotice, setDbNotice] = useState<{ message: string; type: "error" | "warning" | "success" } | null>(null);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Repositories List State
  const [repos, setRepos] = useState<GitHubRepoSummary[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "stars" | "name">("updated");

  // Load active session, recent analyses, and persistent database GitHub connection
  useEffect(() => {
    const active = getClientSession();
    setSession(active);
    if (active) {
      setRecentAnalyses(getRecentRepos(active));

      // Query Supabase database table `user_github_connections` to restore handle if not in cookie
      fetchUserGithubConnection(active).then((conn) => {
        if (conn && conn.github_username) {
          if (!active.githubUsername || active.githubUsername !== conn.github_username) {
            updateUserSession({
              githubUsername: conn.github_username,
              avatarUrl: active.avatarUrl || conn.avatar_url,
            }).then((updated) => {
              if (updated) setSession(updated);
            });
          }
        }
      });
    }
  }, []);

  // When session has githubUsername, auto-fetch public repositories
  useEffect(() => {
    if (session?.githubUsername) {
      fetchRepositories(session.githubUsername);
    }
  }, [session?.githubUsername]);

  const fetchRepositories = async (ghUser: string) => {
    setIsLoadingRepos(true);
    setReposError(null);
    try {
      const fetched = await fetchUserPublicRepositories(ghUser);
      setRepos(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load public repositories";
      setReposError(msg);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Live verification of GitHub username before connecting
  const handleVerifyGithub = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = githubInput.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (!clean) {
      setGithubError("Please enter a GitHub username or profile link.");
      return;
    }

    setIsVerifyingGithub(true);
    setGithubError(null);
    setVerifiedProfile(null);

    try {
      const profile = await fetchUserGitHubProfile(clean);
      setVerifiedProfile(profile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not find GitHub account";
      setGithubError(msg);
    } finally {
      setIsVerifyingGithub(false);
    }
  };

  // Connect verified GitHub handle to user session and database table
  const handleConfirmConnect = async () => {
    if (!verifiedProfile) return;
    setIsConnectingGithub(true);
    setDbNotice(null);
    try {
      const activeUser = session || getClientSession();
      // 1. Persist connection in Supabase `user_github_connections` table
      if (activeUser) {
        const dbRes = await saveUserGithubConnection(activeUser, {
          githubUsername: verifiedProfile.login,
          avatarUrl: verifiedProfile.avatarUrl,
          profileUrl: verifiedProfile.htmlUrl,
          publicReposCount: verifiedProfile.publicRepos,
        });

        if (!dbRes.success && dbRes.error) {
          if (dbRes.error.includes("Row Level Security") || dbRes.error.includes("42501")) {
            setDbNotice({
              type: "warning",
              message: "GitHub connected to your dashboard! Note: Supabase write was blocked by Row Level Security. Run fix_github_table.sql in your Supabase SQL editor to allow table writes.",
            });
          } else {
            setDbNotice({
              type: "warning",
              message: `Database sync issue: ${dbRes.error}`,
            });
          }
        } else {
          setDbNotice({
            type: "success",
            message: `GitHub account (@${verifiedProfile.login}) successfully synchronized with database table user_github_connections.`,
          });
        }
      }

      // 2. Update active cookie and session state
      const updated = await updateUserSession({
        githubUsername: verifiedProfile.login,
        avatarUrl: (activeUser ? activeUser.avatarUrl : null) || verifiedProfile.avatarUrl,
      });
      if (updated) {
        setSession(updated);
      }
      setIsConnectModalOpen(false);
      setVerifiedProfile(null);
      setGithubInput("");
      await fetchRepositories(verifiedProfile.login);
    } catch (err) {
      console.error("Failed to connect GitHub handle:", err);
      setGithubError("Failed to save connection. Please try again.");
    } finally {
      setIsConnectingGithub(false);
    }
  };

  // Disconnect GitHub handle and remove from database table
  const handleDisconnectGithub = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub profile?")) return;
    try {
      const activeUser = session || getClientSession();
      if (activeUser) {
        await deleteUserGithubConnection(activeUser);
      }
      const updated = await updateUserSession({ githubUsername: undefined });
      if (updated) {
        setSession(updated);
      }
      setRepos([]);
    } catch (err) {
      console.error("Failed to disconnect GitHub account:", err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = "/";
  };

  const handleRemoveRecent = (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = removeRecentRepo(repoId, session);
    setRecentAnalyses(updated);
  };

  // Filtered & Sorted repositories
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    repos.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set).sort();
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let result = repos.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLang =
        selectedLanguage === "all" ||
        (r.language && r.language.toLowerCase() === selectedLanguage.toLowerCase());
      return matchesSearch && matchesLang;
    });

    if (sortBy === "stars") {
      result.sort((a, b) => b.stars - a.stars);
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [repos, searchQuery, selectedLanguage, sortBy]);

  // Aggregate stats
  const totalStars = useMemo(() => repos.reduce((acc, r) => acc + r.stars, 0), [repos]);
  const totalAnalyzed = recentAnalyses.length;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-black/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <GitFork className="w-4 h-4 transform rotate-90" />
              </div>
              <span className="font-semibold text-base tracking-tight text-white">
                CodeCartofy
              </span>
            </Link>

            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cartofy"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 hover:text-white transition-all shadow-sm group"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Cartofy Studio</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
            </Link>

            {session && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md shadow-sm">
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-zinc-700 bg-zinc-950 flex items-center justify-center">
                    <img
                      src={session.avatarUrl || "/vlyxir/favicon.png"}
                      alt={session.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                      }}
                    />
                  </div>
                  <span className="truncate max-w-[120px] font-medium text-zinc-100">
                    {session.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/60 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Database Status Alert Banner */}
        {dbNotice && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
              dbNotice.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : dbNotice.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {dbNotice.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              <span>{dbNotice.message}</span>
            </div>
            <button
              onClick={() => setDbNotice(null)}
              className="text-[11px] font-mono hover:text-white transition-colors underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* User Hero Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border border-zinc-800 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 shrink-0 shadow-lg flex items-center justify-center">
                <img
                  src={session?.avatarUrl || "/vlyxir/favicon.png"}
                  alt={session?.name || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {session?.name || "Developer"}
                  </h1>
                  {session?.isGuest && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      GUEST SANDBOX
                    </span>
                  )}
                  {session?.isVlyxir && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                      VLYXIR SSO
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 font-mono">
                  {session?.email || "dev@cartofy.io"} • {session?.country || "Global"}
                </p>

                {/* Connected GitHub Status Tag */}
                <div className="pt-1 flex items-center gap-2">
                  {session?.githubUsername ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono">
                      <GitHubIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Connected: github.com/{session.githubUsername}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 text-xs font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>GitHub Not Connected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Connect GitHub or Refresh */}
            <div className="flex items-center gap-3 shrink-0">
              {session?.githubUsername ? (
                <>
                  <button
                    onClick={() => fetchRepositories(session.githubUsername!)}
                    disabled={isLoadingRepos}
                    className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Refresh repositories from GitHub"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? "animate-spin text-indigo-400" : ""}`} />
                    <span>Sync Repos</span>
                  </button>

                  <button
                    onClick={handleDisconnectGithub}
                    className="px-3 py-2 rounded-lg bg-zinc-900/60 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/60 text-xs text-zinc-400 hover:text-red-300 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Disconnect GitHub account"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="px-4 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-white/5 cursor-pointer"
                >
                  <GitHubIcon className="w-4 h-4 text-black" />
                  <span>Connect GitHub Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Glances Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>PUBLIC REPOS</span>
              <FolderGit2 className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-2xl font-bold text-white font-mono">{repos.length}</p>
            <p className="text-[11px] text-zinc-500">Fetched from GitHub</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>ANALYZED REPOS</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-indigo-400 font-mono">{totalAnalyzed}</p>
            <p className="text-[11px] text-zinc-500">Saved in Cartofy recents</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>TOTAL STARS</span>
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400 font-mono">{totalStars}</p>
            <p className="text-[11px] text-zinc-500">Across public repositories</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>LANGUAGES</span>
              <Code2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{availableLanguages.length}</p>
            <p className="text-[11px] text-zinc-500">Active project stacks</p>
          </div>
        </div>

        {/* PROMPT BANNER: If GitHub is NOT connected */}
        {!session?.githubUsername && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                <GitHubIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Connect your GitHub profile to unlock your repositories
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Link your public GitHub profile to see all your repositories listed in one place.
                  Click on any repository to instantly parse its Abstract Syntax Tree (AST), detect
                  circular dependencies, and inspect architecture.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-md"
            >
              <GitHubIcon className="w-4 h-4 text-black" />
              <span>Connect GitHub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SECTION: Recent Glances & Analyses */}
        {recentAnalyses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Recent Architectural Glances</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {recentAnalyses.length} analyzed workspace(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recentAnalyses.slice(0, 3).map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => router.push(`/cartofy?repo=${encodeURIComponent(repo.id)}`)}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group space-y-3 relative"
                >
                  <button
                    onClick={(e) => handleRemoveRecent(repo.id, e)}
                    className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from recents"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {repo.type}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {new Date(repo.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                      {repo.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {repo.fileCount || repo.files?.length || 0} files mapped
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-indigo-400 font-mono">
                    <span>Resume Graph</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: Public Repositories Explorer */}
        {session?.githubUsername && (
          <div className="space-y-4 pt-2">
            {/* Header & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <GitHubIcon className="w-4 h-4 text-white" />
                  <h2 className="text-base font-semibold text-white">
                    Repositories for @{session.githubUsername}
                  </h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Select any repository to download its source tree and launch interactive AST cartography.
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none transition-all placeholder:text-zinc-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer font-mono"
                >
                  <option value="updated">Sort: Recently Updated</option>
                  <option value="stars">Sort: Most Starred</option>
                  <option value="name">Sort: Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Language Filter Pills */}
            {availableLanguages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
                <span className="text-[11px] text-zinc-500 uppercase mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
                  Stack:
                </span>
                <button
                  onClick={() => setSelectedLanguage("all")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    selectedLanguage === "all"
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  All ({repos.length})
                </button>
                {availableLanguages.map((lang) => {
                  const count = repos.filter((r) => r.language === lang).length;
                  return (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        selectedLanguage === lang
                          ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getLanguageColor(lang) }}
                      />
                      <span>{lang}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Repositories Loading Skeleton */}
            {isLoadingRepos && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-3 animate-pulse"
                  >
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-900 rounded w-full" />
                    <div className="h-3 bg-zinc-900 rounded w-1/2" />
                    <div className="h-8 bg-zinc-900 rounded w-full mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {reposError && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{reposError}</span>
                </div>
                <button
                  onClick={() => fetchRepositories(session.githubUsername!)}
                  className="px-2.5 py-1 rounded bg-red-900/50 hover:bg-red-900 text-white text-xs font-mono"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingRepos && !reposError && filteredRepos.length === 0 && (
              <div className="text-center py-16 bg-zinc-950/50 rounded-2xl border border-zinc-800/60 p-8 space-y-3">
                <FolderGit2 className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-semibold text-white">No repositories match your criteria</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Try adjusting your search query or language filter, or refresh your repositories.
                </p>
                {searchQuery || selectedLanguage !== "all" ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedLanguage("all");
                    }}
                    className="px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    Clear Filters
                  </button>
                ) : null}
              </div>
            )}

            {/* Repositories Card Grid */}
            {!isLoadingRepos && filteredRepos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between group relative shadow-sm hover:shadow-indigo-500/5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                          {repo.name}
                        </h3>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors shrink-0"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                        {repo.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 space-y-3">
                      {/* Meta badges: Language, Stars, Forks */}
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 border-t border-zinc-900 pt-3">
                        {repo.language && (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getLanguageColor(repo.language) }}
                            />
                            <span>{repo.language}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <span>{repo.stars}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{repo.forks}</span>
                        </div>

                        <span className="ml-auto text-[10px] text-zinc-500">
                          {new Date(repo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Primary CTA: Launch AST Analysis */}
                      <button
                        onClick={() => {
                          router.push(`/cartofy?github=${encodeURIComponent(repo.fullName)}`);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-indigo-500/50 text-xs font-medium transition-all flex items-center justify-center gap-2 group/btn cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:scale-110 transition-transform" />
                        <span>Analyze Architecture</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:translate-x-1 group-hover/btn:text-white transition-all" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 text-center text-xs text-zinc-500 font-mono">
        © 2026 CODECARTOFY • PERSONALIZED DEVELOPER DASHBOARD
      </footer>

      {/* CONNECT GITHUB MODAL */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsConnectModalOpen(false);
                setVerifiedProfile(null);
                setGithubError(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-2">
                <GitHubIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Connect Public GitHub Profile
              </h2>
              <p className="text-xs text-zinc-400">
                Enter your GitHub handle to automatically discover and list your public repositories.
              </p>
            </div>

            {githubError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{githubError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyGithub} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  GITHUB USERNAME OR URL
                </label>
                <div className="relative">
                  <GitHubIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. dakshdts or octocat"
                    value={githubInput}
                    onChange={(e) => {
                      setGithubInput(e.target.value);
                      setVerifiedProfile(null);
                      setGithubError(null);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-20 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingGithub || !githubInput.trim()}
                    className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-bold text-zinc-200 rounded uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifyingGithub ? (
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
                    ) : (
                      "VERIFY"
                    )}
                  </button>
                </div>
              </div>

              {/* Verified Profile Preview */}
              {verifiedProfile && (
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-emerald-800/60 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <img
                      src={verifiedProfile.avatarUrl}
                      alt={verifiedProfile.login}
                      className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{verifiedProfile.name || verifiedProfile.login}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        @{verifiedProfile.login} • {verifiedProfile.publicRepos} public repos
                      </p>
                      {verifiedProfile.bio && (
                        <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                          {verifiedProfile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setVerifiedProfile(null);
                    setGithubError(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmConnect}
                  disabled={!verifiedProfile || isConnectingGithub}
                  className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isConnectingGithub ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Linking...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
