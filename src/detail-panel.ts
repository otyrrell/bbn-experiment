import type { BBNDefinition, BBNNode, BBNEdge, Selection, CPT, CPTRow, TestQuery } from "./types";

/**
 * Creates and manages the right-hand detail panel.
 */
export function createDetailPanel(container: HTMLElement, bbn: BBNDefinition) {
  container.innerHTML = "";
  container.className = "detail-panel";
  renderEmpty();

  function renderEmpty() {
    container.innerHTML = `
      <div class="detail-empty">
        <h2>${escapeHtml(bbn.name)}</h2>
        ${bbn.description ? `<p>${escapeHtml(bbn.description)}</p>` : ""}
        <p class="hint">Click a node or edge in the graph to view details.</p>
        <div class="summary">
          <span><strong>${bbn.nodes.length}</strong> nodes</span>
          <span><strong>${bbn.edges.length}</strong> edges</span>
        </div>
      </div>
    `;
  }

  function renderMarginalBars(node: BBNNode): string {
    if (!node.marginals) return "";
    const m = node.marginals;
    return `
      <section>
        <h3>Marginal Distribution</h3>
        <div class="prob-bars">
          ${node.states.map((s) => `
            <div class="prob-bar-row">
              <span class="prob-label">${escapeHtml(s)}</span>
              <div class="prob-bar-track"><div class="prob-bar-fill inference-bar" style="width:${(m[s] ?? 0) * 100}%"></div></div>
              <span class="prob-value">${formatProb(m[s])}</span>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderTestQuery(tq: TestQuery): string {
    const paramEntries = Object.entries(tq.params);
    const summary = tq.resultSummary;
    const passRate = summary ? (summary.passed / summary.total * 100).toFixed(1) : null;

    return `
      <section class="test-query-section">
        <h3>Test Query</h3>
        <div class="test-query-box">
          <div class="test-query-description">${escapeHtml(tq.description)}</div>
          <div class="test-query-function">
            <code>${escapeHtml(tq.function)}(${paramEntries.map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(JSON.stringify(v))}`).join(", ")})</code>
          </div>
          ${paramEntries.length > 0 ? `
          <div class="test-query-params">
            <table class="cpt-table">
              <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
              <tbody>
                ${paramEntries.map(([k, v]) => `<tr><td class="parent-val">${escapeHtml(k)}</td><td>${escapeHtml(JSON.stringify(v))}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>` : ""}
          ${summary ? `
          <div class="test-query-results">
            <div class="test-result-bar">
              <div class="test-result-passed" style="width:${(summary.passed / summary.total) * 100}%"></div>
              <div class="test-result-failed" style="width:${(summary.failed / summary.total) * 100}%"></div>
              <div class="test-result-skipped" style="width:${(summary.skipped / summary.total) * 100}%"></div>
            </div>
            <div class="test-result-counts">
              <span class="test-count passed">${summary.passed} passed</span>
              <span class="test-count failed">${summary.failed} failed</span>
              <span class="test-count skipped">${summary.skipped} skipped</span>
              <span class="test-count total">${summary.total} total (${passRate}%)</span>
            </div>
          </div>` : ""}
          ${tq.allureReportUrl ? `
          <div class="test-query-allure">
            <a href="${escapeHtml(tq.allureReportUrl)}" target="_blank" rel="noopener noreferrer" class="allure-link">
              View Allure Report &rarr;
            </a>
          </div>` : ""}
        </div>
      </section>
      ${tq.logs && tq.logs.length > 0 ? `
      <section>
        <h3>Query Execution Log</h3>
        <details class="test-query-logs">
          <summary>${tq.logs.length} log line${tq.logs.length !== 1 ? "s" : ""}</summary>
          <pre class="log-output">${tq.logs.map((l) => escapeHtml(l)).join("\n")}</pre>
        </details>
      </section>` : ""}
    `;
  }

  function renderNode(node: BBNNode, showInference: boolean) {
    const parents = bbn.edges.filter((e) => e.target === node.id).map((e) => bbn.nodes.find((n) => n.id === e.source)!);
    const children = bbn.edges.filter((e) => e.source === node.id).map((e) => bbn.nodes.find((n) => n.id === e.target)!);
    const isRoot = parents.length === 0;

    container.innerHTML = `
      <div class="detail-node">
        <div class="detail-header">
          <span class="detail-type-badge ${isRoot ? "root" : "child"}">
            ${isRoot ? "Root Node" : "Child Node"}
          </span>
          ${node.testQuery ? `<span class="detail-type-badge test-query">Test-Driven</span>` : ""}
          ${node.evidence ? `<span class="detail-type-badge evidence">Evidence: ${escapeHtml(node.evidence)}</span>` : ""}
        </div>
        <h2>${escapeHtml(node.label)}</h2>
        ${node.description ? `<p class="description">${escapeHtml(node.description)}</p>` : ""}

        ${showInference ? renderMarginalBars(node) : ""}

        ${node.testQuery ? renderTestQuery(node.testQuery) : ""}

        <section>
          <h3>States</h3>
          <div class="states-list">
            ${node.states.map((s) => `<span class="state-chip ${node.evidence === s ? "active" : ""}">${escapeHtml(s)}</span>`).join("")}
          </div>
        </section>

        ${parents.length > 0 ? `
        <section>
          <h3>Parents</h3>
          <ul class="relations">${parents.map((p) => `<li>${escapeHtml(p.label)}</li>`).join("")}</ul>
        </section>` : ""}

        ${children.length > 0 ? `
        <section>
          <h3>Children</h3>
          <ul class="relations">${children.map((c) => `<li>${escapeHtml(c.label)}</li>`).join("")}</ul>
        </section>` : ""}

        <section>
          <h3>${isRoot ? "Prior Distribution" : "Conditional Probability Table"}</h3>
          ${isRoot ? renderPriorTable(node) : renderCPTTable(node, parents)}
        </section>

        ${node.meta ? `
        <section>
          <h3>Metadata</h3>
          <pre class="meta-json">${escapeHtml(JSON.stringify(node.meta, null, 2))}</pre>
        </section>` : ""}
      </div>
    `;
  }

  function renderEdge(edge: BBNEdge) {
    const source = bbn.nodes.find((n) => n.id === edge.source)!;
    const target = bbn.nodes.find((n) => n.id === edge.target)!;

    container.innerHTML = `
      <div class="detail-edge">
        <div class="detail-header">
          <span class="detail-type-badge edge">Edge</span>
          ${edge.strength != null ? `<span class="detail-type-badge strength">Strength: ${edge.strength.toFixed(2)}</span>` : ""}
        </div>
        <h2>${escapeHtml(source.label)} → ${escapeHtml(target.label)}</h2>
        ${edge.label ? `<p class="description">${escapeHtml(edge.label)}</p>` : ""}

        <section>
          <h3>Edge Attributes</h3>
          <table class="cpt-table">
            <tbody>
              <tr><td class="parent-val">ID</td><td>${escapeHtml(edge.id)}</td></tr>
              ${edge.label ? `<tr><td class="parent-val">Label</td><td>${escapeHtml(edge.label)}</td></tr>` : ""}
              <tr><td class="parent-val">Source</td><td>${escapeHtml(source.label)} (${escapeHtml(edge.source)})</td></tr>
              <tr><td class="parent-val">Target</td><td>${escapeHtml(target.label)} (${escapeHtml(edge.target)})</td></tr>
              ${edge.strength != null ? `
              <tr>
                <td class="parent-val">Strength</td>
                <td>
                  <div class="prob-bar-row">
                    <div class="prob-bar-track"><div class="prob-bar-fill" style="width:${edge.strength * 100}%"></div></div>
                    <span class="prob-value">${(edge.strength * 100).toFixed(0)}%</span>
                  </div>
                </td>
              </tr>` : ""}
            </tbody>
          </table>
        </section>

        <section>
          <h3>Source Node</h3>
          <div class="edge-node-info">
            <strong>${escapeHtml(source.label)}</strong>
            <div class="states-list">${source.states.map((s) => `<span class="state-chip">${escapeHtml(s)}</span>`).join("")}</div>
          </div>
        </section>

        <section>
          <h3>Target Node</h3>
          <div class="edge-node-info">
            <strong>${escapeHtml(target.label)}</strong>
            <div class="states-list">${target.states.map((s) => `<span class="state-chip">${escapeHtml(s)}</span>`).join("")}</div>
          </div>
        </section>

        ${edge.meta ? `
        <section>
          <h3>Metadata</h3>
          <pre class="meta-json">${escapeHtml(JSON.stringify(edge.meta, null, 2))}</pre>
        </section>` : ""}
      </div>
    `;
  }

  function renderPriorTable(node: BBNNode): string {
    const dist = node.cpt as Record<string, number>;
    return `
      <table class="cpt-table">
        <thead><tr>${node.states.map((s) => `<th>${escapeHtml(s)}</th>`).join("")}</tr></thead>
        <tbody><tr>${node.states.map((s) => `<td>${formatProb(dist[s])}</td>`).join("")}</tr></tbody>
      </table>
      <div class="prob-bars">
        ${node.states.map((s) => `
          <div class="prob-bar-row">
            <span class="prob-label">${escapeHtml(s)}</span>
            <div class="prob-bar-track"><div class="prob-bar-fill" style="width:${(dist[s] ?? 0) * 100}%"></div></div>
            <span class="prob-value">${formatProb(dist[s])}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCPTTable(node: BBNNode, parents: BBNNode[]): string {
    const cpt = node.cpt as CPT;
    return `
      <div class="cpt-scroll">
        <table class="cpt-table">
          <thead>
            <tr>
              ${parents.map((p) => `<th class="parent-col">${escapeHtml(p.label)}</th>`).join("")}
              ${node.states.map((s) => `<th class="prob-col">${escapeHtml(s)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${cpt.map((row: CPTRow) => `
              <tr>
                ${parents.map((p) => `<td class="parent-val">${escapeHtml(row.conditions[p.id] ?? "—")}</td>`).join("")}
                ${node.states.map((s) => `<td class="prob-val">${formatProb(row.probabilities[s])}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function update(selection: Selection, showInference = false) {
    if (!selection) {
      renderEmpty();
      return;
    }
    if (selection.type === "node") {
      const node = bbn.nodes.find((n) => n.id === selection.id);
      if (node) renderNode(node, showInference);
    } else {
      const edge = bbn.edges.find((e) => e.id === selection.id);
      if (edge) renderEdge(edge);
    }
  }

  return { update, destroy: () => { container.innerHTML = ""; } };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatProb(p: number | undefined): string {
  if (p == null) return "—";
  return (p * 100).toFixed(1) + "%";
}
