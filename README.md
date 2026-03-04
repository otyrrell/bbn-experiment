# bbn-experiment

POC library for visualizing Bayesian Belief Networks as an interactive two-panel UI.

**Left panel** — interactive directed graph rendered with [sigma.js](https://www.sigmajs.org/) and [graphology](https://graphology.github.io/). Nodes and edges are clickable; layout uses ForceAtlas2.

**Right panel** — detail view showing the selected node's states, conditional probability table (or prior distribution for root nodes), parent/child relationships, and metadata. Edge selection shows source/target information and strength.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

## Usage as a library

```ts
import { createBBNViewer, BBNDefinition } from "./src/bbn-viewer";

const bbn: BBNDefinition = { name: "My Network", nodes: [...], edges: [...] };
const viewer = createBBNViewer({ container: document.getElementById("app")!, bbn });

// Programmatic selection
viewer.select({ type: "node", id: "some_node" });

// Cleanup
viewer.destroy();
```

## Data model

A `BBNDefinition` contains:

- **nodes** — each with an `id`, `label`, discrete `states`, and either a prior distribution (root nodes) or a conditional probability table (`CPT`).
- **edges** — directed `source → target` relationships with optional labels and strength hints.

See `src/types.ts` for full type definitions.
