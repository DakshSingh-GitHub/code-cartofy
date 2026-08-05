"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode } from "@/lib/types";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
} from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

interface GraphCanvasProps {
  graphData: GraphData;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  searchQuery: string;
  showCyclesOnly: boolean;
  spotlightCycleNodes: string[] | null;
}

export function GraphCanvas({
  graphData,
  selectedNode,
  onSelectNode,
  searchQuery,
  showCyclesOnly,
  spotlightCycleNodes,
}: GraphCanvasProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isPhysicsEngineActive, setIsPhysicsEngineActive] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const filteredData = React.useMemo(() => {
    let nodes = [...graphData.nodes];
    let links = [...graphData.links];

    if (showCyclesOnly) {
      nodes = nodes.filter((n) => n.isCircular);
      const circularNodeIds = new Set(nodes.map((n) => n.id));
      links = links.filter((l) => {
        const srcId = typeof l.source === "string" ? l.source : (l.source as any).id;
        const tgtId = typeof l.target === "string" ? l.target : (l.target as any).id;
        return circularNodeIds.has(srcId) && circularNodeIds.has(tgtId);
      });
    }

    if (spotlightCycleNodes && spotlightCycleNodes.length > 0) {
      const spotlightSet = new Set(spotlightCycleNodes);
      nodes = nodes.filter((n) => spotlightSet.has(n.id));
      links = links.filter((l) => {
        const srcId = typeof l.source === "string" ? l.source : (l.source as any).id;
        const tgtId = typeof l.target === "string" ? l.target : (l.target as any).id;
        return spotlightSet.has(srcId) && spotlightSet.has(tgtId);
      });
    }

    return { nodes, links };
  }, [graphData, showCyclesOnly, spotlightCycleNodes]);

  const connectedNodeIds = React.useMemo(() => {
    const set = new Set<string>();
    if (!selectedNode) return set;
    set.add(selectedNode.id);

    filteredData.links.forEach((link) => {
      const srcId = typeof link.source === "string" ? link.source : (link.source as any).id;
      const tgtId = typeof link.target === "string" ? link.target : (link.target as any).id;

      if (srcId === selectedNode.id) set.add(tgtId);
      if (tgtId === selectedNode.id) set.add(srcId);
    });

    return set;
  }, [selectedNode, filteredData.links]);

  const handleZoomIn = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 400);
  };

  const handleZoomOut = () => {
    if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() / 1.3, 400);
  };

  const handleResetZoom = () => {
    if (fgRef.current) fgRef.current.zoomToFit(400, 50);
  };

  const togglePhysics = () => {
    setIsPhysicsEngineActive((prev) => {
      if (fgRef.current) {
        if (prev) fgRef.current.pauseAnimation();
        else fgRef.current.resumeAnimation();
      }
      return !prev;
    });
  };

  useEffect(() => {
    if (searchQuery.trim() !== "" && fgRef.current) {
      const matched = filteredData.nodes.find(
        (n) =>
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matched && matched.x !== undefined && matched.y !== undefined) {
        onSelectNode(matched);
        fgRef.current.centerAt(matched.x, matched.y, 600);
        fgRef.current.zoom(2.5, 600);
      }
    }
  }, [searchQuery, filteredData.nodes, onSelectNode]);

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isConnected = connectedNodeIds.has(node.id);
      const isSearchMatch =
        searchQuery &&
        (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.id.toLowerCase().includes(searchQuery.toLowerCase()));

      const radius = Math.max(4, node.size || 5);

      let fillColor = "#6366f1";
      if (node.type === "route") fillColor = "#f43f5e";
      else if (node.type === "utility") fillColor = "#10b981";
      else if (node.type === "module") fillColor = "#f59e0b";

      const isDimmed = selectedNode && !isConnected && !isSearchMatch;

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.15 : 1;

      if (isSelected || isSearchMatch) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5 / globalScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = "rgba(250, 250, 250, 0.2)";
        ctx.fill();
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      } else if (node.isCircular) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.fill();
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = "#ef4444";
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.lineWidth = 1 / globalScale;
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
      ctx.stroke();

      if (globalScale > 0.8 || isSelected || isHovered || isSearchMatch) {
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `${isSelected ? "bold" : "normal"} ${fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const textY = node.y + radius + 4 / globalScale;
        const text = node.label;

        const textWidth = ctx.measureText(text).width;
        const padX = 4 / globalScale;
        const padY = 2 / globalScale;

        ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
        ctx.fillRect(
          node.x - textWidth / 2 - padX,
          textY - padY,
          textWidth + padX * 2,
          fontSize + padY * 2
        );

        ctx.fillStyle = isSelected ? "#ffffff" : node.isCircular ? "#fca5a5" : "#e4e4e7";
        ctx.fillText(text, node.x, textY);
      }

      ctx.restore();
    },
    [selectedNode, hoveredNode, connectedNodeIds, searchQuery]
  );

  const getLinkColor = useCallback(
    (link: any) => {
      if (link.isCircular) return "rgba(239, 68, 68, 0.8)";

      const srcId = typeof link.source === "string" ? link.source : link.source.id;
      const tgtId = typeof link.target === "string" ? link.target : link.target.id;

      if (selectedNode) {
        if (srcId === selectedNode.id || tgtId === selectedNode.id) {
          return "rgba(250, 250, 250, 0.8)";
        }
        return "rgba(255, 255, 255, 0.03)";
      }

      return "rgba(113, 113, 122, 0.25)";
    },
    [selectedNode]
  );

  return (
    <div ref={containerRef} className="force-canvas-container relative overflow-hidden select-none bg-black">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        nodeVal={(node: any) => node.size || 5}
        nodeCanvasObject={drawNode}
        onNodeClick={(node: any) => {
          onSelectNode(node);
          if (fgRef.current && node.x !== undefined && node.y !== undefined) {
            fgRef.current.centerAt(node.x, node.y, 400);
          }
        }}
        onNodeHover={(node: any) => setHoveredNode(node)}
        onBackgroundClick={() => onSelectNode(null)}
        linkColor={getLinkColor}
        linkWidth={(link: any) => {
          if (link.isCircular) return 2;
          const srcId = typeof link.source === "string" ? link.source : link.source.id;
          const tgtId = typeof link.target === "string" ? link.target : link.target.id;
          if (selectedNode && (srcId === selectedNode.id || tgtId === selectedNode.id)) return 1.5;
          return 1;
        }}
        linkDirectionalParticles={(link: any) => {
          if (link.isCircular) return 3;
          const srcId = typeof link.source === "string" ? link.source : link.source.id;
          const tgtId = typeof link.target === "string" ? link.target : link.target.id;
          if (selectedNode && (srcId === selectedNode.id || tgtId === selectedNode.id)) return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleColor={(link: any) =>
          link.isCircular ? "#ef4444" : "#ffffff"
        }
        cooldownTicks={100}
        d3VelocityDecay={0.3}
      />

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-md p-1 shadow-lg z-20">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-all"
          title="Fit Graph"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-[1px] bg-zinc-800 my-auto" />

        <button
          onClick={togglePhysics}
          className={`p-1.5 rounded transition-all ${
            isPhysicsEngineActive
              ? "bg-zinc-800 text-zinc-100"
              : "hover:bg-zinc-900 text-zinc-500"
          }`}
          title={isPhysicsEngineActive ? "Pause Physics" : "Resume Physics"}
        >
          {isPhysicsEngineActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-4 left-5 hidden sm:flex items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-[11px] font-mono text-zinc-400 z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Component</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Utility</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Module</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Circular Cycle</span>
        </div>
      </div>
    </div>
  );
}
