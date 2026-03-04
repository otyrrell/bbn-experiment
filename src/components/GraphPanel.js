import React, { useRef, useEffect, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

const NODE_DEFAULT_COLOR = "#6366f1";
const NODE_EVIDENCE_COLOR = "#f59e0b";
const NODE_HOVER_COLOR = "#818cf8";
const NODE_SELECTED_COLOR = "#4f46e5";
const EDGE_DEFAULT_COLOR = "#94a3b8";
const EDGE_SELECTED_COLOR = "#4f46e5";

function isRootNode(bbn, nodeId) {
  return !bbn.edges.some((e) => e.target === nodeId);
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
  const roots = bbn.nodes.filter((n) => (parents.get(n.id)?.length ?? 0) === 0);

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

  const savedY = new Map();
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

  graph.forEachNode((id) => {
    graph.setNodeAttribute(id, "y", savedY.get(id));
  });
}

export default function GraphPanel({ bbn, selection, onSelect }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const graphRef = useRef(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const applySelection = useCallback((renderer, graph, sel) => {
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
        const source = graph.source(edgeId);
        const target = graph.target(edgeId);
        if (source === sel.id || target === sel.id) {
          res.color = EDGE_SELECTED_COLOR;
        }
      }
      return res;
    });
    renderer.refresh();
  }, []);

  // Build graph when bbn changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous
    if (rendererRef.current) {
      rendererRef.current.kill();
      rendererRef.current = null;
      graphRef.current = null;
    }

    const graph = new Graph();
    const nodeCount = bbn.nodes.length;
    const baseSize = nodeCount > 50 ? 8 : 12;
    const rootSize = nodeCount > 50 ? 11 : 16;

    for (const node of bbn.nodes) {
      const isRoot = isRootNode(bbn, node.id);
      graph.addNode(node.id, {
        label: node.label,
        size: isRoot ? rootSize : baseSize,
        color: node.evidence ? NODE_EVIDENCE_COLOR : NODE_DEFAULT_COLOR,
        type: "circle",
      });
    }

    for (const edge of bbn.edges) {
      graph.addEdge(edge.source, edge.target, {
        id: edge.id,
        label: edge.label || "",
        size: edge.strength ? 1 + edge.strength * 4 : 2,
        color: EDGE_DEFAULT_COLOR,
        type: "arrow",
      });
    }

    assignHierarchicalLayout(graph, bbn);

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: true,
      defaultEdgeType: "arrow",
      allowInvalidContainer: true,
      enableEdgeClickEvents: true,
      enableEdgeHoverEvents: true,
    });

    graphRef.current = graph;
    rendererRef.current = renderer;

    let hoveredNode = null;

    renderer.on("enterNode", ({ node }) => {
      hoveredNode = node;
      graph.setNodeAttribute(
        node,
        "color",
        bbn.nodes.find((n) => n.id === node)?.evidence
          ? NODE_EVIDENCE_COLOR
          : NODE_HOVER_COLOR
      );
      containerRef.current.style.cursor = "pointer";
    });

    renderer.on("leaveNode", ({ node }) => {
      hoveredNode = null;
      graph.setNodeAttribute(
        node,
        "color",
        bbn.nodes.find((n) => n.id === node)?.evidence
          ? NODE_EVIDENCE_COLOR
          : NODE_DEFAULT_COLOR
      );
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

  // Update selection highlight when selection prop changes
  useEffect(() => {
    if (rendererRef.current && graphRef.current) {
      applySelection(rendererRef.current, graphRef.current, selection);
    }
  }, [selection, applySelection]);

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <h2>Graph</h2>
      </div>
      <div className="panel-content graph-container" ref={containerRef} />
    </div>
  );
}
