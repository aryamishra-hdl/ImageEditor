import { useRef, useEffect } from "react";
import { useEditorContext } from "../context/EditorContextInstance";
import CanvasFrame from "./Editor/CanvasFrame";
import Toolbar from "./Editor/Toolbar";
import PropertiesPanel from "./Editor/Panels/PropertiesPanel";
import LayersPanel from "./Editor/Panels/LayersPanel";
import AdjustmentsPanel from "./Editor/Panels/AdjustmentsPanel";

const TABS = [
  { id: "properties", label: "Properties", icon: "⬡" },
  { id: "layers",     label: "Layers",     icon: "📋" },
  { id: "adjustments",label: "Adjust",     icon: "🎨" },
];

function ImageEditor() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    initCanvas, disposeCanvas,
    addImage, replaceImage, selectedObject,
    activePanel, setActivePanel,
    activeTool,
    addText, addShape,
    brushSettings, setBrushSettings,
    setBrushMode, setEraserMode,
  } = useEditorContext();

  // Initialize canvas
  useEffect(() => {
    initCanvas(canvasRef.current);
    return () => { disposeCanvas(); };
  }, [initCanvas, disposeCanvas]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (selectedObject?.type === "image") replaceImage(url);
    else addImage(url);
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
        <CanvasFrame canvasRef={canvasRef} onUpload={handleUpload} />

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
          {activePanel === "properties"  && <PropertiesPanel onReplace={() => fileInputRef.current?.click()} />}
          {activePanel === "layers"      && <LayersPanel />}
          {activePanel === "adjustments" && <AdjustmentsPanel />}
        </div>
      </div>

      {/* Hidden replace input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} hidden />
    </div>
  );
}

export default ImageEditor;
