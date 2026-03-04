import React, { useState, useCallback, useEffect } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import JsonEditorPanel from "./components/JsonEditorPanel";
import GraphPanel from "./components/GraphPanel";
import DetailPanel from "./components/DetailPanel";
import "./App.css";

export default function App() {
  const [bbn, setBbn] = useState(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/example-bbn.json")
      .then((r) => r.json())
      .then(setBbn)
      .catch((e) => console.error("Failed to load example BBN:", e));
  }, []);

  const handleBbnChange = useCallback((newBbn) => {
    setBbn(newBbn);
    setSelection(null);
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
          <Panel defaultSize={25} minSize={15} id="json-panel">
            <JsonEditorPanel bbn={bbn} onBbnChange={handleBbnChange} />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={45} minSize={20} id="graph-panel">
            <GraphPanel
              bbn={bbn}
              selection={selection}
              onSelect={handleSelect}
            />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={30} minSize={15} id="detail-panel">
            <DetailPanel selection={selection} bbn={bbn} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
