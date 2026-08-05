"use client";

import React, { useState, useEffect } from "react";
import { FileInput } from "@/lib/types";
import { X, Search, FileCode, Copy, Check } from "lucide-react";

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
  const [activeFilePath, setActiveFilePath] = useState<string>("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedFileId) {
      setActiveFilePath(selectedFileId);
    } else if (files.length > 0) {
      setActiveFilePath(files[0].path);
    }
  }, [selectedFileId, files]);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-zinc-950 w-full max-w-5xl h-[80vh] rounded-lg border border-zinc-800 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-950">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <FileCode className="w-4 h-4 text-zinc-400" />
            <span>Parsed Codebase Files ({files.length})</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-72 border-r border-zinc-800 bg-zinc-950 flex flex-col">
            <div className="p-2.5 border-b border-zinc-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-zinc-700 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFilePath(file.path)}
                  className={`w-full text-left p-2 rounded text-xs font-mono transition-all flex items-center justify-between truncate ${
                    activeFilePath === file.path
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <span className="truncate">{file.path.split("/").pop()}</span>
                  <span className="text-[10px] text-zinc-600 truncate ml-2">
                    {file.path.split("/").slice(0, -1).join("/")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-black">
            {activeFile ? (
              <>
                <div className="h-9 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950 text-xs font-mono text-zinc-400">
                  <span>{activeFile.path}</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-0.5 rounded transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-200 leading-relaxed">
                  <pre>{activeFile.code}</pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs font-mono">
                Select a file to inspect AST source code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
