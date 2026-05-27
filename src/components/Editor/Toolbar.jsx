import { useEditorContext } from "../../context/EditorContextInstance";

const tools = [
  { id: "select", icon: "⬡", label: "Select (V)" },
  { id: "pan", icon: "🖐", label: "Pan (H)" },
  { id: "crop", icon: "✂️", label: "Crop (C)" },
  { id: "brush", icon: "🖌️", label: "Brush (B)" },
  { id: "eraser", icon: "◻", label: "Eraser (E)" },
  { id: "text", icon: "T", label: "Text (T)" },
  { id: "shape", icon: "⬛", label: "Shape (S)" },
  { id: "lasso", icon: "➿", label: "Lasso (L)" },
  { id: "polygon", icon: "⬠", label: "Polygon (P)" },
  { id: "arrow", icon: "↗", label: "Arrow (A)" },
];

const Toolbar = ({ onAddText, onAddShape }) => {
  const {
    activeTool,
    setActiveTool,
    setSelectMode,
    setPanMode,
    setBrushMode,
    setEraserMode,
    startCropMode,
    startLassoMode,
    setPolygonMode,
    setArrowMode,
    brushSettings,
    fabricRef,
  } = useEditorContext();

  const handleTool = (tool) => {
    switch (tool) {
      case "select":
        setSelectMode();
        break;
      case "pan":
        setPanMode();
        break;
      case "brush":
        setBrushMode(brushSettings);
        break;
      case "eraser":
        setEraserMode({ size: brushSettings.size });
        break;
      case "text":
        setSelectMode();
        onAddText?.();
        return;
      case "shape":
        setSelectMode();
        break;
      case "crop":
        startCropMode();
        break;
      case "lasso":
        startLassoMode();
        break;
      case "polygon":
        setPolygonMode();
        break;
      case "arrow":
        setArrowMode();
        break;
      default:
        setSelectMode();
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
              <stop stopColor="#7c3aed" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <text x="7" y="17" fontSize="12" fill="white" fontWeight="bold">
            P
          </text>
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
          {["rect", "circle", "triangle", "line"].map((s) => (
            <button
              key={s}
              className="toolbar-sub-btn"
              onClick={() => onAddShape?.(s)}
              title={s}
            >
              {s === "rect"
                ? "▬"
                : s === "circle"
                  ? "●"
                  : s === "triangle"
                    ? "▲"
                    : "—"}
            </button>
          ))}
        </div>
      )}

      {/* Polygon mode hint & finish button */}
      {activeTool === "polygon" && (
        <div
          className="toolbar-sub"
          style={{ flexDirection: "column", gap: "8px", padding: "8px" }}
        >
          <div style={{ fontSize: "12px", color: "#999", textAlign: "center" }}>
            Click to add points
            <br />
            Click near start to close
            <br />
            or press Enter/Esc
          </div>
          <button
            className="toolbar-sub-btn"
            onClick={() => fabricRef.current?.finishPolygon?.()}
            title="Finish polygon"
            style={{ width: "100%" }}
          >
            ✓ Finish
          </button>
        </div>
      )}

      <div className="toolbar-bottom">
        {/* Upload via toolbar is handled by the top bar dropdown — nothing needed here */}
      </div>
    </div>
  );
};

export default Toolbar;
