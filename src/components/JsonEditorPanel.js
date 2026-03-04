import React, { useState, useCallback, useEffect, useRef } from "react";

export default function JsonEditorPanel({ bbn, onBbnChange }) {
  const [text, setText] = useState(JSON.stringify(bbn, null, 2));
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current && bbn) {
      setText(JSON.stringify(bbn, null, 2));
      isFirstLoad.current = false;
    }
  }, [bbn]);
  const [error, setError] = useState(null);

  const handleRender = useCallback(() => {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter JSON.");
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed.name || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        setError('JSON must have "name", "nodes" (array), and "edges" (array).');
        return;
      }
      onBbnChange(parsed);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
    }
  }, [text, onBbnChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRender();
      }
    },
    [handleRender]
  );

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <h2>BBN JSON Input</h2>
        <div className="panel-toolbar-actions">
          <button className="btn" onClick={handleRender}>
            Render
          </button>
        </div>
      </div>
      <textarea
        className="json-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="Paste your BBN JSON here..."
      />
      {error && <div className="json-error">{error}</div>}
    </div>
  );
}
