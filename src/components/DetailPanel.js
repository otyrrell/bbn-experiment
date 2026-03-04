import React from "react";

function formatProb(p) {
  if (p == null) return "\u2014";
  return (p * 100).toFixed(1) + "%";
}

// Same probability color scale as the graph: red (0) -> amber (0.5) -> emerald (1)
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

function ProbBar({ label, value }) {
  const color = probToColor(value);
  return (
    <div className="prob-bar-row">
      <span className="prob-label">{label}</span>
      <div className="prob-bar-track">
        <div
          className="prob-bar-fill"
          style={{ width: `${(value ?? 0) * 100}%`, background: color }}
        />
      </div>
      <span className="prob-value">{formatProb(value)}</span>
    </div>
  );
}

function FunctionDisplay({ node }) {
  const func = node.function;
  if (!func) return null;

  return (
    <div className="function-display">
      <div className="function-type-badge">{func.type.replace(/_/g, " ")}</div>
      {func.display && <p className="function-desc">{func.display}</p>}
      {func.formula && <code className="function-formula">{func.formula}</code>}
      {func.params && (
        <div className="function-params">
          <h4>Parameters</h4>
          {Object.entries(func.params).map(([key, val]) => (
            <div key={key} className="param-row">
              <span className="param-key">{key}</span>
              <span className="param-val">{String(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Extract the single function-relevant attribute from an edge
function getEdgeAttr(edge) {
  const skip = new Set(["id", "source", "target", "label"]);
  for (const [k, v] of Object.entries(edge)) {
    if (!skip.has(k)) return { key: k, value: v };
  }
  return null;
}

function EdgeAttrBadge({ attr }) {
  if (!attr) return null;
  const isNumeric = typeof attr.value === "number";
  if (isNumeric) {
    return (
      <span className="edge-prop-numeric">
        {attr.key}: {attr.value.toFixed(2)}
      </span>
    );
  }
  return <span className="edge-prop-categorical">{attr.value}</span>;
}

function ParentList({ parentEdges }) {
  return (
    <ul className="relations parent-list">
      {parentEdges.map(({ node: p, edge }) => {
        const attr = getEdgeAttr(edge);
        return (
          <li key={p.id} className="parent-row-detailed">
            <div className="parent-main">
              <span className="parent-name">{p.label}</span>
              <EdgeAttrBadge attr={attr} />
              <span className="parent-value-bar">
                <span
                  className="parent-value-fill"
                  style={{
                    width: `${(p.value ?? 0) * 100}%`,
                    background: probToColor(p.value),
                  }}
                />
              </span>
              <span
                className="parent-value-num"
                style={{ color: probToColor(p.value) }}
              >
                {formatProb(p.value)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChildList({ children }) {
  return (
    <ul className="relations">
      {children.map((c) => (
        <li key={c.id} className="parent-row">
          <span className="parent-name">{c.label}</span>
          <span className="parent-value-bar">
            <span
              className="parent-value-fill"
              style={{
                width: `${(c.value ?? 0) * 100}%`,
                background: probToColor(c.value),
              }}
            />
          </span>
          <span
            className="parent-value-num"
            style={{ color: probToColor(c.value) }}
          >
            {formatProb(c.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NodeDetail({ node, bbn }) {
  const parentEdges = bbn.edges
    .filter((e) => e.target === node.id)
    .map((e) => ({
      edge: e,
      node: bbn.nodes.find((n) => n.id === e.source),
    }));
  const children = bbn.edges
    .filter((e) => e.source === node.id)
    .map((e) => bbn.nodes.find((n) => n.id === e.target));
  const isRoot = parentEdges.length === 0;

  return (
    <div className="detail-node">
      <div className="detail-header">
        <span className={`detail-type-badge ${isRoot ? "root" : "child"}`}>
          {isRoot ? "Root Node" : "Child Node"}
        </span>
      </div>
      <h2>{node.label}</h2>
      {node.description && <p className="description">{node.description}</p>}

      <section>
        <h3>Confidence</h3>
        <ProbBar label="" value={node.value} />
      </section>

      {parentEdges.length > 0 && (
        <section>
          <h3>Parents</h3>
          <ParentList parentEdges={parentEdges} />
        </section>
      )}

      {children.length > 0 && (
        <section>
          <h3>Children</h3>
          <ChildList children={children} />
        </section>
      )}

      <section>
        <h3>{isRoot ? "Prior" : "Calculation Function"}</h3>
        <FunctionDisplay node={node} />
      </section>

      {node.meta && (
        <section>
          <h3>Metadata</h3>
          <pre className="meta-json">
            {JSON.stringify(node.meta, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function EdgeDetail({ edge, bbn }) {
  const source = bbn.nodes.find((n) => n.id === edge.source);
  const target = bbn.nodes.find((n) => n.id === edge.target);
  const attr = getEdgeAttr(edge);

  return (
    <div className="detail-edge">
      <div className="detail-header">
        <span className="detail-type-badge edge">Edge</span>
      </div>
      <h2>
        {source.label} &rarr; {target.label}
      </h2>
      {edge.label && <p className="description">{edge.label}</p>}

      {attr && (
        <section>
          <h3>Edge Property</h3>
          <div className="edge-props-grid">
            <div className="edge-prop-item">
              <span className="edge-prop-label">{attr.key}</span>
              {typeof attr.value === "number" ? (
                <>
                  <span className="edge-prop-value">{attr.value.toFixed(2)}</span>
                  <div className="edge-prop-bar">
                    <div
                      className="edge-prop-bar-fill"
                      style={{ width: `${attr.value * 100}%`, background: "#60a5fa" }}
                    />
                  </div>
                </>
              ) : (
                <span className="edge-prop-categorical">{attr.value}</span>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3>Source Node</h3>
        <div className="edge-node-info">
          <strong>{source.label}</strong>
          <ProbBar label="" value={source.value} />
        </div>
      </section>

      <section>
        <h3>Target Node</h3>
        <div className="edge-node-info">
          <strong>{target.label}</strong>
          <ProbBar label="" value={target.value} />
        </div>
      </section>
    </div>
  );
}

export default function DetailPanel({ selection, bbn }) {
  if (!selection) {
    return (
      <div className="panel">
        <div className="panel-toolbar">
          <h2>Detail View</h2>
        </div>
        <div className="panel-content detail-content">
          <div className="detail-empty">
            <h2>{bbn.name}</h2>
            {bbn.description && <p>{bbn.description}</p>}
            <p className="hint">
              Click a node or edge in the graph to view details.
            </p>
            <div className="summary">
              <span>
                <strong>{bbn.nodes.length}</strong> nodes
              </span>
              <span>
                <strong>{bbn.edges.length}</strong> edges
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const content =
    selection.type === "node" ? (
      <NodeDetail
        node={bbn.nodes.find((n) => n.id === selection.id)}
        bbn={bbn}
      />
    ) : (
      <EdgeDetail
        edge={bbn.edges.find((e) => e.id === selection.id)}
        bbn={bbn}
      />
    );

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <h2>Detail View</h2>
      </div>
      <div className="panel-content detail-content">{content}</div>
    </div>
  );
}
