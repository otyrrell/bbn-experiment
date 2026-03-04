import React from "react";

export default function JsonExamplePanel({ data }) {
  return (
    <div className="panel">
      <div className="panel-title">JSON Example</div>
      <div className="panel-content">
        <pre
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#c8d6e5",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
