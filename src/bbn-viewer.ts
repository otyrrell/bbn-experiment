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
  container.classList.add("bbn-viewer");
  container.innerHTML = `
    <div class="bbn-graph-panel" id="bbn-graph"></div>
    <div class="bbn-detail-panel" id="bbn-detail"></div>
  `;

  const graphContainer = container.querySelector<HTMLElement>("#bbn-graph")!;
  const detailContainer = container.querySelector<HTMLElement>("#bbn-detail")!;

  let currentSelection: Selection = null;

  const detailPanel = createDetailPanel(detailContainer, bbn);

  const graphPanel = createGraphPanel({
    container: graphContainer,
    bbn,
    onSelect: (selection) => {
      currentSelection = selection;
      detailPanel.update(selection);
    },
  });

  return {
    /** Programmatically select a node or edge */
    select(selection: Selection) {
      currentSelection = selection;
      graphPanel.setSelection(selection);
      detailPanel.update(selection);
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
