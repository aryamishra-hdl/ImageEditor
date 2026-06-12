import { useRef, useEffect, useState } from "react";
import { useEditorContext } from "../context/EditorContextInstance";
import CanvasFrame from "./Editor/CanvasFrame";
import Toolbar from "./Editor/Toolbar";
import PropertiesPanel from "./Editor/Panels/PropertiesPanel";
import LayersPanel from "./Editor/Panels/LayersPanel";
import AdjustmentsPanel from "./Editor/Panels/AdjustmentsPanel";
import ExportModal from "./Editor/Modals/ExportModal";
import ResizeModal from "./Editor/Modals/ResizeModal";
import { FiSettings, FiLayers, FiSliders } from "react-icons/fi";

const TABS = [
  { id: "properties", label: "Properties", icon: <FiSettings className="w-4 h-4" /> },
  { id: "layers",     label: "Layers",     icon: <FiLayers className="w-4 h-4" /> },
  { id: "adjustments",label: "Adjust",     icon: <FiSliders className="w-4 h-4" /> },
];

function ImageEditor() {
  const canvasRef = useRef(null);

  const {
    initCanvas, disposeCanvas,
    addImage, replaceImage,
    activePanel, setActivePanel,
    activeTool,
    addText, addShape,
    brushSettings, setBrushSettings,
    setBrushMode, setEraserMode,
    exportCanvas, resizeCanvas,
    fabricRef,
    setSelectMode,
  } = useEditorContext();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);

  // Initialize canvas
  useEffect(() => {
    initCanvas(canvasRef.current);
    return () => { disposeCanvas(); };
  }, [initCanvas, disposeCanvas]);

  // Update CSS custom property for range slider fill progress
  useEffect(() => {
    const setProgress = (el) => {
      const min = parseFloat(el.min) || 0;
      const max = parseFloat(el.max) || 100;
      const val = parseFloat(el.value);
      const pct = ((val - min) / (max - min)) * 100;
      el.style.setProperty("--range-progress", `${pct}%`);
    };
    const handler = (e) => {
      if (e.target.type === "range") setProgress(e.target);
    };
    document.addEventListener("input", handler);
    document.querySelectorAll('input[type="range"]').forEach(setProgress);
    return () => document.removeEventListener("input", handler);
  }, []);

  // Convert a File to a base64 data URL — permanent, never expires,
  // and survives history serialization (blob: URLs die after revokeObjectURL)
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });

  const handleMultiUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        addImage(dataUrl);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }
    e.target.value = "";
    setSelectMode();
  };

  const replaceFileInputRef = useRef(null);

  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      replaceImage(dataUrl);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
    e.target.value = "";
    setSelectMode();
  };

  // Brush settings panel (shown when brush/eraser active)
  const showBrushSettings = activeTool === "brush" || activeTool === "eraser";

  const updateBrush = (field, value) => {
    const next = { ...brushSettings, [field]: value };
    setBrushSettings(next);
    if (activeTool === "brush") setBrushMode(next);
    else if (activeTool === "eraser") setEraserMode({ size: next.size });
  };

  return (
    <div className="grid grid-cols-editor w-screen h-screen bg-[#f3f4f6] overflow-hidden select-none">
      {/* Left Toolbar */}
      <Toolbar
        onAddText={addText}
        onAddShape={addShape}
        fileInputRef={{ current: (url) => { addImage(url); } }}
      />

      {/* Center: Canvas */}
      <div className="flex flex-col overflow-hidden bg-[#f3f4f6] col-start-2 border-r border-[#e5e7eb]">
        <CanvasFrame 
          canvasRef={canvasRef} 
          onMultiUpload={handleMultiUpload}
          onReplaceUpload={handleReplace}
          onExportClick={() => setShowExportModal(true)}
          onResizeClick={() => setShowResizeModal(true)}
        />

        {/* Brush Settings bar (floating below canvas when brush active) */}
        {showBrushSettings && (
          <div className="flex items-center gap-6 px-6 py-3 bg-white border-t border-[#e5e7eb] animate-slideUp shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-[#4b5563]">
              <label className="whitespace-nowrap font-semibold">Size</label>
              <input type="range" min="1" max="100" value={brushSettings.size} className="w-[110px]"
                onChange={e => updateBrush("size", Number(e.target.value))}
                style={{ '--range-progress': `${((brushSettings.size - 1) / (100 - 1)) * 100}%` }} />
              <span className="text-[#111827] font-mono min-w-[36px] text-xs font-medium">{brushSettings.size}px</span>
            </div>
            {activeTool === "brush" && (
              <>
                <div className="flex items-center gap-2.5 text-xs text-[#4b5563]">
                  <label className="whitespace-nowrap font-semibold">Opacity</label>
                  <input type="range" min="0" max="1" step="0.05" value={brushSettings.opacity} className="w-[110px]"
                    onChange={e => updateBrush("opacity", Number(e.target.value))}
                    style={{ '--range-progress': `${brushSettings.opacity * 100}%` }} />
                  <span className="text-[#111827] font-mono min-w-[36px] text-xs font-medium">{Math.round(brushSettings.opacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#4b5563]">
                  <label className="whitespace-nowrap font-semibold">Hardness</label>
                  <input type="range" min="0" max="100" value={brushSettings.hardness || 100} className="w-[110px]"
                    onChange={e => updateBrush("hardness", Number(e.target.value))}
                    style={{ '--range-progress': `${(brushSettings.hardness || 100)}%` }} />
                  <span className="text-[#111827] font-mono min-w-[36px] text-xs font-medium">{brushSettings.hardness || 100}%</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#4b5563]">
                  <label className="whitespace-nowrap font-semibold">Shape</label>
                  <select className="bg-white border border-[#e5e7eb] rounded-lg text-[#111827] px-2.5 py-1 outline-none text-xs font-medium focus:border-[#0070f3] cursor-pointer" value={brushSettings.tipShape || "round"}
                    onChange={e => updateBrush("tipShape", e.target.value)}>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#4b5563]">
                  <label className="whitespace-nowrap font-semibold">Color</label>
                  <input type="color" value={brushSettings.color} className="w-6 h-6 border border-[#e5e7eb] rounded-md p-0 cursor-pointer bg-transparent"
                    onChange={e => updateBrush("color", e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="bg-white flex flex-col overflow-hidden col-start-3 shadow-sm">
        {/* Tab bar */}
        <div className="flex border-b border-[#e5e7eb] shrink-0 bg-[#f9fafb]">
          {TABS.map(tab => {
            const isTabActive = activePanel === tab.id;
            return (
              <button
                key={tab.id}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                  isTabActive 
                    ? "text-[#0070f3] border-[#0070f3] bg-white shadow-sm" 
                    : "text-[#6b7280] border-transparent hover:text-[#374151] hover:bg-[#f3f4f6]"
                }`}
                onClick={() => setActivePanel(tab.id)}
              >
                {tab.icon}
                <span className="mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {activePanel === "properties"  && <PropertiesPanel onReplace={() => replaceFileInputRef.current?.click()} />}
          {activePanel === "layers"      && <LayersPanel />}
          {activePanel === "adjustments" && <AdjustmentsPanel />}
        </div>
      </div>

      {showExportModal && (
        <ExportModal 
          onClose={() => setShowExportModal(false)} 
          onExport={exportCanvas} 
        />
      )}

      {showResizeModal && (
        <ResizeModal 
          fabricRef={fabricRef}
          onClose={() => setShowResizeModal(false)} 
          onResize={resizeCanvas} 
        />
      )}

      {/* Hidden replace-image input triggered from PropertiesPanel */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplace}
        hidden
      />
    </div>
  );
}

export default ImageEditor;