export type NodeType = "route" | "component" | "utility" | "module";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  size: number;
  inDegree: number;
  outDegree: number;
  lineCount: number;
  code?: string;
  isCircular?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  importSymbols?: string[];
  isCircular?: boolean;
}

export interface GraphStats {
  totalFiles: number;
  totalDependencies: number;
  circularLoopCount: number;
  routeCount: number;
  componentCount: number;
  utilityCount: number;
  moduleCount: number;
  maxFanInFile: string | null;
  maxFanInCount: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  circularLoops: string[][];
  parseTimeMs: number;
  stats: GraphStats;
}

export interface FileInput {
  path: string;
  code: string;
}

export interface SinglePointOfFailure {
  nodeId: string;
  label: string;
  dependentCount: number;
  type: NodeType;
  riskLevel: "High" | "Critical" | "Medium";
  reason: string;
}

export interface CopilotReport {
  healthScore: number;
  couplingScore: number;
  modularityScore: number;
  singlePointsOfFailure: SinglePointOfFailure[];
  circularWarnings: { cycle: string[]; impact: string }[];
  recommendations: { title: string; category: string; description: string; priority: "High" | "Medium" | "Low" }[];
}

export interface RepoSample {
  id: string;
  name: string;
  description: string;
  category: string;
  files: FileInput[];
}
