import React, { useRef, useEffect, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

// Modern, bold lighter palette
const EDGE_DEFAULT_COLOR = "#475569";
const EDGE_SELECTED_COLOR = "#93c5fd";
const EDGE_FADED_COLOR = "#1e293b40";
const NODE_FADED_COLOR = "#1e293b";
const NODE_SELECTED_COLOR = "#3b82f6";
const NODE_HOVER_RING = "#60a5fa";

// Probability-based color scale: red (0) -> amber (0.5) -> emerald (1)
function probToColor(p) {
  if (p == null) return "#94a3b8";
  const clamped = Math.max(0, Math.min(1, p));
  if (clamped < 0.5) {
    const t = clamped / 0.5;
    const r = Math.round(239 + (245 - 239) * t);
    const g = Math.round(68 + (158 - 68) * t);
    const b = Math.round(68 + (11 - 68) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (clamped - 0.5) / 0.5;
  const r = Math.round(245 + (16 - 245) * t);
  const g = Math.round(158 + (185 - 158) * t);
  const b = Math.round(11 + (129 - 11) * t);
  return `rgb(${r},${g},${b})`;
}

// Get the confidence value for a node
function getNodeProbability(node) {
  if (node.value != null) return node.value;
  if (!node.marginals) return null;
  const states = node.states || Object.keys(node.marginals);
  if (states.length === 0) return null;
  return node.marginals[states[0]] ?? null;
}

function isRootNode(bbn, nodeId) {
  return !bbn.edges.some((e) => e.target === nodeId);
}

// Collect all ancestors (full upstream dependency chain) of a given node
function getAncestors(bbn, nodeId) {
  const parentMap = new Map();
  for (const edge of bbn.edges) {
    if (!parentMap.has(edge.target)) parentMap.set(edge.target, []);
    parentMap.get(edge.target).push(edge.source);
  }
  const visited = new Set();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const parent of parentMap.get(current) || []) {
      stack.push(parent);
    }
  }
  visited.delete(nodeId);
  return visited;
}

// Collect all descendants (full downstream dependency chain) of a given node
function getDescendants(bbn, nodeId) {
  const childMap = new Map();
  for (const edge of bbn.edges) {
    if (!childMap.has(edge.source)) childMap.set(edge.source, []);
    childMap.get(edge.source).push(edge.target);
  }
  const visited = new Set();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of childMap.get(current) || []) {
      stack.push(child);
    }
  }
  visited.delete(nodeId);
  return visited;
}

function assignHierarchicalLayout(graph, bbn) {
  const children = new Map();
  const parents = new Map();
  for (const node of bbn.nodes) {
    children.set(node.id, []);
    parents.set(node.id, []);
  }
  for (const edge of bbn.edges) {
    children.get(edge.source)?.push(edge.target);
    parents.get(edge.target)?.push(edge.source);
  }

  const depth = new Map();
  const roots = bbn.nodes.filter(
    (n) => (parents.get(n.id)?.length ?? 0) === 0
  );

  const inDegree = new Map();
  for (const node of bbn.nodes) {
    inDegree.set(node.id, parents.get(node.id)?.length ?? 0);
  }
  const queue = [];
  for (const r of roots) {
    queue.push(r.id);
    depth.set(r.id, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    const d = depth.get(current);
    for (const child of children.get(current) ?? []) {
      depth.set(child, Math.max(depth.get(child) ?? 0, d + 1));
      const remaining = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) queue.push(child);
    }
  }

  for (const node of bbn.nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  const layers = new Map();
  for (const [id, d] of depth) {
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d).push(id);
  }

  // Scale spacing based on the widest layer to prevent overlap
  const maxLayerSize = Math.max(...[...layers.values()].map((l) => l.length));
  const nodeCount = bbn.nodes.length;
  // Left-to-right layout: depth controls X, layer index controls Y
  const xSpacing = nodeCount > 50 ? 500 : 350;
  const ySpacing = nodeCount > 50 ? 400 : 250;

  for (const [layerDepth, nodeIds] of layers) {
    const layerHeight = (nodeIds.length - 1) * ySpacing;
    const startY = -layerHeight / 2;
    for (let i = 0; i < nodeIds.length; i++) {
      graph.setNodeAttribute(nodeIds[i], "x", layerDepth * xSpacing);
      graph.setNodeAttribute(nodeIds[i], "y", startY + i * ySpacing);
    }
  }

  const savedX = new Map();
  graph.forEachNode((id, attrs) => savedX.set(id, attrs.x));

  forceAtlas2.assign(graph, {
    iterations: 200,
    settings: {
      gravity: 0.05,
      scalingRatio: 100,
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      slowDown: 10,
      strongGravityMode: false,
    },
  });

  // Restore X to keep left-to-right hierarchy, but let Y spread out
  graph.forEachNode((id) => {
    graph.setNodeAttribute(id, "x", savedX.get(id));
  });
}

export default function GraphPanel({ bbn, selection, onSelect }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const graphRef = useRef(null);
  const bbnRef = useRef(bbn);
  bbnRef.current = bbn;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const applySelection = useCallback((renderer, graph, sel) => {
    const currentBbn = bbnRef.current;

    if (!sel) {
      // No selection — show everything normally
      renderer.setSetting("nodeReducer", null);
      renderer.setSetting("edgeReducer", null);
      renderer.refresh();
      return;
    }

    // For node selection, compute full ancestor + descendant sets
    let connectedSet = null;
    let relevantEdges = null;
    if (sel.type === "node") {
      const ancestorSet = getAncestors(currentBbn, sel.id);
      const descendantSet = getDescendants(currentBbn, sel.id);
      connectedSet = new Set([...ancestorSet, ...descendantSet]);
      // Edges that connect within the full dependency chain
      const fullSet = new Set(connectedSet);
      fullSet.add(sel.id);
      relevantEdges = new Set();
      for (const edge of currentBbn.edges) {
        if (fullSet.has(edge.source) && fullSet.has(edge.target)) {
          relevantEdges.add(edge.id);
        }
      }
    }

    renderer.setSetting("nodeReducer", (nodeId, attrs) => {
      const res = { ...attrs };
      if (sel.type === "node") {
        if (nodeId === sel.id) {
          res.highlighted = true;
          res.color = NODE_SELECTED_COLOR;
          res.zIndex = 2;
        } else if (connectedSet.has(nodeId)) {
          res.zIndex = 1;
        } else {
          res.color = NODE_FADED_COLOR;
          res.size = (attrs.size || 10) * 0.4;
          res.label = "";
          res.zIndex = 0;
        }
      }
      return res;
    });

    renderer.setSetting("edgeReducer", (edgeId, attrs) => {
      const res = { ...attrs };
      if (sel.type === "edge" && sel.id === edgeId) {
        res.color = EDGE_SELECTED_COLOR;
        res.size = (attrs.size || 2) + 2;
      } else if (sel.type === "node") {
        const source = graph.source(edgeId);
        const target = graph.target(edgeId);
        const edgeData = bbnRef.current.edges.find(
          (e) => e.source === source && e.target === target
        );
        if (edgeData && relevantEdges.has(edgeData.id)) {
          res.color = EDGE_SELECTED_COLOR;
          res.size = (attrs.size || 2) + 1;
        } else {
          res.color = EDGE_FADED_COLOR;
          res.size = 0.5;
        }
      }
      return res;
    });
    renderer.refresh();
  }, []);

  // Build graph when bbn changes
  useEffect(() => {
    if (!containerRef.current) return;

    if (rendererRef.current) {
      rendererRef.current.kill();
      rendererRef.current = null;
      graphRef.current = null;
    }

    const graph = new Graph();
    const nodeCount = bbn.nodes.length;
    const baseSize = nodeCount > 50 ? 9 : 14;
    const rootSize = nodeCount > 50 ? 13 : 18;

    for (const node of bbn.nodes) {
      const isRoot = isRootNode(bbn, node.id);
      const prob = getNodeProbability(node);
      graph.addNode(node.id, {
        label: node.label,
        size: isRoot ? rootSize : baseSize,
        color: probToColor(prob),
        type: "circle",
      });
    }

    for (const edge of bbn.edges) {
      graph.addEdge(edge.source, edge.target, {
        id: edge.id,
        label: edge.label || "",
        size: edge.weight ? 1 + edge.weight * 3 : edge.strength ? 1 + edge.strength * 3 : edge.sensitivity ? 1 + edge.sensitivity * 3 : 1.5,
        color: EDGE_DEFAULT_COLOR,
        type: "arrow",
      });
    }

    assignHierarchicalLayout(graph, bbn);

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeType: "arrow",
      allowInvalidContainer: true,
      enableEdgeClickEvents: true,
      enableEdgeHoverEvents: true,
      labelRenderedSizeThreshold: 4,
      labelColor: { color: "#e2e8f0" },
      labelSize: 12,
      labelWeight: "bold",
    });

    graphRef.current = graph;
    rendererRef.current = renderer;

    let hoveredNode = null;

    renderer.on("enterNode", ({ node }) => {
      hoveredNode = node;
      graph.setNodeAttribute(node, "highlighted", true);
      containerRef.current.style.cursor = "pointer";
    });

    renderer.on("leaveNode", ({ node }) => {
      hoveredNode = null;
      graph.setNodeAttribute(node, "highlighted", false);
      containerRef.current.style.cursor = "default";
    });

    renderer.on("enterEdge", () => {
      containerRef.current.style.cursor = "pointer";
    });
    renderer.on("leaveEdge", () => {
      if (!hoveredNode) containerRef.current.style.cursor = "default";
    });

    renderer.on("clickNode", ({ node }) => {
      const sel = { type: "node", id: node };
      applySelection(renderer, graph, sel);
      onSelectRef.current(sel);
    });

    renderer.on("clickEdge", ({ edge }) => {
      const sel = { type: "edge", id: edge };
      applySelection(renderer, graph, sel);
      onSelectRef.current(sel);
    });

    renderer.on("clickStage", () => {
      applySelection(renderer, graph, null);
      onSelectRef.current(null);
    });

    return () => {
      renderer.kill();
      rendererRef.current = null;
      graphRef.current = null;
    };
  }, [bbn, applySelection]);

  useEffect(() => {
    if (rendererRef.current && graphRef.current) {
      applySelection(rendererRef.current, graphRef.current, selection);

      // Animate the camera to center on the selected node
      if (selection?.type === "node" && graphRef.current.hasNode(selection.id)) {
        const displayData = rendererRef.current.getNodeDisplayData(selection.id);
        if (displayData) {
          const camera = rendererRef.current.getCamera();
          const pos = rendererRef.current.viewportToFramedGraph(displayData);
          camera.animate(
            { x: pos.x, y: pos.y, ratio: Math.min(camera.ratio, 0.5) },
            { duration: 300 }
          );
        }
      }
    }
  }, [selection, applySelection]);

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <h2>Graph</h2>
        <div className="probability-legend">
          <span className="legend-label">Low</span>
          <div className="legend-gradient" />
          <span className="legend-label">High</span>
        </div>
      </div>
      <div className="panel-content graph-container" ref={containerRef} />
    </div>
  );
}
