import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { BBNDefinition, Selection } from "./types";

export interface GraphPanelOptions {
  container: HTMLElement;
  bbn: BBNDefinition;
  onSelect: (selection: Selection) => void;
}

const NODE_DEFAULT_COLOR = "#6366f1";
const NODE_EVIDENCE_COLOR = "#f59e0b";
const NODE_HOVER_COLOR = "#818cf8";
const NODE_SELECTED_COLOR = "#4f46e5";
const EDGE_DEFAULT_COLOR = "#94a3b8";
const EDGE_SELECTED_COLOR = "#4f46e5";

/**
 * Determine if a node's CPT is a prior distribution (root node).
 */
function isRootNode(bbn: BBNDefinition, nodeId: string): boolean {
  return !bbn.edges.some((e) => e.target === nodeId);
}

/**
 * Assign a hierarchical layout so causality flows upward.
 * Root nodes (no parents) sit at the bottom; leaf nodes at the top.
 * Uses topological depth (longest path from any root) for layer assignment,
 * then runs ForceAtlas2 briefly to improve horizontal spacing while
 * snapping Y back to layer positions afterward.
 */
function assignHierarchicalLayout(graph: Graph, bbn: BBNDefinition) {
  // Build adjacency for depth computation
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const node of bbn.nodes) {
    children.set(node.id, []);
    parents.set(node.id, []);
  }
  for (const edge of bbn.edges) {
    children.get(edge.source)?.push(edge.target);
    parents.get(edge.target)?.push(edge.source);
  }

  // Compute depth via longest path from roots (BFS/dynamic programming)
  const depth = new Map<string, number>();
  const roots = bbn.nodes.filter((n) => (parents.get(n.id)?.length ?? 0) === 0);

  // Topological order via Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const node of bbn.nodes) {
    inDegree.set(node.id, parents.get(node.id)?.length ?? 0);
  }
  const queue: string[] = [];
  for (const r of roots) {
    queue.push(r.id);
    depth.set(r.id, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = depth.get(current)!;
    for (const child of children.get(current) ?? []) {
      // Longest path: take max depth
      depth.set(child, Math.max(depth.get(child) ?? 0, d + 1));
      const remaining = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }

  // Handle any nodes not reached (cycles or disconnected) — place at layer 0
  for (const node of bbn.nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  // Group nodes by layer
  const layers = new Map<number, string[]>();
  let maxDepth = 0;
  for (const [id, d] of depth) {
    maxDepth = Math.max(maxDepth, d);
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  }

  // Assign positions: Y = depth (roots at bottom = y:0, effects at top = y:maxDepth)
  const ySpacing = 200;
  const xSpacing = 150;

  for (const [layerDepth, nodeIds] of layers) {
    const layerWidth = (nodeIds.length - 1) * xSpacing;
    const startX = -layerWidth / 2;
    for (let i = 0; i < nodeIds.length; i++) {
      graph.setNodeAttribute(nodeIds[i], "x", startX + i * xSpacing);
      graph.setNodeAttribute(nodeIds[i], "y", layerDepth * ySpacing);
    }
  }

  // Run ForceAtlas2 briefly to improve horizontal spacing, then snap Y back
  const savedY = new Map<string, number>();
  graph.forEachNode((id, attrs) => savedY.set(id, attrs.y));

  forceAtlas2.assign(graph, {
    iterations: 50,
    settings: {
      gravity: 0.5,
      scalingRatio: 20,
      barnesHutOptimize: true,
      slowDown: 10,
    },
  });

  // Snap Y back to hierarchical layers (keep improved X from ForceAtlas2)
  graph.forEachNode((id) => {
    graph.setNodeAttribute(id, "y", savedY.get(id)!);
  });
}

/**
 * Creates the sigma.js graph panel and returns a cleanup function.
 */
/**
 * Interpolate between two hex colors based on t (0-1).
 */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/** Color scale: low probability = red, mid = yellow, high = green */
const COLOR_LOW = "#ef4444";
const COLOR_MID = "#eab308";
const COLOR_HIGH = "#22c55e";

function probToColor(p: number): string {
  if (p < 0.5) return lerpColor(COLOR_LOW, COLOR_MID, p * 2);
  return lerpColor(COLOR_MID, COLOR_HIGH, (p - 0.5) * 2);
}

/**
 * Get the "dominant" probability for a node — the highest probability state.
 */
function dominantProb(marginal: Record<string, number>): { state: string; prob: number } {
  let best = { state: "", prob: 0 };
  for (const [s, p] of Object.entries(marginal)) {
    if (p > best.prob) best = { state: s, prob: p };
  }
  return best;
}

export function createGraphPanel({ container, bbn, onSelect }: GraphPanelOptions): {
  renderer: Sigma;
  graph: Graph;
  setSelection: (sel: Selection) => void;
  setInferenceMode: (enabled: boolean) => void;
  destroy: () => void;
} {
  const graph = new Graph();

  // Scale node sizes based on graph size
  const nodeCount = bbn.nodes.length;
  const baseSize = nodeCount > 50 ? 8 : 12;
  const rootSize = nodeCount > 50 ? 11 : 16;

  // Add nodes
  for (const node of bbn.nodes) {
    const isRoot = isRootNode(bbn, node.id);
    graph.addNode(node.id, {
      label: node.label,
      size: isRoot ? rootSize : baseSize,
      color: node.evidence ? NODE_EVIDENCE_COLOR : NODE_DEFAULT_COLOR,
      type: "circle",
    });
  }

  // Add edges
  for (const edge of bbn.edges) {
    graph.addEdge(edge.source, edge.target, {
      id: edge.id,
      label: edge.label || "",
      size: edge.strength ? 1 + edge.strength * 4 : 2,
      color: EDGE_DEFAULT_COLOR,
      type: "arrow",
    });
  }

  // Hierarchical layout: causality flows upward (roots at bottom, effects at top)
  assignHierarchicalLayout(graph, bbn);

  // Create renderer with edge interaction events enabled
  const renderer = new Sigma(graph, container, {
    renderEdgeLabels: true,
    defaultEdgeType: "arrow",
    allowInvalidContainer: true,
    enableEdgeClickEvents: true,
    enableEdgeHoverEvents: true,
  });

  let currentSelection: Selection = null;

  // Selection highlight via reducers
  function setSelection(sel: Selection) {
    currentSelection = sel;
    renderer.setSetting("nodeReducer", (nodeId, attrs) => {
      const res = { ...attrs };
      if (sel?.type === "node" && sel.id === nodeId) {
        res.color = NODE_SELECTED_COLOR;
        res.highlighted = true;
        res.zIndex = 1;
      }
      return res;
    });
    renderer.setSetting("edgeReducer", (edgeId, attrs) => {
      const res = { ...attrs };
      if (sel?.type === "edge" && sel.id === edgeId) {
        res.color = EDGE_SELECTED_COLOR;
        res.size = (attrs.size || 2) + 2;
      } else if (sel?.type === "node") {
        // Highlight edges connected to the selected node
        const source = graph.source(edgeId);
        const target = graph.target(edgeId);
        if (source === sel.id || target === sel.id) {
          res.color = EDGE_SELECTED_COLOR;
        }
      }
      return res;
    });
    renderer.refresh();
  }

  // Hover state
  let hoveredNode: string | null = null;
  renderer.on("enterNode", ({ node }) => {
    hoveredNode = node;
    if (!currentSelection || currentSelection.type !== "node" || currentSelection.id !== node) {
      graph.setNodeAttribute(node, "color",
        bbn.nodes.find((n) => n.id === node)?.evidence ? NODE_EVIDENCE_COLOR : NODE_HOVER_COLOR
      );
    }
    container.style.cursor = "pointer";
  });

  renderer.on("leaveNode", ({ node }) => {
    hoveredNode = null;
    if (!currentSelection || currentSelection.type !== "node" || currentSelection.id !== node) {
      graph.setNodeAttribute(node, "color",
        bbn.nodes.find((n) => n.id === node)?.evidence ? NODE_EVIDENCE_COLOR : NODE_DEFAULT_COLOR
      );
    }
    container.style.cursor = "default";
  });

  // Edge hover
  renderer.on("enterEdge", () => {
    container.style.cursor = "pointer";
  });
  renderer.on("leaveEdge", () => {
    if (!hoveredNode) container.style.cursor = "default";
  });

  // Click handlers
  renderer.on("clickNode", ({ node }) => {
    const sel: Selection = { type: "node", id: node };
    setSelection(sel);
    onSelect(sel);
  });

  renderer.on("clickEdge", ({ edge }) => {
    const sel: Selection = { type: "edge", id: edge };
    setSelection(sel);
    onSelect(sel);
  });

  renderer.on("clickStage", () => {
    setSelection(null);
    onSelect(null);
  });

  function setInferenceMode(enabled: boolean) {
    if (enabled) {
      // Color nodes based on their dominant marginal probability from JSON
      for (const node of bbn.nodes) {
        if (node.marginals) {
          const { state, prob } = dominantProb(node.marginals);
          graph.setNodeAttribute(node.id, "color", node.evidence ? NODE_EVIDENCE_COLOR : probToColor(prob));
          graph.setNodeAttribute(node.id, "label", `${node.label}\n${state}: ${(prob * 100).toFixed(0)}%`);
        }
      }
    } else {
      // Restore default colors and labels
      for (const node of bbn.nodes) {
        graph.setNodeAttribute(node.id, "color", node.evidence ? NODE_EVIDENCE_COLOR : NODE_DEFAULT_COLOR);
        graph.setNodeAttribute(node.id, "label", node.label);
      }
    }
    renderer.refresh();
  }

  return {
    renderer,
    graph,
    setSelection,
    setInferenceMode,
    destroy: () => renderer.kill(),
  };
}
