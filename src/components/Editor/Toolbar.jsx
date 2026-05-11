import { useEditorContext } from "../../context/EditorContextInstance";

const tools = [
  { id: "select",   icon: "⬡", label: "Select (V)" },
  { id: "crop",     icon: "✂️",  label: "Crop (C)" },
  { id: "brush",    icon: "🖌️", label: "Brush (B)" },
  { id: "eraser",   icon: "◻",  label: "Eraser (E)" },
  { id: "text",     icon: "T",  label: "Text (T)" },
  { id: "shape",    icon: "⬛", label: "Shape (S)" },
];

const Toolbar = ({ onAddText, onAddShape, fileInputRef }) => {
  const {
    activeTool, setActiveTool, isCropping,
    setSelectMode, setBrushMode, setEraserMode, startCropMode, applyCrop, cancelCrop,
    brushSettings,
  } = useEditorContext();

  const handleTool = (tool) => {
    switch (tool) {
      case "select": setSelectMode(); break;
      case "brush":  setBrushMode(brushSettings); break;
      case "eraser": setEraserMode({ size: brushSettings.size }); break;
      case "text":   setSelectMode(); onAddText?.(); return;
      case "shape":  setSelectMode(); break;
      case "crop":   startCropMode(); break;
      default:       setSelectMode();
    }
    setActiveTool(tool);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#g)" />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <text x="7" y="17" fontSize="12" fill="white" fontWeight="bold">P</text>
        </svg>
      </div>

      <div className="toolbar-tools">
        {tools.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`toolbar-btn ${activeTool === id ? "active" : ""}`}
            onClick={() => handleTool(id)}
            title={label}
          >
            <span className="toolbar-icon">{icon}</span>
          </button>
        ))}
      </div>

      {/* Shape sub-tools shown when shape is active */}
      {activeTool === "shape" && (
        <div className="toolbar-sub">
          {["rect", "circle", "triangle", "line"].map(s => (
            <button key={s} className="toolbar-sub-btn" onClick={() => onAddShape?.(s)} title={s}>
              {s === "rect" ? "▬" : s === "circle" ? "●" : s === "triangle" ? "▲" : "—"}
            </button>
          ))}
        </div>
      )}

      <div className="toolbar-bottom">
        <label className="toolbar-btn" title="Upload image" htmlFor="toolbar-upload">
          <span className="toolbar-icon">⊕</span>
          <input id="toolbar-upload" type="file" accept="image/*" onChange={e => {
            const f = e.target.files?.[0];
            if (f) fileInputRef?.current?.(URL.createObjectURL(f));
            e.target.value = "";
          }} hidden />
        </label>
      </div>

      {/* Crop Controls */}
      {isCropping && (
        <div className="toolbar-bottom" style={{ borderTop: "none", paddingTop: 4 }}>
          <button className="toolbar-btn" style={{ color: "#22c55e" }} onClick={applyCrop} title="Apply Crop">
            <span className="toolbar-icon">✓</span>
          </button>
          <button className="toolbar-btn" style={{ color: "#ef4444" }} onClick={cancelCrop} title="Cancel Crop">
            <span className="toolbar-icon">✕</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
