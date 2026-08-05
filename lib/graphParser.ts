import * as babelParser from "@babel/parser";
import { FileInput, GraphData, GraphLink, GraphNode, GraphStats, NodeType } from "./types";

export function parseRepositoryToGraph(files: FileInput[]): GraphData {
  const startTime = performance.now();
  const nodesMap = new Map<string, GraphNode>();
  const linksMap = new Map<string, GraphLink>();
  const adjacencyList = new Map<string, Set<string>>();
  const linkSymbolsMap = new Map<string, Set<string>>();

  // Normalize paths in file inputs
  const normalizedFiles = files.map((f) => ({
    ...f,
    path: normalizeFilePath(f.path),
  }));

  const allFilePaths = normalizedFiles.map((f) => f.path);

  // Step 1: Register files as nodes
  normalizedFiles.forEach((file) => {
    const isComponent = /\.(jsx|tsx)$/.test(file.path) || /[A-Z]/.test(file.path.split("/").pop() || "");
    const isRoute =
      file.path.includes("page.") ||
      file.path.includes("route.") ||
      file.path.startsWith("pages/") ||
      file.path.startsWith("app/") ||
      file.path.includes("routes/");
    const isModule =
      file.path.includes("config") ||
      file.path.includes("types") ||
      file.path.includes("constants") ||
      file.path.endsWith(".json");

    let type: NodeType = "utility";
    if (isRoute) type = "route";
    else if (isComponent) type = "component";
    else if (isModule) type = "module";

    const lines = file.code ? file.code.split("\n").length : 0;

    nodesMap.set(file.path, {
      id: file.path,
      label: getShortLabel(file.path),
      type,
      size: 5,
      inDegree: 0,
      outDegree: 0,
      lineCount: lines,
      code: file.code,
      isCircular: false,
    });

    adjacencyList.set(file.path, new Set());
  });

  // Step 2: AST Extraction for Imports & Re-exports
  normalizedFiles.forEach((file) => {
    if (!file.code || file.code.trim() === "") return;

    try {
      const ast = babelParser.parse(file.code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "exportDefaultFrom",
        ],
        errorRecovery: true,
      });

      const sourceFile = file.path;
      const sourceNode = nodesMap.get(sourceFile);

      if (!ast || !ast.program) return;

      ast.program.body.forEach((statement) => {
        let importPath: string | null = null;
        const importedSymbols: string[] = [];

        // Standard import: import X, { Y as Z } from './path'
        if (statement.type === "ImportDeclaration") {
          importPath = statement.source.value;
          statement.specifiers.forEach((spec) => {
            if (spec.type === "ImportDefaultSpecifier") {
              importedSymbols.push("default");
            } else if (spec.type === "ImportSpecifier") {
              const name = spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value;
              importedSymbols.push(name);
            } else if (spec.type === "ImportNamespaceSpecifier") {
              importedSymbols.push("*");
            }
          });
        }
        // Export from: export { X } from './path'
        else if (
          (statement.type === "ExportNamedDeclaration" || statement.type === "ExportAllDeclaration") &&
          statement.source
        ) {
          importPath = statement.source.value;
          importedSymbols.push("re-export");
        }

        if (importPath) {
          const resolvedTarget = resolveImportPath(sourceFile, importPath, allFilePaths);

          if (resolvedTarget && nodesMap.has(resolvedTarget) && resolvedTarget !== sourceFile) {
            const linkKey = `${sourceFile}--->${resolvedTarget}`;

            if (!linkSymbolsMap.has(linkKey)) {
              linkSymbolsMap.set(linkKey, new Set());
            }
            importedSymbols.forEach((sym) => linkSymbolsMap.get(linkKey)?.add(sym));

            if (!adjacencyList.get(sourceFile)?.has(resolvedTarget)) {
              adjacencyList.get(sourceFile)?.add(resolvedTarget);

              linksMap.set(linkKey, {
                source: sourceFile,
                target: resolvedTarget,
                importSymbols: Array.from(linkSymbolsMap.get(linkKey) || []),
                isCircular: false,
              });

              if (sourceNode) sourceNode.outDegree += 1;
              const targetNode = nodesMap.get(resolvedTarget);
              if (targetNode) {
                targetNode.inDegree += 1;
                // Scale node size based on inbound degree (fan-in)
                targetNode.size = Math.min(25, 5 + targetNode.inDegree * 2.5);
              }
            }
          }
        }
      });
    } catch (err) {
      // Graceful fallback if AST parsing encounters unknown syntax
      console.warn(`AST Parse Notice for [${file.path}]:`, err);
    }
  });

  // Step 3: DFS Circular Dependency Loop Detection
  const circularLoops = detectCircularDependencies(adjacencyList);

  // Mark circular nodes and links
  const circularNodeSet = new Set<string>();
  const circularLinkSet = new Set<string>();

  circularLoops.forEach((loop) => {
    for (let i = 0; i < loop.length - 1; i++) {
      const from = loop[i];
      const to = loop[i + 1];
      circularNodeSet.add(from);
      circularNodeSet.add(to);
      circularLinkSet.add(`${from}--->${to}`);
    }
  });

  const nodes = Array.from(nodesMap.values()).map((node) => ({
    ...node,
    isCircular: circularNodeSet.has(node.id),
  }));

  const links = Array.from(linksMap.values()).map((link) => {
    const srcId = typeof link.source === "string" ? link.source : link.source.id;
    const tgtId = typeof link.target === "string" ? link.target : link.target.id;
    return {
      ...link,
      isCircular: circularLinkSet.has(`${srcId}--->${tgtId}`),
    };
  });

  // Calculate statistics summary
  let routeCount = 0;
  let componentCount = 0;
  let utilityCount = 0;
  let moduleCount = 0;
  let maxFanInFile: string | null = null;
  let maxFanInCount = 0;

  nodes.forEach((n) => {
    if (n.type === "route") routeCount++;
    else if (n.type === "component") componentCount++;
    else if (n.type === "utility") utilityCount++;
    else if (n.type === "module") moduleCount++;

    if (n.inDegree > maxFanInCount) {
      maxFanInCount = n.inDegree;
      maxFanInFile = n.id;
    }
  });

  const endTime = performance.now();

  const stats: GraphStats = {
    totalFiles: nodes.length,
    totalDependencies: links.length,
    circularLoopCount: circularLoops.length,
    routeCount,
    componentCount,
    utilityCount,
    moduleCount,
    maxFanInFile,
    maxFanInCount,
  };

  return {
    nodes,
    links,
    circularLoops,
    parseTimeMs: Math.round((endTime - startTime) * 10) / 10,
    stats,
  };
}

// Helpers
function normalizeFilePath(path: string): string {
  let clean = path.replace(/\\/g, "/");
  if (clean.startsWith("/")) clean = clean.slice(1);
  if (clean.startsWith("./")) clean = clean.slice(2);
  return clean;
}

function getShortLabel(filePath: string): string {
  const parts = filePath.split("/");
  return parts.pop() || filePath;
}

export function resolveImportPath(
  currentFile: string,
  importPath: string,
  allFiles: string[]
): string | null {
  let basePath = "";

  // Support `@/` alias pointing to root
  if (importPath.startsWith("@/")) {
    basePath = importPath.slice(2);
  } else if (importPath.startsWith(".")) {
    const currentParts = currentFile.split("/");
    currentParts.pop(); // Remove current file name
    const importParts = importPath.split("/");

    for (const part of importParts) {
      if (part === ".") continue;
      if (part === "..") {
        if (currentParts.length > 0) currentParts.pop();
      } else {
        currentParts.push(part);
      }
    }
    basePath = currentParts.join("/");
  } else {
    // External npm dependency package (e.g., 'react', 'next')
    return null;
  }

  basePath = normalizeFilePath(basePath);

  const extensions = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
  ];

  for (const ext of extensions) {
    const candidate = `${basePath}${ext}`;
    if (allFiles.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function detectCircularDependencies(adjList: Map<string, Set<string>>): string[][] {
  const loops: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  const seenCycleSignatures = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjList.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = [...path.slice(cycleStartIndex), neighbor];
          const cycleSig = getCycleSignature(cyclePath);

          if (!seenCycleSignatures.has(cycleSig)) {
            seenCycleSignatures.add(cycleSig);
            loops.push(cyclePath);
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of adjList.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return loops;
}

function getCycleSignature(cycle: string[]): string {
  // Normalize cycle array to find unique canonical representation regardless of starting node
  const nodesOnly = cycle.slice(0, cycle.length - 1);
  const minIndex = nodesOnly.indexOf([...nodesOnly].sort()[0]);
  const rotated = [...nodesOnly.slice(minIndex), ...nodesOnly.slice(0, minIndex)];
  return rotated.join("->");
}
