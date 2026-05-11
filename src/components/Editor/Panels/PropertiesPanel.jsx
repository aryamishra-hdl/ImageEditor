import { useEditorContext } from "../../../context/EditorContextInstance";
import { FONTS } from "../../../utils/imageHelpers";

const PropertiesPanel = ({ onReplace }) => {
  const {
    selectedObject, objectState, setObjectState,
    fabricRef, saveHistory, flipSelected, rotateSelected,
    alignToCanvas, changeOrder, deleteSelected,
  } = useEditorContext();

  if (!selectedObject) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">⬡</div>
        <p>Select an object to see properties</p>
      </div>
    );
  }

  const isImage = selectedObject.type === "image";
  const isText = selectedObject.type === "textbox" || selectedObject.type === "text";

  const applyProp = (field, value) => {
    setObjectState(prev => ({ ...prev, [field]: value }));
    selectedObject.set(field === "x" ? "left" : field === "y" ? "top" : field, value);
    selectedObject.setCoords();
    fabricRef.current?.requestRenderAll();
    setTimeout(saveHistory, 80);
  };

  return (
    <div className="panel-scroll">
      {/* Transform */}
      <div className="panel-section">
        <h4 className="panel-section-title">Transform</h4>
        <div className="prop-grid-2">
          <div className="prop-field">
            <label className="prop-label">X</label>
            <input type="number" className="prop-input" value={objectState.x}
              onChange={e => applyProp("x", parseInt(e.target.value) || 0)} />
          </div>
          <div className="prop-field">
            <label className="prop-label">Y</label>
            <input type="number" className="prop-input" value={objectState.y}
              onChange={e => applyProp("y", parseInt(e.target.value) || 0)} />
          </div>
          <div className="prop-field">
            <label className="prop-label">W</label>
            <input type="number" className="prop-input" value={objectState.width || 0} readOnly />
          </div>
          <div className="prop-field">
            <label className="prop-label">H</label>
            <input type="number" className="prop-input" value={objectState.height || 0} readOnly />
          </div>
        </div>
        <div className="adj-row">
          <div className="adj-label-row">
            <span className="adj-label">Rotation</span>
            <span className="adj-value">{objectState.angle}°</span>
          </div>
          <input type="range" className="adj-slider" min="0" max="360" value={objectState.angle}
            onChange={e => applyProp("angle", parseInt(e.target.value))} />
        </div>
        <div className="adj-row">
          <div className="adj-label-row">
            <span className="adj-label">Opacity</span>
            <span className="adj-value">{Math.round(objectState.opacity * 100)}%</span>
          </div>
          <input type="range" className="adj-slider" min="0" max="1" step="0.01" value={objectState.opacity}
            onChange={e => applyProp("opacity", parseFloat(e.target.value))} />
        </div>
      </div>

      {/* Quick Transforms */}
      <div className="panel-section">
        <h4 className="panel-section-title">Quick Actions</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => rotateSelected(-90)}>↺ 90°</button>
          <button className="panel-btn" onClick={() => rotateSelected(90)}>↻ 90°</button>
          <button className="panel-btn" onClick={() => flipSelected("x")}>↔ Flip H</button>
          <button className="panel-btn" onClick={() => flipSelected("y")}>↕ Flip V</button>
        </div>
      </div>

      {/* Alignment */}
      <div className="panel-section">
        <h4 className="panel-section-title">Align to Canvas</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => alignToCanvas("left")}>⬅</button>
          <button className="panel-btn" onClick={() => alignToCanvas("center")}>⬌ Center</button>
          <button className="panel-btn" onClick={() => alignToCanvas("right")}>➡</button>
          <button className="panel-btn" onClick={() => alignToCanvas("top")}>⬆</button>
          <button className="panel-btn" onClick={() => alignToCanvas("middle")}>⬍ Middle</button>
          <button className="panel-btn" onClick={() => alignToCanvas("bottom")}>⬇</button>
        </div>
      </div>

      {/* Layer Order */}
      <div className="panel-section">
        <h4 className="panel-section-title">Layer Order</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => changeOrder("front")}>Bring Front</button>
          <button className="panel-btn" onClick={() => changeOrder("back")}>Send Back</button>
          <button className="panel-btn" onClick={() => changeOrder("forward")}>Forward</button>
          <button className="panel-btn" onClick={() => changeOrder("backward")}>Backward</button>
        </div>
      </div>

      {/* Appearance */}
      {!isImage && (
        <div className="panel-section">
          <h4 className="panel-section-title">Appearance</h4>
          {isText && (
            <div className="prop-field" style={{ gridColumn: "span 2" }}>
              <label className="prop-label">Font</label>
              <select className="panel-select" value={objectState.fontFamily || "Inter"}
                onChange={e => applyProp("fontFamily", e.target.value)}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
          <div className="prop-field">
            <label className="prop-label">Fill</label>
            <div className="color-row">
              <input type="color" value={objectState.fill === "transparent" ? "#000000" : (objectState.fill || "#5366ff")}
                onChange={e => applyProp("fill", e.target.value)} />
              <span className="color-hex">{objectState.fill || "#5366ff"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Object Actions */}
      <div className="panel-section">
        <h4 className="panel-section-title">Object</h4>
        {isImage && (
          <button className="panel-btn panel-btn-primary" onClick={onReplace}>Replace Image</button>
        )}
        <button className="panel-btn panel-btn-danger" onClick={deleteSelected}>Delete Object</button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
