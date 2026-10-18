"use client";

import React from "react";
import { GraphData } from "@/lib/types";
import { X, Image as ImageIcon, FileText, Download } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  repoName: string;
}

export function ExportModal({ isOpen, onClose, graphData, repoName }: ExportModalProps) {
  if (!isOpen) return null;

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(graphData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture-graph.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `${repoName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-architecture-diagram.png`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
      <div className="clay-container-deep w-full max-w-md rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#1c222e] border border-white/10 flex items-center justify-center text-zinc-200 shadow-inner">
            <Download className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Export Artifacts</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Download high-res diagrams and JSON audit report</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleExportPNG}
            className="clay-card-raised w-full p-4 rounded-2xl flex items-center justify-between text-left group transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c222e] border border-white/5 text-zinc-200 flex items-center justify-center shadow-inner">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-white">High-Res PNG Image</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Snapshot 2D interactive graph view</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="clay-card-raised w-full p-4 rounded-2xl flex items-center justify-between text-left group transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c222e] border border-white/5 text-zinc-200 flex items-center justify-center shadow-inner">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-white">JSON Architecture Report</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Nodes, links & cycles audit payload</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl clay-pill-tag flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        <div className="pt-2 border-t border-white/5 text-center text-[11px] text-zinc-500 font-mono">
          Target payload: <span className="text-zinc-400">{repoName}</span>
        </div>
      </div>
    </div>
  );
}
