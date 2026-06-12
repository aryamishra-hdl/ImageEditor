import { useRef, useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useEditorContext } from "../../context/EditorContextInstance";
import { 
  LuUndo2, 
  LuRedo2, 
  LuUpload, 
  LuScaling, 
  LuDownload, 
  LuRefreshCw, 
  LuCheck, 
  LuX 
} from "react-icons/lu";

const CanvasFrame = ({ canvasRef, onMultiUpload, onReplaceUpload, onExportClick, onResizeClick }) => {
  const wrapperRef = useRef(null);
  const uploadInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  const { fabricRef, undo, redo, activeTool, isCropping, applyCrop, cancelCrop, selectedObject } = useEditorContext();

  const hasImage = selectedObject?.type === "image";

  // ── Subscribe to external Fabric canvas state (handles StrictMode double-mount safely) ──
  const canvasW = useSyncExternalStore(
    useCallback((cb) => { const c = fabricRef.current; if (!c) return () => {}; c.on("canvas:resized", cb); return () => c.off("canvas:resized", cb); }, [fabricRef]),
    useCallback(() => fabricRef.current?.width ?? 0, [fabricRef]),
  );
  const canvasH = useSyncExternalStore(
    useCallback((cb) => { const c = fabricRef.current; if (!c) return () => {}; c.on("canvas:resized", cb); return () => c.off("canvas:resized", cb); }, [fabricRef]),
    useCallback(() => fabricRef.current?.height ?? 0, [fabricRef]),
  );
  const hasLayers = useSyncExternalStore(
    useCallback((cb) => { const c = fabricRef.current; if (!c) return () => {}; c.on("object:added", cb); c.on("object:removed", cb); return () => { c.off("object:added", cb); c.off("object:removed", cb); }; }, [fabricRef]),
    useCallback(() => { const c = fabricRef.current; return c ? c.getObjects().length > 0 : false; }, [fabricRef]),
  );

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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f9fafb]">
      {/* Top bar - high visual quality, matching the layout in the screenshots */}
      <div className="flex items-center justify-between px-6 h-14 bg-white border-b border-[#e5e7eb] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-[#111827]">ProEdit Canvas</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
            {activeTool || "select"}
          </span>
        </div>

        {/* Center/Right controls */}
        <div className="flex items-center gap-2">
          {/* Undo Button */}
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-all" 
            onClick={undo} 
            title="Undo (Ctrl+Z)"
          >
            <LuUndo2 className="w-4.5 h-4.5" />
          </button>
          
          {/* Redo Button */}
          <button 
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-all" 
            onClick={redo} 
            title="Redo (Ctrl+Y)"
          >
            <LuRedo2 className="w-4.5 h-4.5" />
          </button>
          
          <div className="w-px h-5 bg-[#e5e7eb] mx-1" />

          {/* Upload dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] text-xs font-semibold transition-all border border-[#e5e7eb] bg-white shadow-sm"
              onClick={handleUploadMenuClick}
              title="Upload options"
            >
              <LuUpload className="w-4 h-4 text-[#4b5563]" />
              <span>Upload</span>
              <span className="text-[10px] text-[#9ca3af]">▼</span>
            </button>
            {showUploadMenu && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-white border border-[#e5e7eb] rounded-lg shadow-lg min-w-[170px] z-[200] overflow-hidden py-1 animate-fadeIn" onClick={e => e.stopPropagation()}>
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] transition-all text-left font-medium"
                  onClick={() => { setShowUploadMenu(false); uploadInputRef.current?.click(); }}
                >
                  <LuUpload className="w-4 h-4" />
                  Upload Image(s)
                </button>
                <button
                  className={`flex items-center gap-2 w-full px-4 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] transition-all text-left font-medium ${!hasImage ? "opacity-40 cursor-not-allowed" : ""}`}
                  disabled={!hasImage}
                  onClick={() => { if (hasImage) { setShowUploadMenu(false); replaceInputRef.current?.click(); } }}
                >
                  <LuRefreshCw className="w-4 h-4" />
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

          {/* Resize button */}
          <button 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-[#0070f3] text-white hover:bg-[#0060d3] shadow-sm shadow-blue-500/10" 
            onClick={onResizeClick} 
            title="Resize Canvas"
          >
            <LuScaling className="w-4 h-4" />
            <span>Resize</span>
          </button>

          {/* Export button */}
          <button 
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasLayers
                ? "bg-[#0070f3] text-white hover:bg-[#0060d3] shadow-sm shadow-blue-500/10 cursor-pointer"
                : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
            }`}
            onClick={hasLayers ? onExportClick : undefined} 
            title={hasLayers ? "Export Image" : "No layers to export"}
          >
            <LuDownload className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Canvas workspace - checker background */}
      <div 
        className="flex-1 overflow-auto canvas-workspace relative p-6 flex justify-start items-start" 
        ref={wrapperRef}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl border border-[#e5e7eb] canvas-checker shrink-0" style={{ margin: '0 auto', display: 'inline-block' }}>
          <canvas ref={canvasRef} className="block" />
        </div>

        {/* Crop overlay bottom bar */}
        {isCropping && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 bg-white/90 backdrop-blur border border-[#e5e7eb] rounded-xl shadow-xl z-50">
            <span className="text-xs text-[#4b5563] font-medium">
              {activeTool === "lasso" ? "Draw selection on canvas, then release" : "Drag the region, then confirm"}
            </span>
            {activeTool !== "lasso" && (
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] shadow-sm transition-all" onClick={applyCrop}>
                  <LuCheck className="w-4.5 h-4.5" />
                  <span>Apply</span>
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#ef4444] hover:bg-[#dc2626] shadow-sm transition-all" onClick={cancelCrop}>
                  <LuX className="w-4.5 h-4.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
            {activeTool === "lasso" && (
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#ef4444] hover:bg-[#dc2626] shadow-sm transition-all" onClick={() => {
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
      <div className="flex items-center gap-2 px-6 h-8 bg-white border-t border-[#e5e7eb] text-xs text-[#6b7280] font-medium shrink-0">
        <span>{canvasW > 0 ? `${canvasW} × ${canvasH} px` : ""}</span>
        <span>·</span>
        <span>Canvas</span>
      </div>
    </div>
  );
};

export default CanvasFrame;