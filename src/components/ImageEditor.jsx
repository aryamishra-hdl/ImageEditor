import { useRef, useEffect, useState } from "react";
import { useEditorContext } from "../context/EditorContextInstance";
import CanvasFrame from "./Editor/CanvasFrame";
import Toolbar from "./Editor/Toolbar";
import PropertiesPanel from "./Editor/Panels/PropertiesPanel";
import LayersPanel from "./Editor/Panels/LayersPanel";
import AdjustmentsPanel from "./Editor/Panels/AdjustmentsPanel";
import ExportModal from "./Editor/Modals/ExportModal";
import ResizeModal from "./Editor/Modals/ResizeModal";

const TABS = [
  { id: "properties", label: "Properties", icon: "⬡" },
  { id: "layers",     label: "Layers",     icon: "📋" },
  { id: "adjustments",label: "Adjust",     icon: "🎨" },
];

function ImageEditor() {
  const canvasRef = useRef(null);

  const {
    initCanvas, disposeCanvas,
    addImage, replaceImage, selectedObject,
    activePanel, setActivePanel,
    activeTool,
    addText, addShape,
    brushSettings, setBrushSettings,
    setBrushMode, setEraserMode,
    exportCanvas, resizeCanvas,
    fabricRef,
  } = useEditorContext();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);

  // Initialize canvas
  useEffect(() => {
    initCanvas(canvasRef.current);
    return () => { disposeCanvas(); };
  }, [initCanvas, disposeCanvas]);

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
    <div className="pro-editor">
      {/* Left Toolbar */}
      <Toolbar
        onAddText={addText}
        onAddShape={addShape}
        fileInputRef={{ current: (url) => { addImage(url); } }}
      />

      {/* Center: Canvas */}
      <div className="pro-editor__center">
        <CanvasFrame 
          canvasRef={canvasRef} 
          onMultiUpload={handleMultiUpload}
          onReplaceUpload={handleReplace}
          onExportClick={() => setShowExportModal(true)}
          onResizeClick={() => setShowResizeModal(true)}
        />

        {/* Brush Settings bar (floating below canvas when brush active) */}
        {showBrushSettings && (
          <div className="brush-settings-bar">
            <div className="brush-setting">
              <label>Size</label>
              <input type="range" min="1" max="100" value={brushSettings.size}
                onChange={e => updateBrush("size", Number(e.target.value))} />
              <span>{brushSettings.size}px</span>
            </div>
            {activeTool === "brush" && (
              <>
                <div className="brush-setting">
                  <label>Opacity</label>
                  <input type="range" min="0" max="1" step="0.05" value={brushSettings.opacity}
                    onChange={e => updateBrush("opacity", Number(e.target.value))} />
                  <span>{Math.round(brushSettings.opacity * 100)}%</span>
                </div>
                <div className="brush-setting">
                  <label>Hardness</label>
                  <input type="range" min="0" max="100" value={brushSettings.hardness || 100}
                    onChange={e => updateBrush("hardness", Number(e.target.value))} />
                  <span>{brushSettings.hardness || 100}%</span>
                </div>
                <div className="brush-setting">
                  <label>Shape</label>
                  <select className="panel-select" style={{ width: 80 }} value={brushSettings.tipShape || "round"}
                    onChange={e => updateBrush("tipShape", e.target.value)}>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                <div className="brush-setting">
                  <label>Color</label>
                  <input type="color" value={brushSettings.color}
                    onChange={e => updateBrush("color", e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="pro-editor__right">
        {/* Tab bar */}
        <div className="panel-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`panel-tab ${activePanel === tab.id ? "panel-tab--active" : ""}`}
              onClick={() => setActivePanel(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="panel-content">
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