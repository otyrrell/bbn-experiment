import React from "react";

function getNodeLabel(id, allNodes) {
  const node = allNodes.find((n) => n.id === id);
  return node ? node.label : id;
}

export default function DetailViewPanel({ node, allNodes }) {
  if (!node) {
    return (
      <div className="panel">
        <div className="panel-title">Detail View</div>
        <div className="panel-content">
          <p style={{ color: "#666", fontStyle: "italic", marginTop: 40, textAlign: "center" }}>
            Click a node in the graph to view details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-title">Detail View</div>
      <div className="panel-content">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, color: "#e0e0e0", marginBottom: 4 }}>{node.label}</h2>
          <span style={{ fontSize: 12, color: "#666" }}>ID: {node.id}</span>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Probability</label>
          <div style={barContainerStyle}>
            <div style={{ ...barFillStyle, width: `${node.value * 100}%` }} />
          </div>
          <span style={valueStyle}>{(node.value * 100).toFixed(0)}%</span>
        </div>

        {node.incomingEdges.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={sectionHeadingStyle}>Incoming Edges</h3>
            {node.incomingEdges.map((e, i) => (
              <div key={i} style={edgeRowStyle}>
                <span>{getNodeLabel(e.from, allNodes)}</span>
                <span style={{ color: "#4a6fa5" }}>w: {e.weight}</span>
              </div>
            ))}
          </div>
        )}

        {node.outgoingEdges.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={sectionHeadingStyle}>Outgoing Edges</h3>
            {node.outgoingEdges.map((e, i) => (
              <div key={i} style={edgeRowStyle}>
                <span>{getNodeLabel(e.to, allNodes)}</span>
                <span style={{ color: "#4a6fa5" }}>w: {e.weight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const fieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const labelStyle = {
  fontSize: 12,
  color: "#888",
  width: 80,
  flexShrink: 0,
};

const barContainerStyle = {
  flex: 1,
  height: 8,
  background: "#2a2a4a",
  borderRadius: 4,
  overflow: "hidden",
};

const barFillStyle = {
  height: "100%",
  background: "#4a6fa5",
  borderRadius: 4,
  transition: "width 0.3s",
};

const valueStyle = {
  fontSize: 13,
  color: "#e0e0e0",
  width: 40,
  textAlign: "right",
};

const sectionHeadingStyle = {
  fontSize: 12,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 8,
};

const edgeRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  borderBottom: "1px solid #2a2a4a",
  fontSize: 13,
};
