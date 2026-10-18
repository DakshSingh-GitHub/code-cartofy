"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/auth";
import {
  registerWithSupabase,
  loginWithSupabase,
  checkUsernameAvailability,
} from "@/lib/supabase";
import { loginWithVlyxirDatabase } from "@/lib/vlyxirSupabase";
import {
  GitFork,
  Home,
  User,
  Mail,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";

// List of supported countries for dropdown
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("signup");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login single identifier field (email or username)
  const [loginIdentifier, setLoginIdentifier] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ available?: boolean; message?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Vlyxir database connection modal state
  const [showVlyxirModal, setShowVlyxirModal] = useState(false);
  const [vlyxirInput, setVlyxirInput] = useState("");
  const [vlyxirPassword, setVlyxirPassword] = useState("");
  const [showVlyxirPassword, setShowVlyxirPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("redirect")) {
      setNotice("Protected route. Please sign in or register to proceed.");
    }
  }, [searchParams]);

  // Username validation regex: a-z, 0-9, _ and -
  const isUsernameValid = (val: string) => /^[a-zA-Z0-9_-]+$/.test(val);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: "START TYPING", score: 0, color: "bg-zinc-800" };
    if (pass.length < 6) return { label: "WEAK", score: 1, color: "bg-red-500" };

    let score = 1;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { label: "WEAK", score: 2, color: "bg-amber-500" };
    if (score <= 4) return { label: "MEDIUM", score: 3, color: "bg-slate-400" };
    return { label: "STRONG", score: 4, color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  // Check username availability in Supabase
  const handleCheckUsername = async () => {
    if (!username.trim()) {
      setUsernameStatus({ available: false, message: "Enter a username first" });
      return;
    }
    if (!isUsernameValid(username)) {
      setUsernameStatus({ available: false, message: "Only letters, numbers, _ and - allowed" });
      return;
    }

    setCheckingUsername(true);
    setUsernameStatus(null);

    const res = await checkUsernameAvailability(username);
    setCheckingUsername(false);

    if (res.available) {
      setUsernameStatus({ available: true, message: "Username is available!" });
    } else {
      setUsernameStatus({ available: false, message: res.error || "Username is already taken" });
    }
  };

  // Handle Submit (Signup or Login)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === "signup") {
      // Validations
      if (!fullName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (!username.trim() || !isUsernameValid(username)) {
        setErrorMessage("Please enter a valid username (a-z, 0-9, _, -).");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }
      if (!country) {
        setErrorMessage("Please select your country.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      setLoading(true);
      const res = await registerWithSupabase({
        fullName,
        username,
        email,
        country,
        password,
      });

      if (!res.success || !res.user) {
        setLoading(false);
        setErrorMessage(res.error || "Registration failed. Please try again.");
        return;
      }

      // Sync session into cookie & app state
      await loginUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        username: res.user.username,
        country: res.user.country,
      });

      setLoading(false);
      window.location.href = redirectPath;
    } else {
      // Mode: Login
      if (!loginIdentifier.trim()) {
        setErrorMessage("Please enter your email or username.");
        return;
      }
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }

      setLoading(true);
      const res = await loginWithSupabase(loginIdentifier, password);

      if (!res.success || !res.user) {
        setLoading(false);
        setErrorMessage(res.error || "Invalid credentials. Please try again.");
        return;
      }

      await loginUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        username: res.user.username,
        country: res.user.country,
      });

      setLoading(false);
      window.location.href = redirectPath;
    }
  };

  // Vlyxir Database-to-Database Connection Auth with Password Verification
  const handleVlyxirAuth = async (overrideIdentifier?: string, overridePassword?: string) => {
    const targetPassword = overridePassword !== undefined ? overridePassword : vlyxirPassword || password;

    if (!overrideIdentifier) {
      if (loginIdentifier.trim()) setVlyxirInput(loginIdentifier.trim());
      else if (email.trim()) setVlyxirInput(email.trim());
      else if (username.trim()) setVlyxirInput(username.trim());

      if (password) setVlyxirPassword(password);

      setShowVlyxirModal(true);
      return;
    }

    const targetIdentifier = overrideIdentifier.trim();

    if (!targetIdentifier) {
      setErrorMessage("Please enter your Vlyxir email or username.");
      return;
    }

    if (!targetPassword || !targetPassword.trim()) {
      setErrorMessage("Please enter your Vlyxir password.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    const res = await loginWithVlyxirDatabase(targetIdentifier, targetPassword);

    if (!res.success || !res.profile) {
      setLoading(false);
      setErrorMessage(res.error || "Failed to authenticate with Vlyxir database.");
      return;
    }

    const p = res.profile;

    await loginUser({
      id: p.id || `vlyxir_${Date.now()}`,
      name: p.full_name || p.username || "Vlyxir User",
      email: p.email || `${p.username || "user"}@vlyxir.io`,
      username: p.username || targetIdentifier,
      country: p.country || "Global",
      avatarUrl: p.avatar_url || "/vlyxir/favicon.png",
      isVlyxir: true,
    });

    setLoading(false);
    setShowVlyxirModal(false);
    window.location.href = redirectPath;
  };

  // Guest Bypass
  const handleGuestAuth = async () => {
    setLoading(true);
    await loginUser("guest@cartofy.io", "Guest Developer", true);
    setLoading(false);
    window.location.href = redirectPath;
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans flex flex-col justify-between selection:bg-zinc-800 selection:text-white">
      {/* Floating Tactile Navigation Bar */}
      <header className="sticky top-0 z-30 pt-4 sm:pt-6 px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-5xl clay-nav-capsule rounded-3xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#1d222d] border border-white/5 flex items-center justify-center text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.4)]">
              <GitFork className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform rotate-90 text-zinc-200" />
            </div>
            <span className="font-semibold text-sm sm:text-base tracking-tight text-white">
              CodeCartofy
            </span>
          </Link>

          <Link
            href="/"
            className="clay-pill-tag rounded-xl sm:rounded-full px-3 sm:px-4 py-1.5 flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-all font-medium cursor-pointer"
          >
            <span>← Return to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-5">
          {/* Notice Alert if redirected */}
          {notice && (
            <div className="clay-card-raised border border-amber-500/30 bg-[#1a140f] p-4 rounded-2xl text-amber-300 text-xs flex items-center gap-2.5 shadow-lg animate-fadeIn">
              <Shield className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{notice}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="clay-card-raised border border-red-500/30 bg-[#1f1315] p-4 rounded-2xl text-red-300 text-xs flex items-center gap-2.5 shadow-lg animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main Tactile Auth Card */}
          <div className="clay-container-deep border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            {/* Card Header Row: Badge & Home */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full clay-pill-tag text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                <span>{mode === "signup" ? "» JOIN CODESPACE" : "» WELCOME BACK"}</span>
              </div>

              <Link
                href="/"
                className="clay-pill-tag px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono"
              >
                <Home className="w-3.5 h-3.5" />
                <span>HOME</span>
              </Link>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {mode === "signup" ? "Register" : "Sign In"}
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                {mode === "signup"
                  ? "Create your unique developer identity to map and analyze code architectures."
                  : "Sign in to access interactive AST graph dependency maps and copilot audits."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="clay-recessed-input p-1 rounded-2xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === "login"
                    ? "clay-button-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === "signup"
                    ? "clay-button-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SIGNUP FIELDS */}
              {mode === "signup" && (
                <>
                  {/* FULL NAME */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      FULL NAME
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* USERNAME WITH CHECK BUTTON */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                        USERNAME
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        a-z, 0-9, _ and -
                      </span>
                    </div>

                    <div className="relative flex items-center">
                      <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="yourusername"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameStatus(null);
                        }}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-20 py-2.5 focus:outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCheckUsername}
                        disabled={checkingUsername || !username.trim()}
                        className="absolute right-1.5 px-3 py-1 clay-pill-tag hover:bg-[#1a202c] disabled:opacity-50 text-[10px] font-mono font-bold text-zinc-200 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {checkingUsername ? (
                          <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
                        ) : (
                          "CHECK"
                        )}
                      </button>
                    </div>

                    {/* Username availability status message */}
                    {usernameStatus && (
                      <div
                        className={`text-[11px] font-mono flex items-center gap-1.5 pt-0.5 ${
                          usernameStatus.available ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {usernameStatus.available ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{usernameStatus.message}</span>
                      </div>
                    )}
                  </div>

                  {/* EMAIL & COUNTRY GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* EMAIL */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                        EMAIL
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* COUNTRY */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                        COUNTRY
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3 top-3 text-zinc-500 pointer-events-none" />
                        <select
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="clay-recessed-input w-full text-xs text-zinc-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-[#0e1117] text-zinc-500">
                            Select country
                          </option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c} className="bg-[#0e1117] text-white">
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-9 py-2.5 focus:outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* PASSWORD STRENGTH METER */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold tracking-wider text-zinc-400 uppercase">
                        PASSWORD STRENGTH
                      </span>
                      <span className="font-semibold text-zinc-300">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full clay-recessed-input rounded-full overflow-hidden flex gap-1 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= 4 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                    </div>
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* LOGIN FIELDS */}
              {mode === "login" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      EMAIL OR USERNAME
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="you@example.com or username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-9 py-2.5 focus:outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* PRIMARY SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="clay-button-white w-full py-3 rounded-xl text-xs font-bold text-zinc-950 flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "signup" ? "Create Account" : "Sign In & Proceed"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/5" />
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-zinc-500">
                Or continue with
              </span>
              <div className="flex-grow border-t border-white/5" />
            </div>

            {/* VLYXIR DATABASE CONNECT BUTTON */}
            <button
              type="button"
              onClick={() => handleVlyxirAuth()}
              disabled={loading}
              className="clay-card-raised hover:border-white/15 w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-100 flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm group"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-white/10 p-0.5 bg-[#0e1117] flex items-center justify-center">
                <img
                  src="/vlyxir/favicon.png"
                  alt="Vlyxir Logo"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="font-semibold text-zinc-200 group-hover:text-white">
                Continue with Vlyxir
              </span>
            </button>

            {/* TAB SWITCH FOOTER LINK */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setErrorMessage(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}
                </span>
                <span className="text-zinc-200 underline underline-offset-4 hover:text-white">
                  {mode === "signup" ? "Sign In →" : "Register →"}
                </span>
              </button>
            </div>

            {/* GUEST ACCESS */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={loading}
                className="clay-pill-tag hover:bg-[#1a202c] text-zinc-300 hover:text-white w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Try Without Account (Guest Mode)</span>
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted Cookie Session • AST Privacy Preserved</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0a0c10] px-6 py-4 text-center text-xs text-zinc-500 font-mono">
        © 2026 CODECARTOFY • Architecture Intelligence
      </footer>

      {/* VLYXIR DATABASE CONNECT MODAL */}
      {showVlyxirModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="clay-container-deep border border-white/10 rounded-3xl p-6 sm:p-7 w-full max-w-sm space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#1c222e] border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-inner">
                <img src="/vlyxir/favicon.png" alt="Vlyxir" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Continue with Vlyxir DB</h3>
                <p className="text-[11px] text-zinc-400">Database-to-database user profile lookup</p>
              </div>
            </div>

            {/* EMAIL OR USERNAME INPUT */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase font-sans">
                Vlyxir Email or Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  placeholder="e.g. daksh_dtlz_564 or user@vlyxir.io"
                  value={vlyxirInput}
                  onChange={(e) => setVlyxirInput(e.target.value)}
                  className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* VLYXIR PASSWORD INPUT */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase font-sans">
                Vlyxir Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                <input
                  type={showVlyxirPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={vlyxirPassword}
                  onChange={(e) => setVlyxirPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVlyxirAuth(vlyxirInput, vlyxirPassword);
                    }
                  }}
                  className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-9 py-2.5 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowVlyxirPassword(!showVlyxirPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showVlyxirPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowVlyxirModal(false)}
                className="clay-pill-tag px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVlyxirAuth(vlyxirInput, vlyxirPassword)}
                disabled={loading}
                className="clay-button-white px-4 py-1.5 text-xs font-bold text-zinc-950 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-[#0c0e12] flex items-center justify-center text-zinc-400 text-xs font-mono">
          Loading auth form...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
