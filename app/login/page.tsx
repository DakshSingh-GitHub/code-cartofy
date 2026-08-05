"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/auth";
import {
  registerWithSupabase,
  loginWithSupabase,
  checkUsernameAvailability,
  isSupabaseConfigured,
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
  const redirectPath = searchParams.get("redirect") || "/cartofy";

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
    if (score <= 4) return { label: "MEDIUM", score: 3, color: "bg-indigo-500" };
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
      router.push(redirectPath);
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
      router.push(redirectPath);
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
    router.push(redirectPath);
  };

  // Guest Bypass
  const handleGuestAuth = async () => {
    setLoading(true);
    await loginUser("guest@cartofy.io", "Guest Developer", true);
    setLoading(false);
    router.push(redirectPath);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col justify-between selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-black/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <GitFork className="w-4 h-4 transform rotate-90" />
            </div>
            <span className="font-semibold text-base tracking-tight text-white">
              CodeCartofy
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            ← Return to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Notice Alert if redirected */}
          {notice && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <Shield className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{notice}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Auth Card */}
          <div className="bg-zinc-950/80 border border-zinc-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
            {/* Subtle Ambient Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header Row: Badge & Home */}
            <div className="flex items-center justify-between relative z-10">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-semibold text-zinc-400 uppercase">
                <span>{mode === "signup" ? "» JOIN US!" : "» WELCOME BACK!"}</span>
              </div>

              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                <Home className="w-3.5 h-3.5" />
                <span>HOME</span>
              </Link>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5 relative z-10">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {mode === "signup" ? "Register" : "Sign In"}
              </h1>
              <p className="text-xs text-zinc-400">
                {mode === "signup"
                  ? "Create a unique username and confirm your email to activate your account."
                  : "Sign in to access interactive AST graph dependency maps."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800/80 relative z-10">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === "login"
                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === "signup"
                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* SIGNUP FIELDS */}
              {mode === "signup" && (
                <>
                  {/* FULL NAME */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      FULL NAME
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-zinc-600"
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
                        a-z, 0-9, _ and - only
                      </span>
                    </div>

                    <div className="relative flex items-center">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="yourusername"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameStatus(null);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-20 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCheckUsername}
                        disabled={checkingUsername || !username.trim()}
                        className="absolute right-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 disabled:opacity-50 text-[10px] font-bold text-zinc-200 rounded uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
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
                        <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                        />
                      </div>
                    </div>

                    {/* COUNTRY */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                        COUNTRY
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500 pointer-events-none" />
                        <select
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all appearance-none cursor-pointer text-zinc-300"
                        >
                          <option value="" disabled className="bg-zinc-950 text-zinc-500">
                            Select your country
                          </option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c} className="bg-zinc-950 text-white">
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
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-9 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* PASSWORD STRENGTH METER */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-semibold tracking-wider text-zinc-400 uppercase">
                        PASSWORD STRENGTH
                      </span>
                      <span className="font-semibold text-zinc-300">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-1 border border-zinc-800/80">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color : "bg-transparent"
                        }`}
                        style={{ width: "25%" }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
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
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
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
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        placeholder="you@example.com or username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-9 py-2 focus:outline-none transition-all placeholder:text-zinc-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "signup" ? "Create account" : "Sign In & Proceed"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="relative flex py-1 items-center z-10">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-zinc-500">
                Or continue with
              </span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            {/* VLYXIR DATABASE CONNECT BUTTON */}
            <button
              type="button"
              onClick={() => handleVlyxirAuth()}
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer relative z-10 shadow-sm group"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-zinc-700 p-0.5 bg-zinc-950 flex items-center justify-center">
                <img
                  src="/vlyxir/favicon.png"
                  alt="Vlyxir Logo"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="font-semibold text-zinc-100 group-hover:text-white">
                Continue with Vlyxir
              </span>
            </button>

            {/* TAB SWITCH FOOTER LINK */}
            <div className="text-center pt-1 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setErrorMessage(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 font-medium group cursor-pointer"
              >
                <span>
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}
                </span>
                <span className="text-zinc-200 underline underline-offset-4 group-hover:text-white transition-colors">
                  {mode === "signup" ? "Sign In →" : "Register →"}
                </span>
              </button>
            </div>

            {/* GUEST ACCESS */}
            <div className="relative z-10 pt-2 space-y-2">
              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={loading}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 hover:text-white cursor-pointer"
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
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-4 text-center text-xs text-zinc-500 font-mono">
        © 2026 CODECARTOFY
      </footer>

      {/* VLYXIR DATABASE CONNECT MODAL */}
      {showVlyxirModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-700 p-0.5 bg-zinc-900 flex items-center justify-center">
                <img src="/vlyxir/favicon.png" alt="Vlyxir" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Continue with Vlyxir DB</h3>
                <p className="text-[11px] text-zinc-400">Database-to-database user profile lookup</p>
              </div>
            </div>

            {/* EMAIL OR USERNAME INPUT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                Vlyxir Email or Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="e.g. daksh_dtlz_564 or user@vlyxir.io"
                  value={vlyxirInput}
                  onChange={(e) => setVlyxirInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-8 pr-3 py-2 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* VLYXIR PASSWORD INPUT */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                Vlyxir Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
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
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-8 pr-8 py-2 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowVlyxirPassword(!showVlyxirPassword)}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showVlyxirPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVlyxirModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVlyxirAuth(vlyxirInput, vlyxirPassword)}
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
        <div className="h-screen w-screen bg-black flex items-center justify-center text-zinc-400 text-xs font-mono">
          Loading auth form...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
