import { useRef, useEffect, useState } from "react";
import { useEditorContext } from "../../context/EditorContextInstance";

const CanvasFrame = ({ canvasRef, onMultiUpload, onReplaceUpload, onExportClick, onResizeClick }) => {
  const wrapperRef = useRef(null);
  const uploadInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const { fabricRef, undo, redo, activeTool, isCropping, applyCrop, cancelCrop, selectedObject } = useEditorContext();

  const hasImage = selectedObject?.type === "image";

  // Track canvas dimensions for status bar — re-reads after resize
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const update = () => setCanvasSize({ w: canvas.width, h: canvas.height });
    update();
    // Fabric fires no built-in resize event; poll via a custom event we'll fire from resizeCanvas
    canvas.on("canvas:resized", update);
    return () => canvas.off("canvas:resized", update);
  }, [fabricRef]);

  // Close upload menu on outside click
  useEffect(() => {
    if (!showUploadMenu) return;
    const close = () => setShowUploadMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showUploadMenu]);

  const handleUploadMenuClick = (e) => {
    e.stopPropagation();
    setShowUploadMenu(v => !v);
  };

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

          {/* Upload dropdown */}
          <div className="upload-dropdown-wrapper">
            <button
              className="topbar-btn topbar-btn--upload"
              onClick={handleUploadMenuClick}
              title="Upload options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload ▾
            </button>
            {showUploadMenu && (
              <div className="upload-dropdown-menu" onClick={e => e.stopPropagation()}>
                <button
                  className="upload-menu-item"
                  onClick={() => { setShowUploadMenu(false); uploadInputRef.current?.click(); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Image(s)
                </button>
                <button
                  className={`upload-menu-item ${!hasImage ? "upload-menu-item--disabled" : ""}`}
                  disabled={!hasImage}
                  onClick={() => { if (hasImage) { setShowUploadMenu(false); replaceInputRef.current?.click(); } }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Replace Selected
                </button>
              </div>
            )}
            {/* Hidden inputs */}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onMultiUpload}
              hidden
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              onChange={onReplaceUpload}
              hidden
            />
          </div>

          <button className="topbar-btn topbar-btn--export" onClick={onResizeClick} title="Resize Canvas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Resize
          </button>
          <button className="topbar-btn topbar-btn--export" onClick={onExportClick} title="Export Image">
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
        <div className="canvas-centerer">
          <div className="canvas-centerer-inner">
            <div className="canvas-checker">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Crop / Lasso confirmation bar — clearly visible overlay at bottom of canvas */}
        {isCropping && (
          <div className="crop-confirm-bar">
            <span className="crop-confirm-label">
              {activeTool === "lasso" ? "Draw selection on canvas, then release" : "Drag the region, then confirm"}
            </span>
            {activeTool !== "lasso" && (
              <>
                <button className="crop-confirm-btn crop-confirm-btn--apply" onClick={applyCrop}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Apply Crop
                </button>
                <button className="crop-confirm-btn crop-confirm-btn--cancel" onClick={cancelCrop}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancel
                </button>
              </>
            )}
            {activeTool === "lasso" && (
              <button className="crop-confirm-btn crop-confirm-btn--cancel" onClick={() => {
                if (fabricRef.current) {
                  fabricRef.current.isDrawingMode = false;
                  fabricRef.current.selection = true;
                }
                cancelCrop();
              }}>
                Cancel Lasso
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="canvas-statusbar">
        <span>{canvasSize.w > 0 ? `${canvasSize.w} × ${canvasSize.h} px` : "Loading..."}</span>
        <span>·</span>
        <span>Canvas</span>
      </div>
    </div>
  );
};

export default CanvasFrame;