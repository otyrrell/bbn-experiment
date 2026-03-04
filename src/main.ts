import { createBBNViewer } from "./bbn-viewer";
import { wetGrassBBN } from "./example-bbn";
import "./styles.css";

const app = document.getElementById("app")!;
const viewer = createBBNViewer({ container: app, bbn: wetGrassBBN });

// Expose to console for experimentation
(window as any).bbnViewer = viewer;
(window as any).bbnData = wetGrassBBN;
