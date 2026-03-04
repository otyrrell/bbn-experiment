import React from "react";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatProb(p) {
  if (p == null) return "\u2014";
  return (p * 100).toFixed(1) + "%";
}

function ProbBar({ label, value }) {
  return (
    <div className="prob-bar-row">
      <span className="prob-label">{label}</span>
      <div className="prob-bar-track">
        <div
          className="prob-bar-fill"
          style={{ width: `${(value ?? 0) * 100}%` }}
        />
      </div>
      <span className="prob-value">{formatProb(value)}</span>
    </div>
  );
}

function PriorTable({ node }) {
  const dist = node.cpt;
  return (
    <>
      <table className="cpt-table">
        <thead>
          <tr>
            {node.states.map((s) => (
              <th key={s}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {node.states.map((s) => (
              <td key={s}>{formatProb(dist[s])}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="prob-bars">
        {node.states.map((s) => (
          <ProbBar key={s} label={s} value={dist[s]} />
        ))}
      </div>
    </>
  );
}

function CPTTable({ node, parents }) {
  const cpt = node.cpt;
  return (
    <div className="cpt-scroll">
      <table className="cpt-table">
        <thead>
          <tr>
            {parents.map((p) => (
              <th key={p.id} className="parent-col">
                {p.label}
              </th>
            ))}
            {node.states.map((s) => (
              <th key={s} className="prob-col">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cpt.map((row, i) => (
            <tr key={i}>
              {parents.map((p) => (
                <td key={p.id} className="parent-val">
                  {row.conditions[p.id] ?? "\u2014"}
                </td>
              ))}
              {node.states.map((s) => (
                <td key={s} className="prob-val">
                  {formatProb(row.probabilities[s])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NodeDetail({ node, bbn }) {
  const parents = bbn.edges
    .filter((e) => e.target === node.id)
    .map((e) => bbn.nodes.find((n) => n.id === e.source));
  const children = bbn.edges
    .filter((e) => e.source === node.id)
    .map((e) => bbn.nodes.find((n) => n.id === e.target));
  const isRoot = parents.length === 0;

  return (
    <div className="detail-node">
      <div className="detail-header">
        <span className={`detail-type-badge ${isRoot ? "root" : "child"}`}>
          {isRoot ? "Root Node" : "Child Node"}
        </span>
        {node.evidence && (
          <span className="detail-type-badge evidence">
            Evidence: {node.evidence}
          </span>
        )}
      </div>
      <h2>{node.label}</h2>
      {node.description && <p className="description">{node.description}</p>}

      <section>
        <h3>States</h3>
        <div className="states-list">
          {node.states.map((s) => (
            <span
              key={s}
              className={`state-chip ${node.evidence === s ? "active" : ""}`}
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {parents.length > 0 && (
        <section>
          <h3>Parents</h3>
          <ul className="relations">
            {parents.map((p) => (
              <li key={p.id}>{p.label}</li>
            ))}
          </ul>
        </section>
      )}

      {children.length > 0 && (
        <section>
          <h3>Children</h3>
          <ul className="relations">
            {children.map((c) => (
              <li key={c.id}>{c.label}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>{isRoot ? "Prior Distribution" : "Conditional Probability Table"}</h3>
        {isRoot ? (
          <PriorTable node={node} />
        ) : (
          <CPTTable node={node} parents={parents} />
        )}
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

  return (
    <div className="detail-edge">
      <div className="detail-header">
        <span className="detail-type-badge edge">Edge</span>
        {edge.strength != null && (
          <span className="detail-type-badge strength">
            Strength: {edge.strength.toFixed(2)}
          </span>
        )}
      </div>
      <h2>
        {source.label} &rarr; {target.label}
      </h2>
      {edge.label && <p className="description">{edge.label}</p>}

      {edge.strength != null && (
        <section>
          <h3>Strength</h3>
          <ProbBar label="" value={edge.strength} />
        </section>
      )}

      <section>
        <h3>Source Node</h3>
        <div className="edge-node-info">
          <strong>{source.label}</strong>
          <div className="states-list">
            {source.states.map((s) => (
              <span key={s} className="state-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3>Target Node</h3>
        <div className="edge-node-info">
          <strong>{target.label}</strong>
          <div className="states-list">
            {target.states.map((s) => (
              <span key={s} className="state-chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {edge.meta && (
        <section>
          <h3>Metadata</h3>
          <pre className="meta-json">
            {JSON.stringify(edge.meta, null, 2)}
          </pre>
        </section>
      )}
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
