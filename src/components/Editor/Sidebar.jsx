import { FONTS } from "../../utils/imageHelpers";

const Sidebar = ({
  selectedObject,
  objectState,
  effects,
  onObjectChange,
  onEffectChange,
  onReplace,
  onRetouch,
  onDelete,
  onReset,
  onAlign,
  onChangeOrder,
}) => {
  if (!selectedObject) {
    return (
      <div className="editor-sidebar empty">
        <div className="sidebar-empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>Select an object to edit its properties</p>
        </div>
      </div>
    );
  }

  const isImage = selectedObject.type === "image";
  const isText = selectedObject.type === "textbox" || selectedObject.type === "text";

  return (
    <div className="editor-sidebar">
      <div className="sidebar-section">
        <h3>Transform</h3>
        <div className="grid-2">
          <div className="input-group">
            <label>Position X</label>
            <input
              type="number"
              value={objectState.x}
              onChange={(e) => onObjectChange("x", parseInt(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Position Y</label>
            <input
              type="number"
              value={objectState.y}
              onChange={(e) => onObjectChange("y", parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label>Scale X</label>
            <input
              type="number"
              step="0.1"
              value={objectState.scaleX}
              onChange={(e) => onObjectChange("scaleX", parseFloat(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Scale Y</label>
            <input
              type="number"
              step="0.1"
              value={objectState.scaleY}
              onChange={(e) => onObjectChange("scaleY", parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Rotation</label>
          <input
            type="range"
            min="0"
            max="360"
            value={objectState.angle}
            onChange={(e) => onObjectChange("angle", parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Appearance</h3>
        
        {isText && (
          <div className="input-group full-width">
            <label>Font Family</label>
            <select
              value={objectState.fontFamily || "Inter"}
              onChange={(e) => onObjectChange("fontFamily", e.target.value)}
              style={{ fontFamily: objectState.fontFamily || "Inter" }}
            >
              {FONTS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isImage && (
          <div className="input-group color-input-group">
            <label>Fill Color</label>
            <div className="color-picker-wrapper">
              <input
                type="color"
                value={objectState.fill || "#5366ff"}
                onChange={(e) => onObjectChange("fill", e.target.value)}
              />
              <span>{objectState.fill || "#5366ff"}</span>
            </div>
          </div>
        )}

        <div className="input-group">
          <label>Opacity ({(objectState.opacity * 100).toFixed(0)}%)</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={objectState.opacity ?? 1}
            onChange={(e) => onObjectChange("opacity", parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Layering & Alignment</h3>
        <div className="button-row">
          <button className="button button-sm" onClick={() => onAlign("center")}>
            Center H
          </button>
          <button className="button button-sm" onClick={() => onAlign("middle")}>
            Center V
          </button>
        </div>
        <div className="button-row">
          <button className="button button-sm" onClick={() => onChangeOrder("front")}>
            Bring to Front
          </button>
          <button className="button button-sm" onClick={() => onChangeOrder("back")}>
            Send to Back
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Effects</h3>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={effects.shadow}
              onChange={(e) => onEffectChange("shadow", e.target.checked)}
            />
            Drop Shadow
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={effects.outline}
              onChange={(e) => onEffectChange("outline", e.target.checked)}
            />
            {isText ? "Text Stroke" : "Object Outline"}
          </label>
        </div>
        
        <div className="input-group">
          <label>Blend Mode</label>
          <select
            value={effects.blendMode}
            onChange={(e) => onEffectChange("blendMode", e.target.value)}
          >
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
          </select>
        </div>
      </div>

      {isImage && (
        <div className="sidebar-section">
          <h3>Filters</h3>
          <div className="input-group">
            <label>Brightness ({effects.brightness})</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.brightness}
              onChange={(e) => onEffectChange("brightness", parseInt(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Contrast ({effects.contrast})</label>
            <input
              type="range"
              min="-100"
              max="100"
              value={effects.contrast}
              onChange={(e) => onEffectChange("contrast", parseInt(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Blur ({effects.blur})</label>
            <input
              type="range"
              min="0"
              max="100"
              value={effects.blur}
              onChange={(e) => onEffectChange("blur", parseInt(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label>Color Filter</label>
            <select
              value={effects.filter}
              onChange={(e) => onEffectChange("filter", e.target.value)}
            >
              <option value="none">None</option>
              <option value="grayscale">Grayscale</option>
              <option value="sepia">Sepia</option>
              <option value="invert">Invert</option>
            </select>
          </div>
          <button className="button button-block button-outline" onClick={onRetouch}>
            Auto Retouch
          </button>
        </div>
      )}

      <div className="sidebar-actions">
        {isImage && (
          <button className="button button-block" onClick={onReplace}>
            Replace Image
          </button>
        )}
        <button className="button button-block button-outline" onClick={onReset}>
          Reset Defaults
        </button>
        <button className="button button-block button-danger" onClick={onDelete}>
          Delete Object
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
