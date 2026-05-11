import { useCallback, useEffect, useRef } from "react";
import { Shadow } from "fabric";
import { useEditorContext } from "../../../context/EditorContextInstance";
import { buildFilters, PRESETS, BLEND_MODES } from "../../../utils/filters";

const Slider = ({
  label,
  value,
  min = -100,
  max = 100,
  step = 1,
  onChange,
  unit = "",
}) => (
  <div className="adj-row">
    <div className="adj-label-row">
      <span className="adj-label">{label}</span>
      <span className="adj-value">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="adj-slider"
    />
  </div>
);

const DEFAULT_ADJ = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  hue: 0,
  vibrance: 0,
  blur: 0,
  noise: 0,
  preset: "none",
};

const AdjustmentsPanel = () => {
  const { selectedObject, fabricRef, effects, setEffects, saveHistory } =
    useEditorContext();
  const selectedObjectRef = useRef(null);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);
  const isImage = selectedObject?.type === "image";

  const applyAdj = useCallback(
    (newEffects) => {
      const obj = selectedObjectRef.current;
      if (!obj || !fabricRef.current) return;
      if (obj.type === "image") {
        obj.filters = buildFilters(newEffects);
        obj.applyFilters();
      }
      // Apply shadow
      obj.set(
        "shadow",
        newEffects.shadow
          ? new Shadow({
              color: "rgba(0,0,0,0.35)",
              blur: 20,
              offsetX: 6,
              offsetY: 6,
            })
          : null,
      );
      // Apply outline
      if (newEffects.outline) {
        obj.set({
          stroke: newEffects.outlineColor || "#ffffff",
          strokeWidth: 4,
          paintFirst: "stroke",
        });
      } else {
        obj.set({ stroke: null, strokeWidth: 0 });
      }
      obj.set(
        "globalCompositeOperation",
        newEffects.blendMode || "source-over",
      );
      fabricRef.current.requestRenderAll();
    },
    [fabricRef],
  );

  const update = (field, value) => {
    const next = { ...effects, [field]: value };
    setEffects(next);
    applyAdj(next);
  };

  // const handleSliderEnd = () => saveHistory();

  const resetAll = () => {
    const next = {
      ...DEFAULT_ADJ,
      shadow: false,
      outline: false,
      blendMode: "source-over",
    };
    setEffects(next);
    const obj = selectedObjectRef.current;

    if (obj?.type === "image") {
      obj.filters = [];
      obj.applyFilters();

      obj.set({
        shadow: null,
        stroke: null,
        strokeWidth: 0,
        globalCompositeOperation: "source-over",
      });

      fabricRef.current?.requestRenderAll();
    }
    saveHistory();
  };

  if (!selectedObject) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">🎨</div>
        <p>Select an object to adjust</p>
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      {/* Presets */}
      {isImage && (
        <div className="panel-section">
          <h4 className="panel-section-title">Presets</h4>
          <div className="preset-grid">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                className={`preset-btn ${effects.preset === p.value ? "active" : ""}`}
                onClick={() => update("preset", p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Adjustments */}
      {isImage && (
        <div className="panel-section">
          <h4 className="panel-section-title">Light & Color</h4>
          <Slider
            label="Brightness"
            value={effects.brightness || 0}
            onChange={(v) => update("brightness", v)}
          />
          <Slider
            label="Contrast"
            value={effects.contrast || 0}
            onChange={(v) => update("contrast", v)}
          />
          <Slider
            label="Exposure"
            value={effects.exposure || 0}
            onChange={(v) => update("exposure", v)}
          />
          <Slider
            label="Saturation"
            value={effects.saturation || 0}
            onChange={(v) => update("saturation", v)}
          />
          <Slider
            label="Vibrance"
            value={effects.vibrance || 0}
            onChange={(v) => update("vibrance", v)}
          />
          <Slider
            label="Hue"
            value={effects.hue || 0}
            min={-180}
            max={180}
            onChange={(v) => update("hue", v)}
            unit="°"
          />
        </div>
      )}

      {isImage && (
        <div className="panel-section">
          <h4 className="panel-section-title">Detail</h4>
          <Slider
            label="Blur"
            value={effects.blur || 0}
            min={0}
            max={100}
            onChange={(v) => update("blur", v)}
          />
          <Slider
            label="Noise"
            value={effects.noise || 0}
            min={0}
            max={200}
            onChange={(v) => update("noise", v)}
          />
        </div>
      )}

      {/* Blend Mode (all objects) */}
      <div className="panel-section">
        <h4 className="panel-section-title">Blend Mode</h4>
        <select
          className="panel-select"
          value={effects.blendMode || "source-over"}
          onChange={(e) => update("blendMode", e.target.value)}
        >
          {BLEND_MODES.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {/* Layer Effects */}
      <div className="panel-section">
        <h4 className="panel-section-title">Effects</h4>
        <label className="toggle-row">
          <span>Drop Shadow</span>
          <input
            type="checkbox"
            className="toggle-check"
            checked={effects.shadow || false}
            onChange={(e) => update("shadow", e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>Outline</span>
          <input
            type="checkbox"
            className="toggle-check"
            checked={effects.outline || false}
            onChange={(e) => update("outline", e.target.checked)}
          />
        </label>
      </div>

      <button className="panel-btn panel-btn-ghost" onClick={resetAll}>
        Reset Adjustments
      </button>
    </div>
  );
};

export default AdjustmentsPanel;
