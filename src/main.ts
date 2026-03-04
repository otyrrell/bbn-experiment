import { createBBNViewer } from "./bbn-viewer";
import type { BBNDefinition } from "./types";
import "./styles.css";

const app = document.getElementById("app")!;

// Build the layout: JSON editor on top, viewer below
app.innerHTML = `
  <div class="json-input-panel">
    <div class="json-toolbar">
      <h2>BBN JSON Input</h2>
      <div class="json-toolbar-actions">
        <button id="load-example" title="Load example">Load Example</button>
        <button id="render-btn" title="Render the BBN from JSON">Render</button>
      </div>
    </div>
    <textarea id="json-input" spellcheck="false" placeholder="Paste your BBN JSON here..."></textarea>
    <div id="json-error" class="json-error" hidden></div>
  </div>
  <div class="viewer-panel" id="viewer-container"></div>
`;

const jsonInput = document.getElementById("json-input") as HTMLTextAreaElement;
const jsonError = document.getElementById("json-error")!;
const viewerContainer = document.getElementById("viewer-container")!;
const renderBtn = document.getElementById("render-btn")!;
const loadExampleBtn = document.getElementById("load-example")!;

let currentViewer: ReturnType<typeof createBBNViewer> | null = null;

function showError(msg: string) {
  jsonError.textContent = msg;
  jsonError.hidden = false;
}

function clearError() {
  jsonError.hidden = true;
  jsonError.textContent = "";
}

function renderBBN() {
  clearError();
  const text = jsonInput.value.trim();
  if (!text) {
    showError("Please enter JSON.");
    return;
  }

  let bbn: BBNDefinition;
  try {
    bbn = JSON.parse(text);
  } catch (e) {
    showError(`Invalid JSON: ${(e as Error).message}`);
    return;
  }

  // Basic validation
  if (!bbn.name || !Array.isArray(bbn.nodes) || !Array.isArray(bbn.edges)) {
    showError('JSON must have "name", "nodes" (array), and "edges" (array).');
    return;
  }

  // Destroy previous viewer if any
  if (currentViewer) {
    currentViewer.destroy();
    currentViewer = null;
  }

  currentViewer = createBBNViewer({ container: viewerContainer, bbn });

  // Expose to console for experimentation
  (window as any).bbnViewer = currentViewer;
  (window as any).bbnData = bbn;
}

async function loadExample() {
  try {
    const resp = await fetch(import.meta.env.BASE_URL + "example-bbn.json");
    const json = await resp.json();
    jsonInput.value = JSON.stringify(json, null, 2);
    renderBBN();
  } catch (e) {
    showError(`Failed to load example: ${(e as Error).message}`);
  }
}

renderBtn.addEventListener("click", renderBBN);
loadExampleBtn.addEventListener("click", loadExample);

// Also allow Ctrl/Cmd+Enter to render
jsonInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    renderBBN();
  }
});

// Auto-load the example on startup
loadExample();
