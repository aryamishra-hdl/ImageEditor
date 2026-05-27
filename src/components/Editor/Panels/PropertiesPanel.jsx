/* eslint-disable no-unused-vars */
import { useEditorContext } from "../../../context/EditorContextInstance";
import { FONTS } from "../../../utils/imageHelpers";

const PropertiesPanel = ({ onReplace }) => {
  const {
    selectedObject,
    objectState,
    setObjectState,
    fabricRef,
    saveHistory,
    flipSelected,
    rotateSelected,
    alignToCanvas,
    changeOrder,
    deleteSelected,
    bringObjectBack,
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
  const isText =
    selectedObject.type === "textbox" || selectedObject.type === "text";

  // Check if object is off-canvas
  const isOffCanvas = () => {
    if (!selectedObject || !fabricRef?.current) return false;
    const canvas = fabricRef.current;
    const br = selectedObject.getBoundingRect(true);
    return (
      br.left + br.width < 0 ||
      br.left > canvas.width ||
      br.top + br.height < 0 ||
      br.top > canvas.height
    );
  };

  const applyProp = (field, value) => {
    setObjectState((prev) => ({ ...prev, [field]: value }));
    const propName = field === "x" ? "left" : field === "y" ? "top" : field;
    selectedObject.set(propName, value);
    if (
      field === "charSpacing" ||
      field === "lineHeight" ||
      field === "textAlign" ||
      field === "direction"
    ) {
      // force Fabric text layout recalculation and ensure textbox can shrink back
      // eslint-disable-next-line react-hooks/immutability
      selectedObject.dirty = true;
      if (typeof selectedObject.initDimensions === "function") {
        try {
          selectedObject.initDimensions();
        } catch (e) {
          /* ignore */
        }
      }
      const calcW =
        typeof selectedObject.calcTextWidth === "function"
          ? selectedObject.calcTextWidth()
          : selectedObject.width || 0;
      const calcH =
        typeof selectedObject.calcTextHeight === "function"
          ? selectedObject.calcTextHeight()
          : selectedObject.height || 0;
      const br = selectedObject.getBoundingRect(true) || {
        width: 0,
        height: 0,
      };
      const newW = Math.max(1, Math.round(calcW));
      const newH = Math.max(1, Math.round(calcH));
      if (calcW > 0 && calcW < br.width - 1) {
        selectedObject.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 });
      } else {
        selectedObject.set({ width: newW, height: newH });
      }
      try {
        selectedObject.initDimensions();
      } catch (e) {
        /* ignore */
      }
      selectedObject.setCoords();
      const scaledW = Math.round(
        (selectedObject.width ?? 0) * (selectedObject.scaleX ?? 1),
      );
      const scaledH = Math.round(
        (selectedObject.height ?? 0) * (selectedObject.scaleY ?? 1),
      );
      setObjectState((prev) => ({
        ...prev,
        width: scaledW,
        height: scaledH,
        scaleX: Number((selectedObject.scaleX ?? 1).toFixed(2)),
        scaleY: Number((selectedObject.scaleY ?? 1).toFixed(2)),
      }));
    }
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
            <input
              type="number"
              className="prop-input"
              value={objectState.x}
              onChange={(e) => applyProp("x", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="prop-field">
            <label className="prop-label">Y</label>
            <input
              type="number"
              className="prop-input"
              value={objectState.y}
              onChange={(e) => applyProp("y", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="prop-field">
            <label className="prop-label">W</label>
            <input
              type="number"
              className="prop-input"
              value={objectState.width || 0}
              readOnly
            />
          </div>
          <div className="prop-field">
            <label className="prop-label">H</label>
            <input
              type="number"
              className="prop-input"
              value={objectState.height || 0}
              readOnly
            />
          </div>
        </div>
        <div className="adj-row">
          <div className="adj-label-row">
            <span className="adj-label">Rotation</span>
            <span className="adj-value">{objectState.angle}°</span>
          </div>
          <input
            type="range"
            className="adj-slider"
            min="0"
            max="360"
            value={objectState.angle}
            onChange={(e) => applyProp("angle", parseInt(e.target.value))}
          />
        </div>
        <div className="adj-row">
          <div className="adj-label-row">
            <span className="adj-label">Opacity</span>
            <span className="adj-value">
              {Math.round(objectState.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            className="adj-slider"
            min="0"
            max="1"
            step="0.01"
            value={objectState.opacity}
            onChange={(e) => applyProp("opacity", parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Quick Transforms */}
      <div className="panel-section">
        <h4 className="panel-section-title">Quick Actions</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => rotateSelected(-90)}>
            ↺ 90°
          </button>
          <button className="panel-btn" onClick={() => rotateSelected(90)}>
            ↻ 90°
          </button>
          <button className="panel-btn" onClick={() => flipSelected("x")}>
            ↔ Flip H
          </button>
          <button className="panel-btn" onClick={() => flipSelected("y")}>
            ↕ Flip V
          </button>
        </div>
      </div>

      {/* Alignment */}
      <div className="panel-section">
        <h4 className="panel-section-title">Align to Canvas</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => alignToCanvas("left")}>
            ⬅
          </button>
          <button className="panel-btn" onClick={() => alignToCanvas("center")}>
            ⬌ Center
          </button>
          <button className="panel-btn" onClick={() => alignToCanvas("right")}>
            ➡
          </button>
          <button className="panel-btn" onClick={() => alignToCanvas("top")}>
            ⬆
          </button>
          <button className="panel-btn" onClick={() => alignToCanvas("middle")}>
            ⬍ Middle
          </button>
          <button className="panel-btn" onClick={() => alignToCanvas("bottom")}>
            ⬇
          </button>
        </div>
      </div>

      {/* Layer Order */}
      <div className="panel-section">
        <h4 className="panel-section-title">Layer Order</h4>
        <div className="btn-grid">
          <button className="panel-btn" onClick={() => changeOrder("front")}>
            Bring Front
          </button>
          <button className="panel-btn" onClick={() => changeOrder("back")}>
            Send Back
          </button>
          <button className="panel-btn" onClick={() => changeOrder("forward")}>
            Forward
          </button>
          <button className="panel-btn" onClick={() => changeOrder("backward")}>
            Backward
          </button>
        </div>
      </div>

      {/* Appearance */}
      {!isImage && (
        <div className="panel-section">
          <h4 className="panel-section-title">Appearance</h4>
          {isText && (
            <>
              <div className="prop-field" style={{ gridColumn: "span 2" }}>
                <label className="prop-label">Font Family</label>
                <select
                  className="panel-select"
                  value={objectState.fontFamily || "Inter"}
                  onChange={(e) => applyProp("fontFamily", e.target.value)}
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="prop-field">
                <label className="prop-label">Tracking (px)</label>
                <input
                  type="number"
                  className="prop-input"
                  value={objectState.charSpacing || 0}
                  onChange={(e) =>
                    applyProp("charSpacing", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="prop-field">
                <label className="prop-label">Leading (x)</label>
                <input
                  type="number"
                  step="0.1"
                  className="prop-input"
                  value={objectState.lineHeight || 1.16}
                  onChange={(e) =>
                    applyProp("lineHeight", parseFloat(e.target.value) || 1.16)
                  }
                />
              </div>
              <div className="prop-field">
                <label className="prop-label">Alignment</label>
                <select
                  className="panel-select"
                  value={objectState.textAlign || "left"}
                  onChange={(e) => applyProp("textAlign", e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              <div className="prop-field">
                <label className="prop-label">Direction</label>
                <select
                  className="panel-select"
                  value={objectState.direction || "ltr"}
                  onChange={(e) => applyProp("direction", e.target.value)}
                >
                  <option value="ltr">LTR</option>
                  <option value="rtl">RTL</option>
                </select>
              </div>
            </>
          )}
          <div className="prop-field">
            <label className="prop-label">Fill</label>
            <div className="color-row">
              <input
                type="color"
                value={
                  objectState.fill === "transparent"
                    ? "#000000"
                    : objectState.fill || "#5366ff"
                }
                onChange={(e) => applyProp("fill", e.target.value)}
              />
              <span className="color-hex">{objectState.fill || "#5366ff"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Object Actions */}
      <div className="panel-section">
        <h4 className="panel-section-title">Object</h4>
        {isImage && (
          <button className="panel-btn panel-btn-primary" onClick={onReplace}>
            Replace Image
          </button>
        )}
        {isOffCanvas() && (
          <button
            className="panel-btn panel-btn-primary"
            onClick={bringObjectBack}
          >
            🔍 Bring Back
          </button>
        )}
        <button className="panel-btn panel-btn-danger" onClick={deleteSelected}>
          Delete Object
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
