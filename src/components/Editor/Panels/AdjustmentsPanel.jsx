/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { Shadow } from "fabric";
import { useEditorContext } from "../../../context/EditorContextInstance";
import { buildFilters, PRESETS, BLEND_MODES } from "../../../utils/filters";

// ─── Histogram component ──────────────────────────────────────────────────────
const Histogram = ({ fabricRef, selectedObject }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const obj = selectedObject;
    const canvas = canvasRef.current;
    if (!canvas || !obj || obj.type !== "image" || !fabricRef.current) return;

    try {
      // Read pixels from the fabric canvas scoped to the selected image
      const fCanvas = fabricRef.current;
      const br = obj.getBoundingRect();
      const offscreen = document.createElement("canvas");
      const m = Math.min(2, Math.max(0.5, 300 / Math.max(br.width, br.height)));
      offscreen.width = Math.ceil(br.width * m);
      offscreen.height = Math.ceil(br.height * m);
      const oc = offscreen.getContext("2d");
      oc.drawImage(
        fCanvas.getElement(),
        -br.left * m,
        -br.top * m,
        fCanvas.width * m,
        fCanvas.height * m,
      );
      const data = oc.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height,
      ).data;

      // Build R, G, B histograms
      const rBins = new Uint32Array(256);
      const gBins = new Uint32Array(256);
      const bBins = new Uint32Array(256);
      for (let i = 0; i < data.length; i += 4) {
        rBins[data[i]]++;
        gBins[data[i + 1]]++;
        bBins[data[i + 2]]++;
      }
      const maxVal = Math.max(...rBins, ...gBins, ...bBins, 1);

      // Draw histogram
      const ctx = canvas.getContext("2d");
      const w = canvas.width,
        h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const drawChannel = (bins, color) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * w;
          const y = h - (bins[i] / maxVal) * h;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };

      drawChannel(rBins, "rgba(239,68,68,0.5)");
      drawChannel(gBins, "rgba(34,197,94,0.5)");
      drawChannel(bBins, "rgba(59,130,246,0.5)");
    } catch (_) {
      /* cross-origin or missing object — skip */
    }
  }, [selectedObject, fabricRef]);

  return (
    <div className="histogram-wrapper">
      <canvas
        ref={canvasRef}
        width={260}
        height={56}
        className="histogram-canvas"
      />
    </div>
  );
};

// ─── Curves component ─────────────────────────────────────────────────────────
// 4 draggable control points: shadows, lo-mid, hi-mid, highlights
const defaultPoints = () => [
  { x: 0, y: 1 },
  { x: 0.33, y: 0.67 },
  { x: 0.67, y: 0.33 },
  { x: 1, y: 0 },
];

const Curves = ({ initialPts, initialMidpoint, onChange, onUpdatePts }) => {
  // `dragPts` only exists while the user is actively dragging a point.
  // When null, we render from `initialPts` directly (no sync effect needed).
  const [dragPts, setDragPts] = useState(null);
  const draggingRef = useRef(null);
  const canvasRef = useRef(null);
  const SIZE = 120;

  // The points we actually draw — drag overlay takes priority over prop
  const pts = dragPts ?? initialPts ?? defaultPoints();

  const draw = useCallback((points) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = (i / 4) * SIZE;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE, p); ctx.stroke();
    }

    // Diagonal baseline
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.moveTo(0, SIZE); ctx.lineTo(SIZE, 0); ctx.stroke();

    // Curve
    ctx.strokeStyle = "rgba(124,92,252,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x * SIZE, points[0].y * SIZE);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = ((prev.x + curr.x) / 2) * SIZE;
      ctx.bezierCurveTo(cpX, prev.y * SIZE, cpX, curr.y * SIZE, curr.x * SIZE, curr.y * SIZE);
    }
    ctx.stroke();

    // Control points
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * SIZE, p.y * SIZE, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#7c5cfc";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });
  }, []);

  useEffect(() => { draw(pts); }, [pts, draw]);

  // ── Global window listeners so drag works outside the tiny canvas
  const onMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const current = dragPts ?? initialPts ?? defaultPoints();
    const idx = current.findIndex((p) => Math.hypot(p.x - mx, p.y - my) < 0.12);
    if (idx !== -1) {
      draggingRef.current = idx;
      // Seed dragPts from current displayed points so drag starts correctly
      setDragPts(current);
      e.preventDefault();
    }
  }, [dragPts, initialPts]);

  // Holds computed points between setDragPts and the onChange call below it
  // so we never call setState (onChange → setEffects) inside a setState updater
  const pendingNotifyRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (draggingRef.current === null) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const my = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Pure updater — only computes and returns next state, no side effects
      setDragPts((prev) => {
        const base = prev ?? defaultPoints();
        const next = base.map((p, i) =>
          i === draggingRef.current ? { x: mx, y: my } : p
        );
        pendingNotifyRef.current = next;
        return next;
      });

      // Notify parent here — plain event handler body, not inside a setState updater
      if (pendingNotifyRef.current) {
        const next = pendingNotifyRef.current;
        const midY = (next[1].y + next[2].y) / 2;
        const midpoint = Math.round((0.5 - midY) * 200);
        onChange(next, midpoint);
        if (onUpdatePts) onUpdatePts(next, midpoint);
        pendingNotifyRef.current = null;
      }
    };
    const onUp = () => {
      draggingRef.current = null;
      setDragPts(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onChange, onUpdatePts]);

  const reset = () => {
    const d = defaultPoints();
    setDragPts(null); // clear any in-progress drag
    const midY = (d[1].y + d[2].y) / 2;
    const midpoint = Math.round((0.5 - midY) * 200);
    onChange(d, midpoint);
    if (onUpdatePts) onUpdatePts(d, midpoint);
  };

  const midY = (pts[1].y + pts[2].y) / 2;
  const displayMidpoint = Math.round((0.5 - midY) * 200);

  return (
    <div className="curves-wrapper">
      <div className="curves-header">
        <span className="adj-label">Tone Curve</span>
        <span className="adj-value">{displayMidpoint > 0 ? "+" : ""}{displayMidpoint}</span>
        <button className="curves-reset" onClick={reset}>Reset</button>
      </div>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="curves-canvas"
        onMouseDown={onMouseDown}
      />
    </div>
  );
};

// ─── Reusable Slider ──────────────────────────────────────────────────────────
const Slider = ({
  label,
  value,
  min = -100,
  max = 100,
  step = 1,
  onChange,
  unit = "",
  color,
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
      style={color ? { accentColor: color } : undefined}
      draggable={false}
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
  sharpen: 0,
  temperature: 0,
  levelsBlack: 0,
  levelsMid: 1.0,
  levelsWhite: 255,
  curveMidpoint: 0,
  redMultiplier: 1,
  greenMultiplier: 1,
  blueMultiplier: 1,
  preset: "none",
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const AdjustmentsPanel = () => {
  const { selectedObject, fabricRef, effects, setEffects, saveHistory } =
    useEditorContext();
  const selectedObjectRef = useRef(null);
  // ── FIX: keep activeSection stable across object changes and tab switches
  const [activeSection, setActiveSection] = useState("light");
  const prevSelectedIdRef = useRef(null);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
    // When a different object is selected, restore its saved effectsData into context
    const newId = selectedObject?.id ?? null;
    if (newId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = newId;
      if (selectedObject?.effectsData) {
        setEffects((prev) => ({ ...prev, ...selectedObject.effectsData }));
      }
    }
  }, [selectedObject, setEffects]);

  const isImage = selectedObject?.type === "image";

  const applyAdj = useCallback(
    (newEffects) => {
      const obj = selectedObjectRef.current;
      if (!obj || !fabricRef.current) return;
      if (obj.type === "image") {
        obj.filters = buildFilters(newEffects);
        obj.applyFilters();
      }
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
      // Persist the adjustment state on the object so UI can restore it when re-selecting or switching tabs
      try {
        obj.set("effectsData", newEffects);
      } catch (_) {
        obj.effectsData = newEffects;
      }
      // Save a snapshot after adjustments
      saveHistory();
    },
    [fabricRef, saveHistory],
  );

  const update = useCallback((field, value) => {
    setEffects(prev => {
      const next = { ...prev, [field]: value };
      applyAdj(next);
      return next;
    });
  }, [applyAdj]);

  // Atomic update for curve — keeps curvePts and curveMidpoint in sync in one call
  const updateCurve = useCallback((pts, midpoint) => {
    setEffects(prev => {
      const next = { ...prev, curvePts: pts, curveMidpoint: midpoint };
      applyAdj(next);
      return next;
    });
  }, [applyAdj]);

  const resetAll = () => {
    const next = {
      ...DEFAULT_ADJ,
      curvePts: null,       // reset curve to default shape
      shadow: false,
      outline: false,
      outlineColor: "#ffffff",
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
      try { obj.set("effectsData", next); } catch (_) { obj.effectsData = next; }
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

  const sections = isImage
    ? [
        { id: "light", label: "Light" },
        { id: "color", label: "Color" },
        { id: "levels", label: "Levels" },
        { id: "detail", label: "Detail" },
        { id: "fx", label: "FX" },
      ]
    : [{ id: "fx", label: "FX" }];

  return (
    <div className="panel-scroll">
      {/* Histogram */}
      {isImage && (
        <Histogram fabricRef={fabricRef} selectedObject={selectedObject} />
      )}

      {/* Section tabs */}
      <div className="adj-section-tabs">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`adj-section-tab ${activeSection === s.id ? "adj-section-tab--active" : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Light section ── */}
      {isImage && activeSection === "light" && (
        <div className="panel-section">
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
          <Curves
            initialPts={effects.curvePts}
            initialMidpoint={effects.curveMidpoint}
            onChange={updateCurve}
            onUpdatePts={updateCurve}
          />
        </div>
      )}

      {/* ── Color section ── */}
      {isImage && activeSection === "color" && (
        <div className="panel-section">
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
          <Slider
            label="Temperature"
            value={effects.temperature || 0}
            onChange={(v) => update("temperature", v)}
            color={
              effects.temperature > 0
                ? "#f97316"
                : effects.temperature < 0
                  ? "#60a5fa"
                  : undefined
            }
          />

          <h4 className="panel-section-title" style={{ marginTop: 16 }}>
            RGB Channels
          </h4>
          <Slider
            label="Red"
            value={Math.round((effects.redMultiplier ?? 1) * 100)}
            min={0}
            max={200}
            onChange={(v) => update("redMultiplier", v / 100)}
            color="#ef4444"
          />
          <Slider
            label="Green"
            value={Math.round((effects.greenMultiplier ?? 1) * 100)}
            min={0}
            max={200}
            onChange={(v) => update("greenMultiplier", v / 100)}
            color="#22c55e"
          />
          <Slider
            label="Blue"
            value={Math.round((effects.blueMultiplier ?? 1) * 100)}
            min={0}
            max={200}
            onChange={(v) => update("blueMultiplier", v / 100)}
            color="#3b82f6"
          />
        </div>
      )}

      {/* ── Levels section ── */}
      {isImage && activeSection === "levels" && (
        <div className="panel-section">
          <div className="levels-bar-wrapper">
            <div className="levels-bar">
              <div
                className="levels-bar-fill"
                style={{
                  left: `${((effects.levelsBlack || 0) / 255) * 100}%`,
                  right: `${(1 - (effects.levelsWhite || 255) / 255) * 100}%`,
                }}
              />
            </div>
            <div className="levels-labels">
              <span>0</span>
              <span>128</span>
              <span>255</span>
            </div>
          </div>
          <Slider
            label="Black Point (Shadows)"
            value={effects.levelsBlack || 0}
            min={0}
            max={253}
            onChange={(v) => update("levelsBlack", v)}
            color="#94a3b8"
          />
          <Slider
            label="Midtones (Gamma)"
            value={Math.round((effects.levelsMid || 1.0) * 100)}
            min={10}
            max={300}
            onChange={(v) => update("levelsMid", v / 100)}
            color="#a78bfa"
          />
          <Slider
            label="White Point (Highlights)"
            value={effects.levelsWhite || 255}
            min={2}
            max={255}
            onChange={(v) => update("levelsWhite", v)}
            color="#f8fafc"
          />
          <button
            className="panel-btn panel-btn-ghost"
            style={{ marginTop: 8 }}
            onClick={() => {
              update("levelsBlack", 0);
              update("levelsMid", 1.0);
              update("levelsWhite", 255);
            }}
          >
            Reset Levels
          </button>
        </div>
      )}

      {/* ── Detail section ── */}
      {isImage && activeSection === "detail" && (
        <div className="panel-section">
          <Slider
            label="Sharpen"
            value={effects.sharpen || 0}
            min={0}
            max={100}
            onChange={(v) => update("sharpen", v)}
          />
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

      {/* ── FX section ── */}
      {activeSection === "fx" && (
        <div className="panel-section">
          {isImage && (
            <>
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
            </>
          )}

          <h4 className="panel-section-title" style={{ marginTop: 16 }}>
            Layer Effects
          </h4>
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
            <span>Outline / Stroke</span>
            <input
              type="checkbox"
              className="toggle-check"
              checked={effects.outline || false}
              onChange={(e) => update("outline", e.target.checked)}
            />
          </label>

          <h4 className="panel-section-title" style={{ marginTop: 16 }}>
            Blend Mode
          </h4>
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
      )}

      <button
        className="panel-btn panel-btn-ghost"
        style={{ margin: "8px 12px 12px" }}
        onClick={resetAll}
      >
        Reset All Adjustments
      </button>
    </div>
  );
};

export default AdjustmentsPanel;