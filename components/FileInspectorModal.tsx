"use client";

import React, { useState } from "react";
import { FileInput } from "@/lib/types";
import { X, Search, FileCode, Copy, Check, ChevronLeft } from "lucide-react";

interface FileInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileInput[];
  selectedFileId: string | null;
}

export function FileInspectorModal({
  isOpen,
  onClose,
  files,
  selectedFileId,
}: FileInspectorModalProps) {
  const [activeFilePath, setActiveFilePath] = useState<string>(selectedFileId || (files[0]?.path || ""));
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [prevSelectedFileId, setPrevSelectedFileId] = useState<string | null>(selectedFileId || null);
  const [mobileTab, setMobileTab] = useState<"list" | "code">("code");

  if (selectedFileId && selectedFileId !== prevSelectedFileId) {
    setPrevSelectedFileId(selectedFileId);
    setActiveFilePath(selectedFileId);
    setMobileTab("code");
  }

  if (!isOpen) return null;

  const filteredFiles = files.filter(
    (f) =>
      f.path.toLowerCase().includes(search.toLowerCase()) ||
      f.path.split("/").pop()?.toLowerCase().includes(search.toLowerCase())
  );

  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];

  const handleCopyCode = () => {
    if (activeFile?.code) {
      navigator.clipboard.writeText(activeFile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 animate-fadeIn font-sans">
      <div className="clay-container-deep w-full max-w-5xl h-[88vh] sm:h-[82vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Modal Top Header */}
        <div className="h-14 border-b border-white/5 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#0c0e12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1b212c] border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner">
              <FileCode className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Source Code Inspector</h3>
              <p className="text-[10px] sm:text-[11px] font-mono text-zinc-400">{files.length} parsed modules</p>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex md:hidden items-center gap-1 clay-recessed-input p-1 rounded-xl">
            <button
              onClick={() => setMobileTab("list")}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                mobileTab === "list"
                  ? "clay-button-white text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Files ({files.length})
            </button>
            <button
              onClick={() => setMobileTab("code")}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                mobileTab === "code"
                  ? "clay-button-white text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Code
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div
            className={`
              w-full md:w-72 lg:w-80 border-r border-white/5 bg-[#0e1117] flex flex-col shrink-0
              ${mobileTab === "list" ? "flex" : "hidden md:flex"}
            `}
          >
            {/* Search Input Box */}
            <div className="p-3 border-b border-white/5 bg-[#0c0e12]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter codebase files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="clay-recessed-input w-full text-xs text-white placeholder-zinc-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Scrollable File List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredFiles.map((file) => {
                const isSelected = activeFilePath === file.path;
                const fileName = file.path.split("/").pop();
                const folderPath = file.path.split("/").slice(0, -1).join("/");

                return (
                  <button
                    key={file.path}
                    onClick={() => {
                      setActiveFilePath(file.path);
                      setMobileTab("code");
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between truncate cursor-pointer ${
                      isSelected
                        ? "clay-card-raised text-white border-white/15 shadow-sm"
                        : "text-zinc-400 hover:bg-[#151922] hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <div className="truncate min-w-0 pr-2">
                      <p className={`truncate text-xs ${isSelected ? "font-bold text-white" : "font-medium text-zinc-300"}`}>
                        {fileName}
                      </p>
                      {folderPath && (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                          {folderPath}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded clay-recessed-input text-zinc-500 shrink-0">
                      {fileName?.split(".").pop()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div
            className={`
              flex-1 flex flex-col bg-[#080a0e]
              ${mobileTab === "code" ? "flex" : "hidden md:flex"}
            `}
          >
            {activeFile ? (
              <>
                {/* Active File Bar */}
                <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-[#0e1117] text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    <button
                      onClick={() => setMobileTab("list")}
                      className="md:hidden p-1 rounded clay-pill-tag text-zinc-400 hover:text-white mr-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="truncate text-zinc-200 font-semibold">{activeFile.path}</span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="clay-pill-tag flex items-center gap-1.5 text-[11px] text-zinc-200 hover:text-white px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Raw Code Scroller */}
                <div className="flex-1 overflow-auto p-4 sm:p-5 font-mono text-xs text-zinc-300 leading-relaxed bg-[#080a0e]">
                  <pre className="text-zinc-200 font-mono text-xs">{activeFile.code}</pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-mono p-4 text-center">
                Select a file to inspect AST source code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
