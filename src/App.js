import React, { useState, useCallback, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import GraphPanel from "./components/GraphPanel";
import DetailPanel from "./components/DetailPanel";
import "./App.css";

export default function App() {
  const [bbn, setBbn] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    // If BBN data is embedded in the page (static export), use it directly
    if (window.__BBN_DATA__) {
      setBbn(window.__BBN_DATA__);
      return;
    }
    // Otherwise fetch the example file (dev mode)
    fetch(process.env.PUBLIC_URL + "/example-bbn.json")
      .then((r) => r.json())
      .then(setBbn)
      .catch((e) => console.error("Failed to load example BBN:", e));
  }, []);

  const handleSelect = useCallback((sel) => {
    setSelection(sel);
  }, []);

  if (!bbn) {
    return (
      <div className="app">
        <div className="loading">Loading example BBN...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>BBN Experiment</h1>
        <span className="subtitle">Bayesian Belief Network Explorer</span>
      </header>
      <div className="app-body">
        <PanelGroup direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={60} minSize={30} id="graph-panel">
            <GraphPanel
              bbn={bbn}
              selection={selection}
              onSelect={handleSelect}
            />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={40} minSize={20} id="detail-panel">
            <DetailPanel selection={selection} bbn={bbn} onSelect={handleSelect} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
