"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getClientSession,
  logoutUser,
  updateUserSession,
  UserSession,
} from "@/lib/auth";
import { updateUserProfileInBackend } from "@/lib/supabase";
import {
  GitFork,
  ArrowRight,
  User,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  BadgeCheck,
} from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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

const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Japan",
  "Australia",
  "Brazil",
  "Singapore",
  "Netherlands",
  "Sweden",
  "Spain",
  "Italy",
  "Other / Global",
];

const PRESET_AVATARS = [
  { name: "Cartofy Icon", url: "/vlyxir/favicon.png" },
  { name: "Cyber Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot" },
  { name: "Pixel Dev", url: "https://api.dicebear.com/7.x/bottts/svg?seed=PixelDev" },
  { name: "Matrix Neo", url: "https://api.dicebear.com/7.x/bottts/svg?seed=MatrixNeo" },
  { name: "Code Craft", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CodeCraft" },
];

export default function MyAccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(() => getClientSession());
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states initialized lazily
  const [name, setName] = useState(() => getClientSession()?.name || "");
  const [username, setUsername] = useState(() => {
    const s = getClientSession();
    return s?.username || (s?.email ? s.email.split("@")[0] : "developer");
  });
  const [email, setEmail] = useState(() => getClientSession()?.email || "");
  const [country, setCountry] = useState(() => getClientSession()?.country || "United States");
  const [bio, setBio] = useState(() => getClientSession()?.bio || "");
  const [githubUsername, setGithubUsername] = useState(() => getClientSession()?.githubUsername || "");
  const [avatarUrl, setAvatarUrl] = useState(() => getClientSession()?.avatarUrl || "/vlyxir/favicon.png");

  useEffect(() => {
    const current = getClientSession();
    if (!current) {
      router.push("/login?redirect=/my-acc");
      return;
    }

    const handleSessionChange = () => {
      const updated = getClientSession();
      if (updated) {
        setSession(updated);
      }
    };

    window.addEventListener("cartofy_session_change", handleSessionChange);
    return () => window.removeEventListener("cartofy_session_change", handleSessionChange);
  }, [router]);

  const handleReset = () => {
    if (!session) return;
    setName(session.name || "");
    setUsername(session.username || (session.email ? session.email.split("@")[0] : "developer"));
    setEmail(session.email || "");
    setCountry(session.country || "United States");
    setBio(session.bio || "");
    setGithubUsername(session.githubUsername || "");
    setAvatarUrl(session.avatarUrl || "/vlyxir/favicon.png");
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim();
    const cleanCountry = country.trim();
    const cleanBio = bio.trim();
    const cleanGithub = githubUsername.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "");

    if (!cleanName) {
      setErrorMessage("Please provide a name.");
      setSaving(false);
      return;
    }

    if (!cleanUsername || cleanUsername.length < 2) {
      setErrorMessage("Username must be at least 2 characters.");
      setSaving(false);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setErrorMessage("Username can only contain letters, numbers, hyphens, and underscores.");
      setSaving(false);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please provide a valid email address.");
      setSaving(false);
      return;
    }

    try {
      const updates = {
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        country: cleanCountry,
        bio: cleanBio,
        githubUsername: cleanGithub,
        avatarUrl: avatarUrl.trim() || "/vlyxir/favicon.png",
      };

      // 1. Update current user session in cookies & local state
      const updatedSession = await updateUserSession(updates);
      if (updatedSession) {
        setSession(updatedSession);
      }

      // 2. Synchronize to Supabase profiles or local mock registry
      if (session?.id) {
        await updateUserProfileInBackend(session.id, {
          fullName: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          country: cleanCountry,
          bio: cleanBio,
          avatarUrl: avatarUrl.trim() || "/vlyxir/favicon.png",
          githubUsername: cleanGithub,
        });
      }

      setSuccessMessage("Account information updated successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update account information.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0c0e12] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const isGuest = session?.isGuest || session?.email === "guest@cartofy.io";

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col justify-between">
      {/* Top Floating Navigation Capsule */}
      <header className="w-full pt-5 px-4 sm:px-6 z-30 sticky top-0">
        <div className="max-w-5xl mx-auto clay-nav-capsule rounded-full px-3.5 sm:px-5 py-2.5 flex items-center justify-between">
          {/* Left: Brand Icon & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.5)] group-hover:border-white/10 transition-all">
                <GitFork className="w-4 h-4 transform rotate-90 text-zinc-300" />
              </div>
              <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
                CodeCartofy
              </span>
            </Link>

            <span className="text-zinc-600 hidden sm:inline">/</span>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full clay-pill-tag text-zinc-300 text-xs font-medium">
              <User className="w-3 h-3 text-zinc-400" />
              <span>My Account</span>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="clay-pill-tag hover:bg-[#161a22] text-zinc-300 hover:text-white px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>

            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl bg-[#141720] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-white/10 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.4)] cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16 flex-1">
        {/* Navigation Breadcrumb back to Home / Dashboard */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/cartofy"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>Launch Cartofy Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Guest Warning Notice Banner */}
        {isGuest && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                You are currently signed in with a temporary guest session. Changes saved will persist for this browser session.
              </span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1 bg-amber-400 text-black font-semibold rounded-lg shrink-0 hover:bg-amber-300 transition-colors"
            >
              Register
            </Link>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Profile Card Preview & Status */}
          <div className="md:col-span-1 space-y-6">
            <div className="clay-card-raised p-6 rounded-3xl border border-white/5 bg-[#12161f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
              {/* Profile Avatar */}
              <div className="relative group mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-[#1c222e] flex items-center justify-center text-2xl font-bold text-sky-200 shadow-inner">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || "User Avatar"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/vlyxir/favicon.png";
                      }}
                    />
                  ) : (
                    <span>{name ? name[0].toUpperCase() : "U"}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#12161f] flex items-center justify-center" title="Active">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              <h2 className="text-base font-bold text-white tracking-tight">{name || "Developer"}</h2>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">@{username || "developer"}</p>

              {bio && (
                <p className="text-xs text-zinc-400 mt-3 line-clamp-3 italic font-sans leading-relaxed">
                  &ldquo;{bio}&rdquo;
                </p>
              )}

              <div className="w-full border-t border-white/5 my-4" />

              <div className="w-full space-y-2 text-left text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" /> Email
                  </span>
                  <span className="text-zinc-200 truncate max-w-[130px] font-mono">{email}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" /> Location
                  </span>
                  <span className="text-zinc-200 truncate">{country}</span>
                </div>

                {githubUsername && (
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <GitHubIcon className="w-3.5 h-3.5 text-zinc-500" /> GitHub
                    </span>
                    <a
                      href={`https://github.com/${githubUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span>{githubUsername}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="w-full mt-5 pt-4 border-t border-white/5 flex items-center justify-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-[#181d27] border border-white/5 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-emerald-400" />
                  <span>Developer Tier</span>
                </div>
              </div>
            </div>

            {/* Quick Avatar Presets */}
            <div className="clay-card-raised p-4 rounded-3xl border border-white/5 bg-[#12161f] shadow-sm">
              <label className="text-[11px] font-mono text-zinc-400 font-semibold block mb-2">
                Quick Avatar Presets
              </label>
              <div className="flex items-center justify-center gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      avatarUrl === preset.url
                        ? "border-sky-400 scale-105 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                        : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                    }`}
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full rounded-full object-cover bg-zinc-900"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Edit Information Form */}
          <div className="md:col-span-2">
            <div className="clay-card-raised p-6 sm:p-8 rounded-3xl border border-white/5 bg-[#12161f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.6)]">
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Account Details
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  View and update your CodeCartofy profile credentials and preferences.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Full Name & Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full clay-recessed-input pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <span className="text-xs font-mono">@</span>
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full clay-recessed-input pl-8 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address & Country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dev@cartofy.io"
                        className="w-full clay-recessed-input pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Country
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full clay-recessed-input pl-9 pr-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/20 appearance-none transition-all cursor-pointer bg-[#080a0e]"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c} className="bg-[#12161f] text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* GitHub Username & Custom Avatar URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      GitHub Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <GitHubIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="octocat"
                        className="w-full clay-recessed-input pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Avatar Image URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full clay-recessed-input pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all truncate"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio / Description */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Bio / Status
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a little bit about what you are engineering..."
                    className="w-full clay-recessed-input p-3 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none transition-all leading-relaxed"
                  />
                </div>

                {/* Metadata details row */}
                <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/5 text-[11px] text-zinc-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">Account ID:</span>
                    <span className="font-mono text-zinc-300 truncate max-w-[200px]">{session?.id || "usr_guest"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Role & Permissions:</span>
                    <span className="text-zinc-300">CodeCartofy Developer (Full Access)</span>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="clay-pill-tag px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Changes</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="clay-button-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 px-4 text-center text-xs text-zinc-500">
        <p>CodeCartofy &bull; Tactile Codebase Dependency Analysis</p>
      </footer>
    </div>
  );
}
