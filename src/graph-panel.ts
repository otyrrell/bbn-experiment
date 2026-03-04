import Graph from "graphology";
import Sigma from "sigma";
import { circular } from "graphology-layout";
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
 * Creates the sigma.js graph panel and returns a cleanup function.
 */
export function createGraphPanel({ container, bbn, onSelect }: GraphPanelOptions): {
  renderer: Sigma;
  graph: Graph;
  setSelection: (sel: Selection) => void;
  destroy: () => void;
} {
  const graph = new Graph();

  // Add nodes
  for (const node of bbn.nodes) {
    const isRoot = isRootNode(bbn, node.id);
    graph.addNode(node.id, {
      label: node.label,
      size: isRoot ? 16 : 12,
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

  // Layout: start with circular, then refine with force-directed
  circular.assign(graph, { scale: 200 });
  forceAtlas2.assign(graph, {
    iterations: 100,
    settings: {
      gravity: 1,
      scalingRatio: 10,
      barnesHutOptimize: true,
      slowDown: 5,
    },
  });

  // Create renderer
  const renderer = new Sigma(graph, container, {
    renderEdgeLabels: true,
    defaultEdgeType: "arrow",
    allowInvalidContainer: true,
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

  return {
    renderer,
    graph,
    setSelection,
    destroy: () => renderer.kill(),
  };
}
