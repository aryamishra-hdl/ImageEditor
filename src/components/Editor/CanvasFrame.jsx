import { useRef, useEffect } from "react";
import { useEditorContext } from "../../context/EditorContextInstance";

const CanvasFrame = ({ canvasRef, onUpload }) => {
  const wrapperRef = useRef(null);
  const { fabricRef, undo, redo, exportCanvas, activeTool } = useEditorContext();

  // Responsive canvas sizing
  useEffect(() => {
    if (!wrapperRef.current || !fabricRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Don't resize canvas below a minimum
        if (width < 400) return;
        // Keep canvas displayed responsively via CSS transform — no need to resize Fabric canvas
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [fabricRef]);

  return (
    <div className="canvas-panel">
      {/* Top bar */}
      <div className="canvas-topbar">
        <div className="canvas-topbar-left">
          <span className="canvas-title">ProEdit Canvas</span>
          <span className={`tool-badge tool-badge--${activeTool}`}>{activeTool}</span>
        </div>

        <div className="canvas-topbar-right">
          <button className="topbar-btn" onClick={undo} title="Undo (Ctrl+Z)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <button className="topbar-btn" onClick={redo} title="Redo (Ctrl+Y)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
            </svg>
          </button>
          <div className="topbar-separator" />
          <label className="topbar-btn topbar-btn--upload" htmlFor="canvas-upload" title="Upload image">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload
          </label>
          <input id="canvas-upload" type="file" accept="image/*" onChange={onUpload} hidden />
          <button className="topbar-btn topbar-btn--export" onClick={() => exportCanvas("png")} title="Export PNG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Canvas workspace */}
      <div className="canvas-workspace" ref={wrapperRef}>
        <div className="canvas-checker">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Status bar */}
      <div className="canvas-statusbar">
        <span>920 × 580 px</span>
        <span>·</span>
        <span>Canvas</span>
      </div>
    </div>
  );
};

export default CanvasFrame;
