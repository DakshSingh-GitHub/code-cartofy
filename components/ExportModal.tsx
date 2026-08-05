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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 w-full max-w-md rounded-lg p-6 border border-zinc-800 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-900 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Export Artifacts</h3>
            <p className="text-xs text-zinc-400">Download high-res diagrams and JSON report</p>
          </div>
        </div>

        <div className="space-y-3 font-sans">
          <button
            onClick={handleExportPNG}
            className="w-full p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">High-Res PNG Image</h4>
                <p className="text-[11px] text-zinc-400">Snapshot 2D graph view</p>
              </div>
            </div>
            <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-all" />
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">JSON Architecture Report</h4>
                <p className="text-[11px] text-zinc-400">Nodes, links & cycles audit payload</p>
              </div>
            </div>
            <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-all" />
          </button>
        </div>

        <div className="pt-1 text-center text-[11px] text-zinc-500 font-mono">
          Generated for {repoName}
        </div>
      </div>
    </div>
  );
}
