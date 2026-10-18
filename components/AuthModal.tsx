"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import {
  registerWithSupabase,
  loginWithSupabase,
  checkUsernameAvailability,
} from "@/lib/supabase";
import { loginWithVlyxirDatabase } from "@/lib/vlyxirSupabase";
import {
  X,
  Lock,
  Mail,
  User,
  Globe,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";

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

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectOnSuccess?: string;
}

export function AuthModal({ isOpen, onClose, onSuccess, redirectOnSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");

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

  // Vlyxir modal inside auth
  const [showVlyxirModal, setShowVlyxirModal] = useState(false);
  const [vlyxirInput, setVlyxirInput] = useState("");
  const [vlyxirPassword, setVlyxirPassword] = useState("");
  const [showVlyxirPassword, setShowVlyxirPassword] = useState(false);

  if (!isOpen) return null;

  const isUsernameValid = (val: string) => /^[a-zA-Z0-9_-]+$/.test(val);

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

  const finishAuth = () => {
    onClose();
    if (onSuccess) onSuccess();
    if (redirectOnSuccess) {
      window.location.href = redirectOnSuccess;
    } else {
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === "signup") {
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

      await loginUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        username: res.user.username,
        country: res.user.country,
      });

      setLoading(false);
      finishAuth();
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
      finishAuth();
    }
  };

  // Vlyxir database lookup
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
    finishAuth();
  };

  // Guest Bypass
  const handleGuestAuth = async () => {
    setLoading(true);
    await loginUser("guest@cartofy.io", "Guest Developer", true);
    setLoading(false);
    finishAuth();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn font-sans">
      <div className="clay-container-deep border border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-center pt-1 pr-6">
          
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {mode === "signup" ? "Create New Account" : "Sign In to CodeCartofy"}
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {mode === "signup"
              ? "Register a unique developer handle and password to unlock persistent repositories."
              : "Sign in to access interactive AST graph dependency maps and copilot audits."}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="clay-recessed-input p-1 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
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
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              mode === "signup"
                ? "clay-button-white text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="clay-card-raised border border-red-500/30 bg-[#1f1315] p-3.5 rounded-2xl text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans">
          {/* SIGNUP FIELDS */}
          {mode === "signup" && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Developer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Username with Check Availability */}
              <div className="space-y-1">
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

              {/* Email & Country Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                    EMAIL
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="dev@cartofy.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-1">
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

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
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

              {/* Password strength meter */}
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

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
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
              <div className="space-y-1">
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

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
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

          {/* SUBMIT BUTTON */}
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
        <div className="pt-1">
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

        {/* VLYXIR DATABASE CONNECT SUB-MODAL */}
        {showVlyxirModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
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
    </div>
  );
}
