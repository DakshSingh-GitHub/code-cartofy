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
import {
  getRecentRepos,
  StoredRepo,
  removeRecentRepo,
  formatRepoTitle,
  getRepoOwner,
  getUserAiFixHistory,
  deleteAiFixFromHistory,
} from "@/lib/storage";
import { AiFixRecord } from "@/lib/types";
import { SpofFixModal } from "@/components/SpofFixModal";
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
  GitPullRequest,
  ClipboardList,
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

  // Global User AI Fix History & Raised Issues
  const [aiFixes, setAiFixes] = useState<AiFixRecord[]>([]);
  const [deletingFixId, setDeletingFixId] = useState<string | null>(null);
  const [issuesFilter, setIssuesFilter] = useState<"all" | "issues_only" | "plans_only">("all");
  const [selectedReviewFix, setSelectedReviewFix] = useState<AiFixRecord | null>(null);

  // Load active session, recent analyses, persistent database GitHub connection, and global AI fixes
  useEffect(() => {
    let isCancelled = false;
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
              if (updated && !isCancelled) setSession(updated);
            });
          }
        }
      });
    }

    // Load global user AI fixes (from Supabase + local cache)
    getUserAiFixHistory(active)
      .then((records) => {
        if (!isCancelled) setAiFixes(records);
      })
      .catch((err) => console.warn("Failed to load AI fixes:", err));

    const handleFixesUpdate = () => {
      getUserAiFixHistory(getClientSession())
        .then((records) => {
          if (!isCancelled) setAiFixes(records);
        })
        .catch(console.warn);
    };

    window.addEventListener("cartofy_aifix_change", handleFixesUpdate);
    window.addEventListener("storage", handleFixesUpdate);
    return () => {
      isCancelled = true;
      window.removeEventListener("cartofy_aifix_change", handleFixesUpdate);
      window.removeEventListener("storage", handleFixesUpdate);
    };
  }, []);

  const handleDeleteAiFix = async (fixId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingFixId(fixId);
      const remaining = await deleteAiFixFromHistory(fixId);
      setAiFixes(remaining);
    } catch (err) {
      console.warn("Failed to delete fix:", err);
    } finally {
      setDeletingFixId(null);
    }
  };

  const filteredAiFixes = useMemo(() => {
    if (issuesFilter === "issues_only") {
      return aiFixes.filter((f) => Boolean(f.githubIssueUrl && f.githubIssueNumber));
    }
    if (issuesFilter === "plans_only") {
      return aiFixes.filter((f) => f.fixType === "plan" || !f.githubIssueNumber);
    }
    return aiFixes;
  }, [aiFixes, issuesFilter]);

  const raisedIssuesCount = useMemo(() => {
    return aiFixes.filter((f) => Boolean(f.githubIssueUrl && f.githubIssueNumber)).length;
  }, [aiFixes]);

  const plansCount = useMemo(() => {
    return aiFixes.filter((f) => f.fixType === "plan" || !f.githubIssueNumber).length;
  }, [aiFixes]);

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
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Top Floating Navigation Capsule */}
      <header className="w-full pt-5 px-4 sm:px-6 z-30 sticky top-0">
        <div className="max-w-7xl mx-auto clay-nav-capsule rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.4)] group-hover:border-white/10 transition-all">
                <GitFork className="w-4 h-4 transform rotate-90 text-zinc-300" />
              </div>
              <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
                CodeCartofy
              </span>
            </Link>

            <span className="text-zinc-600 hidden sm:inline">/</span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full clay-pill-tag text-zinc-300 hidden sm:inline">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/cartofy"
              className="clay-pill-tag px-3 py-1.5 rounded-full text-xs text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden xs:inline sm:inline">Cartofy Studio</span>
              <ArrowRight className="w-3 h-3 text-zinc-500" />
            </Link>

            {session && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/5">
                <div className="clay-pill-tag px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-2 text-xs text-zinc-200 font-mono">
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 bg-[#1e2533] flex items-center justify-center text-[10px] font-bold text-sky-200">
                    <img
                      src={session.avatarUrl || "/vlyxir/favicon.png"}
                      alt={session.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                      }}
                    />
                  </div>
                  <span className="truncate max-w-[120px] font-medium text-zinc-100 hidden sm:inline">
                    {session.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-xl bg-[#141720] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)] cursor-pointer"
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
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Database Status Alert Banner */}
        {dbNotice && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-lg ${
              dbNotice.type === "error"
                ? "bg-[#1f1315] border-red-500/30 text-red-300"
                : dbNotice.type === "warning"
                ? "bg-[#1f1a14] border-amber-500/30 text-amber-300"
                : "bg-[#121c17] border-emerald-500/30 text-emerald-300"
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

        {/* User Hero Banner in Tactile Claymorphism */}
        <div className="clay-container-deep p-6 sm:p-8 rounded-[2rem] relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-white/10 bg-[#161a22] shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_6px_16px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <img
                  src={session?.avatarUrl || "/vlyxir/favicon.png"}
                  alt={session?.name || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {session?.name || "Developer"}
                  </h1>
                  {session?.isGuest && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      GUEST SANDBOX
                    </span>
                  )}
                  {session?.isVlyxir && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 border border-sky-500/30 text-sky-300">
                      VLYXIR SSO
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 font-mono">
                  {session?.email || "dev@cartofy.io"} • {session?.country || "Global Workspace"}
                </p>

                {/* Connected GitHub Status Tag */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {session?.githubUsername ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full clay-pill-tag text-zinc-300 text-xs font-mono">
                      <GitHubIcon className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Connected: github.com/{session.githubUsername}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181512] border border-amber-500/20 text-amber-400 text-xs font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>GitHub Not Connected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Connect GitHub or Refresh */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {session?.githubUsername ? (
                <>
                  <button
                    onClick={() => fetchRepositories(session.githubUsername!)}
                    disabled={isLoadingRepos}
                    className="clay-pill-tag px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Refresh repositories from GitHub"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? "animate-spin text-zinc-200" : ""}`} />
                    <span>Sync Repos</span>
                  </button>

                  <button
                    onClick={handleDisconnectGithub}
                    className="clay-pill-tag px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Disconnect GitHub account"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="clay-button-white px-5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <GitHubIcon className="w-4 h-4 text-black" />
                  <span>Connect GitHub Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tactile Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="clay-card-raised p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>PUBLIC REPOS</span>
              <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-zinc-400 shadow-inner">
                <FolderGit2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{repos.length}</p>
            <p className="text-[11px] text-zinc-500">Discovered from GitHub</p>
          </div>

          <div className="clay-card-raised p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>ANALYZED REPOS</span>
              <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-100 font-mono">{totalAnalyzed}</p>
            <p className="text-[11px] text-zinc-500">Stored in Cartofy recents</p>
          </div>

          <div className="clay-card-raised p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>TOTAL STARS</span>
              <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-zinc-400 shadow-inner">
                <Star className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-200 font-mono">{totalStars}</p>
            <p className="text-[11px] text-zinc-500">Across public repositories</p>
          </div>

          <div className="clay-card-raised p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>STACKS</span>
              <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-zinc-400 shadow-inner">
                <Code2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-200 font-mono">{availableLanguages.length}</p>
            <p className="text-[11px] text-zinc-500">Active project stacks</p>
          </div>

          <div className="clay-card-raised p-5 rounded-2xl space-y-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>RAISED ISSUES</span>
              <div className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-purple-400 shadow-inner">
                <GitPullRequest className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-300 font-mono">{raisedIssuesCount}</p>
            <p className="text-[11px] text-zinc-500">
              {aiFixes.length} total AI fix plan{aiFixes.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* PROMPT BANNER: If GitHub is NOT connected */}
        {!session?.githubUsername && (
          <div className="clay-container-deep p-6 sm:p-7 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0f1217] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner shrink-0">
                <GitHubIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Connect your GitHub profile to unlock your repositories
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Link your public GitHub profile to see all your repositories listed in one tactile workspace.
                  Click on any repository to instantly parse its Abstract Syntax Tree (AST), detect
                  circular dependencies, and inspect architecture.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="clay-button-white px-5 py-2.5 rounded-2xl text-xs font-semibold shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <GitHubIcon className="w-4 h-4 text-black" />
              <span>Connect GitHub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SECTION: Recent Glances & Analyses */}
        {recentAnalyses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-white tracking-tight">Recent Architectural Glances</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {recentAnalyses.length} analyzed workspace(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentAnalyses.slice(0, 3).map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => router.push(`/cartofy?repo=${encodeURIComponent(repo.id)}`)}
                  className="clay-card-raised p-5 rounded-2xl cursor-pointer group space-y-3 relative"
                >
                  <button
                    onClick={(e) => handleRemoveRecent(repo.id, e)}
                    className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from recents"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold clay-pill-tag text-zinc-300">
                      {repo.type}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {new Date(repo.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-white group-hover:text-zinc-200 transition-colors truncate">
                      {formatRepoTitle(repo.name)}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                      {getRepoOwner(repo.name) ? `${getRepoOwner(repo.name)} • ` : ""}{repo.fileCount || repo.files?.length || 0} files mapped
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-zinc-300 font-mono">
                    <span>Resume Graph</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: Global AI Fixes & Raised Issues Hub */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">AI Fixes & Raised Issues Hub</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/5 text-zinc-300 border border-white/10">
                    {aiFixes.length} Total
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Global repository refactoring history, automated SPOF remediations, and published GitHub issues across all repositories.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
              <button
                onClick={() => setIssuesFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  issuesFilter === "all"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All ({aiFixes.length})
              </button>
              <button
                onClick={() => setIssuesFilter("issues_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                  issuesFilter === "issues_only"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <GitPullRequest className="w-3 h-3 text-emerald-400" />
                Issues ({raisedIssuesCount})
              </button>
              <button
                onClick={() => setIssuesFilter("plans_only")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  issuesFilter === "plans_only"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Plans ({plansCount})
              </button>
            </div>
          </div>

          {filteredAiFixes.length === 0 ? (
            <div className="clay-card-flat p-8 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400">
                <Sparkles className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="max-w-md">
                <h3 className="text-xs font-semibold text-white">
                  {issuesFilter === "all"
                    ? "No AI fixes generated yet"
                    : issuesFilter === "issues_only"
                    ? "No GitHub issues raised yet"
                    : "No standalone refactoring plans found"}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {issuesFilter === "all"
                    ? "Run SPOF or architecture scans in any repository inside Cartofy to generate AI recommendations and publish GitHub issues."
                    : "Launch Cartofy and click 'AI Fix' on any High priority bottleneck or SPOF to raise an issue directly on GitHub."}
                </p>
              </div>
              <Link
                href="/cartofy"
                className="clay-button-white px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 mt-2"
              >
                <span>Open Cartofy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAiFixes.map((fix) => {
                const hasIssue = Boolean(fix.githubIssueNumber && fix.githubIssueUrl);
                const repoDisplayName = fix.repoName.replace(/^GitHub:\s*/i, "");
                return (
                  <div
                    key={fix.id}
                    onClick={() => setSelectedReviewFix(fix)}
                    className="clay-card-raised p-5 rounded-2xl flex flex-col justify-between group space-y-3 relative hover:border-sky-500/40 transition-all cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {/* Top row: Repo badge + Issue pill + Delete */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-[11px] font-mono text-zinc-300 truncate max-w-[150px]" title={repoDisplayName}>
                            {repoDisplayName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasIssue ? (
                            <a
                              href={fix.githubIssueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                              title="View Issue on GitHub"
                            >
                              <GitPullRequest className="w-2.5 h-2.5" />
                              <span>#{fix.githubIssueNumber}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : fix.fixType === "plan" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                              <ClipboardList className="w-2.5 h-2.5 text-sky-400" />
                              <span>Plan</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-zinc-800 text-zinc-400 border border-white/5">
                              Plan
                            </span>
                          )}

                          <button
                            onClick={(e) => handleDeleteAiFix(fix.id, e)}
                            disabled={deletingFixId === fix.id}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete record"
                          >
                            {deletingFixId === fix.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Title & Pattern */}
                      <h3 className="text-xs font-semibold text-white group-hover:text-purple-200 transition-colors line-clamp-1">
                        {fix.title}
                      </h3>

                      {fix.architecturalPattern && (
                        <div className="mt-1">
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {fix.architecturalPattern}
                          </span>
                        </div>
                      )}

                      {fix.dos && fix.dos.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            ✓ Do&apos;s &amp; Don&apos;ts included
                          </span>
                        </div>
                      )}

                      {/* Summary */}
                      <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {fix.summary}
                      </p>

                      {/* Target File */}
                      {fix.targetFile && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 truncate">
                          <Code2 className="w-3 h-3 shrink-0 text-zinc-400" />
                          <span className="truncate" title={fix.targetFile}>
                            {fix.targetFile}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-white/5">
                      <span className="text-[10px] text-zinc-500">
                        {new Date(fix.timestamp).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReviewFix(fix);
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

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/cartofy?repo=${encodeURIComponent(
                                fix.repoId || fix.repoName
                              )}&fixId=${encodeURIComponent(fix.id)}`
                            );
                          }}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 transition-all text-[11px] p-1"
                          title="Inspect in Cartofy Workspace"
                        >
                          <span className="hidden sm:inline">Workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION: Public Repositories Explorer */}
        {session?.githubUsername && (
          <div className="space-y-5 pt-2">
            {/* Header & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <GitHubIcon className="w-4 h-4 text-zinc-200" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Repositories for @{session.githubUsername}
                  </h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Select any repository to download its source tree and launch interactive AST cartography.
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search in Recessed Chassis */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="clay-recessed-input w-full text-xs text-white rounded-2xl pl-9 pr-8 py-2 focus:outline-none transition-all placeholder:text-zinc-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sort Dropdown in Pill Chassis */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="clay-pill-tag text-xs text-zinc-300 rounded-2xl px-3.5 py-2 focus:outline-none cursor-pointer font-mono"
                >
                  <option value="updated">Sort: Recently Updated</option>
                  <option value="stars">Sort: Most Starred</option>
                  <option value="name">Sort: Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Language Filter Pills */}
            {availableLanguages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
                <span className="text-[11px] text-zinc-500 uppercase mr-1 flex items-center gap-1 shrink-0">
                  <SlidersHorizontal className="w-3 h-3 text-zinc-500" />
                  Stack:
                </span>
                <button
                  onClick={() => setSelectedLanguage("all")}
                  className={`px-3 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
                    selectedLanguage === "all"
                      ? "clay-button-white text-zinc-950 font-semibold"
                      : "clay-pill-tag text-zinc-400 hover:text-zinc-200"
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
                      className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        selectedLanguage === lang
                          ? "clay-button-white text-zinc-950 font-semibold"
                          : "clay-pill-tag text-zinc-400 hover:text-zinc-200"
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
                    className="clay-card-raised p-6 rounded-2xl space-y-3 animate-pulse"
                  >
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-900 rounded w-full" />
                    <div className="h-3 bg-zinc-900 rounded w-1/2" />
                    <div className="h-8 bg-zinc-900 rounded-xl w-full mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {reposError && (
              <div className="p-4 rounded-2xl bg-[#1f1315] border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{reposError}</span>
                </div>
                <button
                  onClick={() => fetchRepositories(session.githubUsername!)}
                  className="clay-pill-tag px-3 py-1 rounded-lg text-white text-xs font-mono cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingRepos && !reposError && filteredRepos.length === 0 && (
              <div className="text-center py-16 clay-container-deep rounded-3xl p-8 space-y-3">
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
                    className="clay-pill-tag px-3.5 py-1.5 rounded-full text-xs text-zinc-300 hover:text-white font-mono cursor-pointer"
                  >
                    Clear Filters
                  </button>
                ) : null}
              </div>
            )}

            {/* Repositories Card Grid */}
            {!isLoadingRepos && filteredRepos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="clay-card-raised p-6 rounded-2xl flex flex-col justify-between group relative"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors truncate">
                          {repo.name}
                        </h3>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-[#0e1116] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0 shadow-inner"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                        {repo.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 space-y-3.5">
                      {/* Meta badges: Language, Stars, Forks */}
                      <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 border-t border-white/5 pt-3">
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
                          <Star className="w-3.5 h-3.5 text-zinc-400" />
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
                        className="clay-button-white w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
                        <span>Analyze Architecture</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Tactile Obsidian Footer */}
      <footer className="border-t border-white/5 bg-[#0a0c10] px-6 py-5 text-center text-xs text-zinc-500 font-mono">
        © 2026 CODECARTOFY • PERSONALIZED DEVELOPER DASHBOARD
      </footer>

      {/* CONNECT GITHUB MODAL IN TACTILE CLAYMORPHISM */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="clay-container-deep rounded-3xl w-full max-w-md p-7 space-y-5 relative border border-white/10 shadow-2xl">
            <button
              onClick={() => {
                setIsConnectModalOpen(false);
                setVerifiedProfile(null);
                setGithubError(null);
              }}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg clay-pill-tag transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-inner mb-2">
                <GitHubIcon className="w-5 h-5 text-zinc-200" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Connect Public GitHub Profile
              </h2>
              <p className="text-xs text-zinc-400">
                Enter your GitHub handle to automatically discover and list your public repositories.
              </p>
            </div>

            {githubError && (
              <div className="p-3.5 rounded-xl bg-[#1f1315] border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{githubError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyGithub} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  GITHUB USERNAME OR URL
                </label>
                <div className="relative">
                  <GitHubIcon className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
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
                    className="clay-recessed-input w-full text-xs text-white rounded-xl pl-10 pr-22 py-2.5 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingGithub || !githubInput.trim()}
                    className="clay-pill-tag absolute right-1.5 top-1.5 px-3 py-1.5 text-[10px] font-bold text-zinc-200 rounded-lg uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
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
                <div className="clay-card-raised p-4 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <img
                      src={verifiedProfile.avatarUrl}
                      alt={verifiedProfile.login}
                      className="w-10 h-10 rounded-full border border-white/10 object-cover"
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
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setVerifiedProfile(null);
                    setGithubError(null);
                  }}
                  className="clay-pill-tag flex-1 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmConnect}
                  disabled={!verifiedProfile || isConnectingGithub}
                  className="clay-button-white flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
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

      {/* Review Modal for Issues and Plans directly from Dashboard */}
      {selectedReviewFix && (
        <SpofFixModal
          key={`dashboard_review_${selectedReviewFix.id}`}
          isOpen={Boolean(selectedReviewFix)}
          onClose={() => setSelectedReviewFix(null)}
          spofNode={{
            nodeId: selectedReviewFix.targetFile,
            label: selectedReviewFix.title,
            reason: selectedReviewFix.summary,
            dependentCount: 1,
            type: "module",
            riskLevel:
              selectedReviewFix.riskLevel === "Low"
                ? "Medium"
                : selectedReviewFix.riskLevel,
          }}
          dependentNodes={[selectedReviewFix.targetFile]}
          currentFiles={[]}
          repoName={selectedReviewFix.repoName}
          githubUrl={""}
          repoId={selectedReviewFix.repoId || selectedReviewFix.repoName}
          initialFixRecord={selectedReviewFix}
          onPlanCreated={(record) => setSelectedReviewFix(record)}
        />
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
