import React, { useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import JsonExamplePanel from "./components/JsonExamplePanel";
import GraphPanel from "./components/GraphPanel";
import DetailViewPanel from "./components/DetailViewPanel";
import "./App.css";

const sampleData = {
  nodes: [
    { id: "A", label: "Rain", value: 0.7 },
    { id: "B", label: "Sprinkler", value: 0.4 },
    { id: "C", label: "Wet Grass", value: 0.9 },
    { id: "D", label: "Slippery Road", value: 0.6 },
  ],
  edges: [
    { from: "A", to: "B", weight: 0.3 },
    { from: "A", to: "C", weight: 0.8 },
    { from: "B", to: "C", weight: 0.9 },
    { from: "A", to: "D", weight: 0.7 },
  ],
};

export default function App() {
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeSelect = (nodeId) => {
    const node = sampleData.nodes.find((n) => n.id === nodeId);
    const incomingEdges = sampleData.edges.filter((e) => e.to === nodeId);
    const outgoingEdges = sampleData.edges.filter((e) => e.from === nodeId);
    setSelectedNode(node ? { ...node, incomingEdges, outgoingEdges } : null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>BBN Experiment</h1>
        <span className="subtitle">Bayesian Belief Network Explorer</span>
      </header>
      <div className="app-body">
        <Group direction="horizontal" autoSaveId="main-layout">
          <Panel defaultSize={30} minSize={15} id="json-panel">
            <JsonExamplePanel data={sampleData} />
          </Panel>
          <Separator className="resize-handle" />
          <Panel defaultSize={40} minSize={20} id="graph-panel">
            <GraphPanel
              data={sampleData}
              selectedNodeId={selectedNode?.id}
              onNodeSelect={handleNodeSelect}
            />
          </Panel>
          <Separator className="resize-handle" />
          <Panel defaultSize={30} minSize={15} id="detail-panel">
            <DetailViewPanel
              node={selectedNode}
              allNodes={sampleData.nodes}
            />
          </Panel>
        </Group>
      </div>
    </div>
  );
}
