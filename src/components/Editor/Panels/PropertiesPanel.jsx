/* eslint-disable no-unused-vars, react-hooks/immutability */
import { useState } from "react";
import { FaLongArrowAltDown, FaLongArrowAltUp } from "react-icons/fa";
import { useEditorContext } from "../../../context/EditorContextInstance";
import { FONTS } from "../../../utils/imageHelpers";
import { 
  TbRotate,
  TbRotateClockwise,
  TbFlipHorizontal,
  TbFlipVertical,
  TbAlignLeft,
  TbAlignCenter,
  TbAlignRight,
  TbArrowBarUp,
  TbArrowBarDown,
  TbArrowUp,
  TbArrowDown,
  TbTrash,
  TbReplace,
  TbSparkles,
  TbSearch
} from "react-icons/tb";
import { FaArrowsLeftRight } from "react-icons/fa6";

const QUALITY_OPTIONS = [
  { value: "low",    label: "Low",    desc: "Fast" },
  { value: "medium", label: "Medium", desc: "Balanced" },
  { value: "high",   label: "High",   desc: "Best quality" },
];

const PropertiesPanel = ({ onReplace }) => {
  const [removeBgQuality, setRemoveBgQuality] = useState("medium");
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
    removeBackground,
  } = useEditorContext();

  if (!selectedObject) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#9ca3af] bg-white gap-3 select-none">
        <div className="w-12 h-12 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-lg text-[#9ca3af] shadow-sm font-semibold">⬡</div>
        <p className="text-xs max-w-[150px] leading-relaxed font-semibold text-[#4b5563]">Select an object to see properties</p>
      </div>
    );
  }

  const isImage = selectedObject.type === "image";
  const isText =
    selectedObject.type === "textbox" || selectedObject.type === "text";

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
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-6 bg-white select-none scrollbar-thin">
      {/* Transform */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Transform</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#4b5563]">X</label>
            <input
              type="number"
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-1.5 outline-none text-xs font-semibold focus:border-[#0070f3] focus:bg-white font-mono"
              value={objectState.x}
              onChange={(e) => applyProp("x", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#4b5563]">Y</label>
            <input
              type="number"
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-1.5 outline-none text-xs font-semibold focus:border-[#0070f3] focus:bg-white font-mono"
              value={objectState.y}
              onChange={(e) => applyProp("y", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#4b5563]">W</label>
            <input
              type="number"
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#9ca3af] px-3 py-1.5 outline-none text-xs font-semibold font-mono"
              value={objectState.width || 0}
              readOnly
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[#4b5563]">H</label>
            <input
              type="number"
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#9ca3af] px-3 py-1.5 outline-none text-xs font-semibold font-mono"
              value={objectState.height || 0}
              readOnly
            />
          </div>
        </div>
        
        {/* Rotation Slider */}
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4b5563]">Rotation</span>
            <span className="text-xs font-mono font-bold text-[#111827]">{objectState.angle}°</span>
          </div>
          <input
            type="range"
            className="w-full"
            min="0"
            max="360"
            value={objectState.angle ?? 0}
            onChange={(e) => applyProp("angle", parseInt(e.target.value))}
            style={{ '--range-progress': `${((objectState.angle ?? 0) / 360) * 100}%` }}
          />
        </div>

        {/* Opacity Slider */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4b5563]">Opacity</span>
            <span className="text-xs font-mono font-bold text-[#111827]">
              {Math.round(objectState.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            className="w-full"
            min="0"
            max="1"
            step="0.01"
            value={objectState.opacity ?? 1}
            onChange={(e) => applyProp("opacity", parseFloat(e.target.value))}
            style={{ '--range-progress': `${(objectState.opacity ?? 1) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full h-px bg-[#e5e7eb]" />

      {/* Quick Actions */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] hover:text-[#111827] transition-all shadow-sm" onClick={() => rotateSelected(-90)}>
            <TbRotate className="w-4 h-4 text-[#4b5563]" />
            <span>90°</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] hover:text-[#111827] transition-all shadow-sm" onClick={() => rotateSelected(90)}>
            <TbRotateClockwise className="w-4 h-4 text-[#4b5563]" />
            <span>90°</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] hover:text-[#111827] transition-all shadow-sm" onClick={() => flipSelected("x")}>
            <TbFlipHorizontal className="w-4 h-4 text-[#4b5563]" />
            <span>Flip H</span>
          </button>
          <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] hover:text-[#111827] transition-all shadow-sm" onClick={() => flipSelected("y")}>
            <TbFlipVertical className="w-4 h-4 text-[#4b5563]" />
            <span>Flip V</span>
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[#e5e7eb]" />

      {/* Alignment */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Align to Canvas</h4>
        <div className="grid grid-cols-3 gap-2">
          <button className="flex items-center justify-center px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("left")} title="Align Left">
            <TbAlignLeft className="w-4 h-4" />
          </button>
          <button className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("center")} title="Align Center">
            <FaArrowsLeftRight  className="w-4 h-4" />
            <span className="text-[10px]">Center</span>
          </button>
          <button className="flex items-center justify-center px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("right")} title="Align Right">
            <TbAlignRight className="w-4 h-4" />
          </button>
          <button className="flex items-center justify-center px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("top")} title="Align Top">
            <FaLongArrowAltUp className="w-4 h-4" />
          </button>
          <button className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("middle")} title="Align Middle">
            <FaArrowsLeftRight className="w-4 h-4 rotate-90" />
            <span className="text-[10px]">Middle</span>
          </button>
          <button className="flex items-center justify-center px-2 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => alignToCanvas("bottom")} title="Align Bottom">
            <FaLongArrowAltDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[#e5e7eb]" />

      {/* Layer Order */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Align to Canvas</h4>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => changeOrder("front")}>
            <TbArrowBarUp className="w-4 h-4 text-[#4b5563]" />
            <span>Bring Front</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => changeOrder("back")}>
            <TbArrowBarDown className="w-4 h-4 text-[#4b5563]" />
            <span>Send Back</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => changeOrder("forward")}>
            <TbArrowUp className="w-4 h-4 text-[#4b5563]" />
            <span>Forward</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#e5e7eb] text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] transition-all shadow-sm" onClick={() => changeOrder("backward")}>
            <TbArrowDown className="w-4 h-4 text-[#4b5563]" />
            <span>Backward</span>
          </button>
        </div>
      </div>

      {/* Appearance */}
      {!isImage && (
        <>
          <div className="w-full h-px bg-[#e5e7eb]" />
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Appearance</h4>
            {isText && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#4b5563]">Font Family</label>
                  <select
                    className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] cursor-pointer appearance-none"
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#4b5563]">Tracking (px)</label>
                    <input
                      type="number"
                      className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] font-mono"
                      value={objectState.charSpacing || 0}
                      onChange={(e) =>
                        applyProp("charSpacing", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#4b5563]">Leading (x)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] font-mono"
                      value={objectState.lineHeight || 1.16}
                      onChange={(e) =>
                        applyProp("lineHeight", parseFloat(e.target.value) || 1.16)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#4b5563]">Alignment</label>
                    <select
                      className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] cursor-pointer"
                      value={objectState.textAlign || "left"}
                      onChange={(e) => applyProp("textAlign", e.target.value)}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#4b5563]">Direction</label>
                    <select
                      className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-[#111827] px-3 py-2 outline-none text-xs font-semibold focus:border-[#0070f3] cursor-pointer"
                      value={objectState.direction || "ltr"}
                      onChange={(e) => applyProp("direction", e.target.value)}
                    >
                      <option value="ltr">LTR</option>
                      <option value="rtl">RTL</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#4b5563]">Fill Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-7 h-7 border border-[#e5e7eb] rounded-md p-0 cursor-pointer bg-transparent"
                  value={
                    objectState.fill === "transparent"
                      ? "#000000"
                      : objectState.fill || "#5366ff"
                  }
                  onChange={(e) => applyProp("fill", e.target.value)}
                />
                <span className="text-xs font-mono font-bold text-[#374151] uppercase">{objectState.fill || "#5366ff"}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="w-full h-px bg-[#e5e7eb]" />

      {/* Object Actions (Replace, Remove Background, Delete) */}
      <div className="flex flex-col gap-3 mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Object</h4>
        <div className="flex flex-col gap-2">
          {isImage && (
            <>
              {/* Quality selector for background removal */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Quality</span>
                <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden bg-[#f9fafb] p-0.5 gap-0.5">
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRemoveBgQuality(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-0 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                        removeBgQuality === opt.value
                          ? "bg-white text-[#111827] shadow-sm border border-[#e5e7eb]"
                          : "text-[#9ca3af] hover:text-[#4b5563]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[9px] font-normal opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Remove Background Button */}
              <button 
                className="flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#7c5cfc] to-[#3b82f6] text-white text-xs font-bold shadow-md shadow-[#7c5cfc]/20 hover:opacity-95 transition-all"
                onClick={() => removeBackground(removeBgQuality)}
              >
                <TbSparkles className="w-4 h-4" />
                <span>Remove Background</span>
              </button>

              <button className="flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#e5e7eb] text-[#374151] text-xs font-bold shadow-sm hover:bg-[#f9fafb] hover:text-[#111827] transition-all" onClick={onReplace}>
                <TbReplace className="w-4 h-4 text-[#4b5563]" />
                <span>Replace Image</span>
              </button>
            </>
          )}
          {/* eslint-disable-next-line react-hooks/refs */}
          {isOffCanvas() && (
            <button
              className="flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0070f3] text-white text-xs font-bold shadow-md shadow-blue-500/10 hover:bg-[#0060d3] transition-all"
              onClick={bringObjectBack}
            >
              <TbSearch className="w-4 h-4" />
              <span>Bring Back to Canvas</span>
            </button>
          )}
          <button className="flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] text-xs font-bold hover:bg-[#fee2e2] transition-all" onClick={deleteSelected}>
            <TbTrash className="w-4 h-4" />
            <span>Delete Object</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
