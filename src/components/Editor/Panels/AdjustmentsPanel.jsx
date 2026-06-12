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

      const rBins = new Uint32Array(256);
      const gBins = new Uint32Array(256);
      const bBins = new Uint32Array(256);
      for (let i = 0; i < data.length; i += 4) {
        rBins[data[i]]++;
        gBins[data[i + 1]]++;
        bBins[data[i + 2]]++;
      }
      const maxVal = Math.max(...rBins, ...gBins, ...bBins, 1);

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

      drawChannel(rBins, "rgba(239,68,68,0.4)");
      drawChannel(gBins, "rgba(34,197,94,0.4)");
      drawChannel(bBins, "rgba(59,130,246,0.4)");
    } catch (_) {
      /* cross-origin or missing object — skip */
    }
  }, [selectedObject, fabricRef]);

  return (
    <div className="bg-[#f9fafb] border-b border-[#e5e7eb] p-4 flex justify-center sticky top-0 z-10 shrink-0">
      <canvas
        ref={canvasRef}
        width={260}
        height={56}
        className="w-full h-14 bg-white rounded-lg border border-[#e5e7eb] shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
};

// ─── Curves component ─────────────────────────────────────────────────────────
const defaultPoints = () => [
  { x: 0, y: 1 },
  { x: 0.33, y: 0.67 },
  { x: 0.67, y: 0.33 },
  { x: 1, y: 0 },
];

const Curves = ({ initialPts, initialMidpoint, onChange, onUpdatePts }) => {
  const [dragPts, setDragPts] = useState(null);
  const draggingRef = useRef(null);
  const canvasRef = useRef(null);
  const SIZE = 120;

  const pts = dragPts ?? initialPts ?? defaultPoints();

  const draw = useCallback((points) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = (i / 4) * SIZE;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(SIZE, p); ctx.stroke();
    }

    // Diagonal baseline
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath(); ctx.moveTo(0, SIZE); ctx.lineTo(SIZE, 0); ctx.stroke();

    // Curve
    ctx.strokeStyle = "#0070f3";
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
      ctx.arc(p.x * SIZE, p.y * SIZE, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0070f3";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });
  }, []);

  useEffect(() => { draw(pts); }, [pts, draw]);

  const onMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const current = dragPts ?? initialPts ?? defaultPoints();
    const idx = current.findIndex((p) => Math.hypot(p.x - mx, p.y - my) < 0.12);
    if (idx !== -1) {
      draggingRef.current = idx;
      setDragPts(current);
      e.preventDefault();
    }
  }, [dragPts, initialPts]);

  const pendingNotifyRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (draggingRef.current === null) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const my = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      setDragPts((prev) => {
        const base = prev ?? defaultPoints();
        const next = base.map((p, i) =>
          i === draggingRef.current ? { x: mx, y: my } : p
        );
        pendingNotifyRef.current = next;
        return next;
      });

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
    setDragPts(null);
    const midY = (d[1].y + d[2].y) / 2;
    const midpoint = Math.round((0.5 - midY) * 200);
    onChange(d, midpoint);
    if (onUpdatePts) onUpdatePts(d, midpoint);
  };

  const midY = (pts[1].y + pts[2].y) / 2;
  const displayMidpoint = Math.round((0.5 - midY) * 200);

  return (
    <div className="flex flex-col items-center gap-3 bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] shadow-sm mt-3 w-full">
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b5563]">Tone Curve</span>
        <span className="text-xs font-mono font-bold text-[#111827]">{displayMidpoint > 0 ? "+" : ""}{displayMidpoint}</span>
        <button className="text-[10px] uppercase font-bold tracking-wider text-[#0070f3] hover:text-[#0060d3] transition-colors" onClick={reset}>Reset</button>
      </div>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-[120px] h-[120px] bg-white rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] cursor-crosshair border border-[#e5e7eb]"
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
  <div className="flex flex-col gap-1.5 mb-4 w-full">
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-[#4b5563]">{label}</span>
      <span className="text-xs font-mono font-bold text-[#111827] min-w-[36px] text-right">
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
      className="w-full"
      style={{
        '--range-progress': `${((value - min) / (max - min)) * 100}%`,
        ...(color ? { '--color-accent': color } : {}),
      }}
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
  const [activeSection, setActiveSection] = useState("light");
  const prevSelectedIdRef = useRef(null);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
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
              color: "rgba(0,0,0,0.15)",
              blur: 15,
              offsetX: 4,
              offsetY: 4,
            })
          : null,
      );
      if (newEffects.outline) {
        obj.set({
          stroke: newEffects.outlineColor || "#ffffff",
          strokeWidth: 3,
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
      try {
        obj.set("effectsData", newEffects);
      } catch (_) {
        obj.effectsData = newEffects;
      }
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
  }, [applyAdj, setEffects]);

  const updateCurve = useCallback((pts, midpoint) => {
    setEffects(prev => {
      const next = { ...prev, curvePts: pts, curveMidpoint: midpoint };
      applyAdj(next);
      return next;
    });
  }, [applyAdj, setEffects]);

  const resetAll = () => {
    const next = {
      ...DEFAULT_ADJ,
      curvePts: null,
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#9ca3af] bg-white gap-3 select-none">
        <div className="w-12 h-12 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-lg text-[#9ca3af] shadow-sm font-semibold">🎨</div>
        <p className="text-xs max-w-[150px] leading-relaxed font-semibold text-[#4b5563]">Select an object to adjust</p>
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative bg-white select-none">
      {/* Histogram */}
      {isImage && (
        <Histogram fabricRef={fabricRef} selectedObject={selectedObject} />
      )}

      {/* Section tabs */}
      <div className="flex px-3 py-2.5 gap-1.5 border-b border-[#e5e7eb] bg-[#f9fafb] shrink-0 sticky z-10 top-0">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border ${
              activeSection === s.id 
                ? "bg-white text-[#0070f3] border-[#e5e7eb] shadow-sm font-bold" 
                : "bg-transparent text-[#6b7280] border-transparent hover:text-[#374151] hover:bg-[#f3f4f6]"
            }`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-1">
        {/* ── Light section ── */}
        {isImage && activeSection === "light" && (
          <div className="flex flex-col w-full">
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
          <div className="flex flex-col w-full">
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
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-3.5 mt-2">
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
          <div className="flex flex-col w-full">
            <div className="bg-[#f9fafb] rounded-lg border border-[#e5e7eb] shadow-sm p-4 mb-4">
              <div className="relative h-2 bg-[#e5e7eb] rounded-full overflow-hidden shadow-inner">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-500 rounded-full transition-all"
                  style={{
                    left: `${((effects.levelsBlack || 0) / 255) * 100}%`,
                    right: `${(1 - (effects.levelsWhite || 255) / 255) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono font-bold text-[#6b7280] mt-2">
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
              color="#4b5563"
            />
            <Slider
              label="Midtones (Gamma)"
              value={Math.round((effects.levelsMid || 1.0) * 100)}
              min={10}
              max={300}
              onChange={(v) => update("levelsMid", v / 100)}
              color="#0070f3"
            />
            <Slider
              label="White Point (Highlights)"
              value={effects.levelsWhite || 255}
              min={2}
              max={255}
              onChange={(v) => update("levelsWhite", v)}
              color="#9ca3af"
            />
            <button
              className="flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e7eb] text-xs font-bold text-[#374151] hover:bg-[#f9fafb] hover:border-[#d1d5db] transition-all shadow-sm mt-2"
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
          <div className="flex flex-col w-full">
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
          <div className="flex flex-col w-full">
            {isImage && (
              <>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-3">Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                        effects.preset === p.value 
                          ? "bg-[#0070f3] text-white border-transparent shadow-md shadow-blue-500/15" 
                          : "bg-white text-[#4b5563] border-[#e5e7eb] hover:bg-[#f9fafb] hover:text-[#111827]"
                      }`}
                      onClick={() => update("preset", p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-3 mt-6">
              Layer Effects
            </h4>
            <label className="flex items-center justify-between text-xs font-semibold text-[#374151] py-2 cursor-pointer select-none">
              <span>Drop Shadow</span>
              <input
                type="checkbox"
                className="w-8 h-4.5 appearance-none bg-[#e5e7eb] border border-transparent rounded-full outline-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:top-[2px] before:left-[2px] before:bg-white before:transition-all checked:bg-[#0070f3] checked:before:left-[14px]"
                checked={effects.shadow || false}
                onChange={(e) => update("shadow", e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between text-xs font-semibold text-[#374151] py-2 cursor-pointer select-none">
              <span>Outline / Stroke</span>
              <input
                type="checkbox"
                className="w-8 h-4.5 appearance-none bg-[#e5e7eb] border border-transparent rounded-full outline-none cursor-pointer relative transition-all before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:top-[2px] before:left-[2px] before:bg-white before:transition-all checked:bg-[#0070f3] checked:before:left-[14px]"
                checked={effects.outline || false}
                onChange={(e) => update("outline", e.target.checked)}
              />
            </label>

            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-3 mt-6">
              Blend Mode
            </h4>
            <select
              className="w-full bg-white border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] appearance-none cursor-pointer uppercase"
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
          className="flex justify-center items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#e5e7eb] text-xs font-bold text-[#374151] hover:bg-[#f9fafb] hover:border-[#d1d5db] transition-all shadow-sm mt-5 mx-1"
          onClick={resetAll}
        >
          Reset All Adjustments
        </button>
      </div>
    </div>
  );
};

export default AdjustmentsPanel;