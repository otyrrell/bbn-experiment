import type { BBNDefinition, Selection } from "./types";
import { createGraphPanel } from "./graph-panel";
import { createDetailPanel } from "./detail-panel";

export interface BBNViewerOptions {
  /** Container element for the viewer */
  container: HTMLElement;
  /** The BBN to render */
  bbn: BBNDefinition;
}

/**
 * Main entry point: mounts a two-panel BBN viewer into a container.
 * Left panel: interactive sigma.js graph.
 * Right panel: detail view of selected node/edge.
 */
export function createBBNViewer({ container, bbn }: BBNViewerOptions) {
  // Check if any nodes have marginals provided
  const hasMarginals = bbn.nodes.some((n) => n.marginals != null);

  container.classList.add("bbn-viewer");
  container.innerHTML = `
    <div class="bbn-graph-panel" id="bbn-graph">
      ${hasMarginals ? `
      <div class="bbn-graph-toolbar">
        <label class="inference-toggle">
          <input type="checkbox" id="inference-toggle-cb" />
          <span>Show Inference</span>
        </label>
      </div>` : ""}
    </div>
    <div class="bbn-detail-panel" id="bbn-detail"></div>
  `;

  const graphContainer = container.querySelector<HTMLElement>("#bbn-graph")!;
  const detailContainer = container.querySelector<HTMLElement>("#bbn-detail")!;
  const inferenceCheckbox = container.querySelector<HTMLInputElement>("#inference-toggle-cb");

  let currentSelection: Selection = null;
  let inferenceMode = false;

  const detailPanel = createDetailPanel(detailContainer, bbn);

  const graphPanel = createGraphPanel({
    container: graphContainer,
    bbn,
    onSelect: (selection) => {
      currentSelection = selection;
      detailPanel.update(selection, inferenceMode);
    },
  });

  inferenceCheckbox?.addEventListener("change", () => {
    inferenceMode = inferenceCheckbox.checked;
    graphPanel.setInferenceMode(inferenceMode);
    detailPanel.update(currentSelection, inferenceMode);
  });

  return {
    /** Programmatically select a node or edge */
    select(selection: Selection) {
      currentSelection = selection;
      graphPanel.setSelection(selection);
      detailPanel.update(selection, inferenceMode);
    },
    /** Get current selection */
    getSelection: () => currentSelection,
    /** Destroy the viewer and clean up */
    destroy() {
      graphPanel.destroy();
      detailPanel.destroy();
      container.innerHTML = "";
      container.classList.remove("bbn-viewer");
    },
  };
}

// Re-export types for library consumers
export type { BBNDefinition, BBNNode, BBNEdge, CPT, CPTRow, PriorDistribution, Selection } from "./types";
