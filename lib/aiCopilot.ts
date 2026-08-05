import { CopilotReport, GraphData, SinglePointOfFailure } from "./types";

export function generateArchitecturalCopilotReport(graphData: GraphData): CopilotReport {
  const { nodes, links, circularLoops, stats } = graphData;

  if (nodes.length === 0) {
    return {
      healthScore: 100,
      couplingScore: 0,
      modularityScore: 100,
      singlePointsOfFailure: [],
      circularWarnings: [],
      recommendations: [],
    };
  }

  // 1. Single Points of Failure (High Fan-In Nodes)
  const singlePointsOfFailure: SinglePointOfFailure[] = [];
  const SPOF_THRESHOLD = Math.max(2, Math.floor(nodes.length * 0.25));

  nodes.forEach((node) => {
    if (node.inDegree >= SPOF_THRESHOLD && node.type !== "route") {
      let riskLevel: "Critical" | "High" | "Medium" = "Medium";
      if (node.inDegree >= SPOF_THRESHOLD * 2 || node.inDegree >= 6) {
        riskLevel = "Critical";
      } else if (node.inDegree >= SPOF_THRESHOLD * 1.3) {
        riskLevel = "High";
      }

      singlePointsOfFailure.push({
        nodeId: node.id,
        label: node.label,
        dependentCount: node.inDegree,
        type: node.type,
        riskLevel,
        reason: `Imported by ${node.inDegree} separate modules. Modifications here risk breaking downstream dependent components.`,
      });
    }
  });

  // Sort SPOF by risk level and dependent count
  singlePointsOfFailure.sort((a, b) => b.dependentCount - a.dependentCount);

  // 2. Circular Warnings
  const circularWarnings = circularLoops.map((loop) => {
    const cycleNames = loop.map((path) => path.split("/").pop() || path);
    return {
      cycle: cycleNames,
      impact: `Tightly couples ${cycleNames.length - 1} modules into an inseparable execution cycle.`,
    };
  });

  // 3. Scores Calculation
  const totalNodes = nodes.length;
  const totalLinks = links.length;
  
  // Average degree coupling
  const avgDegree = totalLinks / (totalNodes || 1);
  const couplingScore = Math.min(100, Math.round(avgDegree * 25));

  // Modularity score penalty based on SPOF & circular loops
  const spofPenalty = singlePointsOfFailure.length * 12;
  const circularPenalty = circularLoops.length * 20;
  const modularityScore = Math.max(10, Math.min(100, Math.round(100 - (spofPenalty + circularPenalty) / 2)));

  // Overall Health Score
  const healthScore = Math.max(5, Math.round((modularityScore * 0.6) + ((100 - couplingScore) * 0.4)));

  // 4. Actionable Recommendations
  const recommendations: CopilotReport["recommendations"] = [];

  if (circularLoops.length > 0) {
    recommendations.push({
      title: "Break Circular Imports via Dependency Inversion",
      category: "Architecture & Cycles",
      description: `Detected ${circularLoops.length} circular loop(s). Extract shared interfaces or state hooks into decoupled utility files to break recursion stacks.`,
      priority: "High",
    });
  }

  if (singlePointsOfFailure.length > 0) {
    const topSpof = singlePointsOfFailure[0];
    recommendations.push({
      title: `Decouple 'God Module' [${topSpof.label}]`,
      category: "Single Point of Failure",
      description: `'${topSpof.label}' is depended on by ${topSpof.dependentCount} files. Consider splitting it into smaller atomic modules or facade patterns.`,
      priority: "High",
    });
  }

  if (stats.utilityCount === 0 && totalNodes > 5) {
    recommendations.push({
      title: "Introduce Shared Utility Layer",
      category: "Layering",
      description: "No dedicated utility helper modules were detected. Move duplicated business logic into pure functional helper utilities.",
      priority: "Medium",
    });
  }

  if (avgDegree > 2.5) {
    recommendations.push({
      title: "Reduce High Inter-Module Coupling",
      category: "Coupling",
      description: `Average file dependency density is high (${avgDegree.toFixed(1)} imports/file). Use event bus patterns or dependency injection to lower coupling.`,
      priority: "Medium",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Maintain Clean Modular Boundaries",
      category: "Best Practice",
      description: "Codebase exhibits excellent isolation, low coupling, and zero circular import cycles.",
      priority: "Low",
    });
  }

  return {
    healthScore,
    couplingScore,
    modularityScore,
    singlePointsOfFailure,
    circularWarnings,
    recommendations,
  };
}
