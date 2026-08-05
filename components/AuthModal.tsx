"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import { X, Lock, Mail, User, KeyRound, ArrowRight, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectOnSuccess?: string;
}

export function AuthModal({ isOpen, onClose, onSuccess, redirectOnSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    await loginUser(email, name || undefined);
    setLoading(false);

    onClose();
    if (onSuccess) onSuccess();
    if (redirectOnSuccess) {
      router.push(redirectOnSuccess);
    } else {
      router.refresh();
    }
  };

  const handleGuestAuth = async () => {
    setLoading(true);
    await loginUser("guest@cartofy.io", "Guest Developer", true);
    setLoading(false);

    onClose();
    if (onSuccess) onSuccess();
    if (redirectOnSuccess) {
      router.push(redirectOnSuccess);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Server-side Authenticated Access</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight pt-1">
            {mode === "login" ? "Sign In to CodeCartofy" : "Create New Account"}
          </h2>
          <p className="text-xs text-zinc-400">
            Unlock server-side locked AST visualization tools
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800/80">
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

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Alex Developer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="dev@cartofy.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-300">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md mt-2"
          >
            <span>{loading ? "Authenticating..." : mode === "login" ? "Login to Account" : "Create Account"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-zinc-800" />
          <span className="flex-shrink mx-2 text-[10px] uppercase font-mono text-zinc-500">OR</span>
          <div className="flex-grow border-t border-zinc-800" />
        </div>

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
  );
}
