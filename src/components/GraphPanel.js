import React, { useRef, useEffect, useCallback } from "react";

const NODE_POSITIONS = {
  A: { x: 200, y: 60 },
  B: { x: 100, y: 180 },
  C: { x: 200, y: 300 },
  D: { x: 340, y: 180 },
};

const NODE_RADIUS = 30;

export default function GraphPanel({ data, selectedNodeId, onNodeSelect }) {
  const canvasRef = useRef(null);

  const draw = useCallback(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      data.edges.forEach((edge) => {
        const from = NODE_POSITIONS[edge.from];
        const to = NODE_POSITIONS[edge.to];
        if (!from || !to) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = "#4a6fa5";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowX = to.x - NODE_RADIUS * Math.cos(angle);
        const arrowY = to.y - NODE_RADIUS * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - 10 * Math.cos(angle - 0.4),
          arrowY - 10 * Math.sin(angle - 0.4)
        );
        ctx.lineTo(
          arrowX - 10 * Math.cos(angle + 0.4),
          arrowY - 10 * Math.sin(angle + 0.4)
        );
        ctx.closePath();
        ctx.fillStyle = "#4a6fa5";
        ctx.fill();

        // Weight label
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.fillStyle = "#888";
        ctx.font = "11px sans-serif";
        ctx.fillText(edge.weight.toFixed(1), midX + 5, midY - 5);
      });

      // Draw nodes
      data.nodes.forEach((node) => {
        const pos = NODE_POSITIONS[node.id];
        if (!pos) return;

        const isSelected = node.id === selectedNodeId;

        // Glow for selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, NODE_RADIUS + 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(74, 111, 165, 0.3)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#4a6fa5" : "#2a2a4a";
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#6fa3e8" : "#4a6fa5";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#e0e0e0";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, pos.x, pos.y);
      });
    },
    [data, selectedNodeId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext("2d");
      draw(ctx, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [draw]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of data.nodes) {
      const pos = NODE_POSITIONS[node.id];
      if (!pos) continue;
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist <= NODE_RADIUS) {
        onNodeSelect(node.id);
        return;
      }
    }
    onNodeSelect(null);
  };

  return (
    <div className="panel">
      <div className="panel-title">Graph</div>
      <div className="panel-content" style={{ padding: 0 }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{ display: "block", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}
