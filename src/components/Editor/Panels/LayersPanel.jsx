import { useState } from "react";
import { useEditorContext } from "../../../context/EditorContextInstance";
import { BLEND_MODES } from "../../../utils/filters";
import {
  TbEye,
  TbEyeOff,
  TbLock,
  TbLockOpen,
  TbCopy,
  TbTrash,
  TbLayersDifference,
  TbTextSize,
  TbPencil,
  TbSquare,
  TbGridDots,
} from "react-icons/tb";

const typeIcon = (type) => {
  if (type === "image")
    return <TbLayersDifference className="w-4 h-4 text-[#4b5563]" />;
  if (type === "textbox" || type === "text")
    return <TbTextSize className="w-4 h-4 text-[#4b5563]" />;
  if (type === "path") return <TbPencil className="w-4 h-4 text-[#4b5563]" />;
  return <TbSquare className="w-4 h-4 text-[#4b5563]" />;
};

const LayersPanel = () => {
  const { layers, fabricRef, selectedObject, saveHistory } = useEditorContext();
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const [draggableLayerId, setDraggableLayerId] = useState(null);

  const selectLayer = (obj) => {
    if (!fabricRef.current) return;
    fabricRef.current.setActiveObject(obj);
    fabricRef.current.requestRenderAll();
  };

  const toggleVisibility = (layer, e) => {
    e.stopPropagation();
    layer.object.set("visible", !layer.visible);
    fabricRef.current?.requestRenderAll();
    fabricRef.current?.fire("layer:updated");
    saveHistory();
  };

  const toggleLock = (layer, e) => {
    e.stopPropagation();
    layer.object.set({ selectable: layer.locked, evented: layer.locked });
    fabricRef.current?.requestRenderAll();
    fabricRef.current?.fire("layer:updated");
    saveHistory();
  };

  const deleteLayer = (layer, e) => {
    e.stopPropagation();
    fabricRef.current?.remove(layer.object);
    fabricRef.current?.requestRenderAll();
    saveHistory();
  };

  const changeOpacity = (layer, value) => {
    layer.object.set("opacity", value);
    fabricRef.current?.requestRenderAll();
    fabricRef.current?.fire("layer:updated");
    saveHistory();
  };

  const changeBlendMode = (layer, value) => {
    layer.object.set("globalCompositeOperation", value);
    fabricRef.current?.requestRenderAll();
    fabricRef.current?.fire("layer:updated");
    saveHistory();
  };

  const duplicateLayer = (layer, e) => {
    e.stopPropagation();
    layer.object.clone(["id", "name", "effectsData"]).then((clone) => {
      clone.set({
        left: layer.object.left + 20,
        top: layer.object.top + 20,
        id: `layer-${Date.now()}`,
        name: `${layer.name} copy`,
      });
      if (layer.object.effectsData)
        clone.effectsData = layer.object.effectsData;
      fabricRef.current?.add(clone);
      fabricRef.current?.setActiveObject(clone);
      fabricRef.current?.requestRenderAll();
      saveHistory();
    });
  };

  // Drag and Drop Handlers
  const onDragStart = (e, layer) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedLayerId(layer.id);
  };

  const onDragOver = (e, layer) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (layer.id !== dragOverLayerId) {
      setDragOverLayerId(layer.id);
    }
  };

  const onDragLeave = () => {
    setDragOverLayerId(null);
  };

  const onDrop = (e, targetLayer, targetUiIndex) => {
    e.preventDefault();
    setDragOverLayerId(null);
    if (
      !draggedLayerId ||
      draggedLayerId === targetLayer.id ||
      !fabricRef.current
    )
      return;

    const canvas = fabricRef.current;
    const sourceLayer = layers.find((l) => l.id === draggedLayerId);
    if (!sourceLayer) return;

    const newFabricIndex = layers.length - 1 - targetUiIndex;
    canvas.moveObjectTo(sourceLayer.object, newFabricIndex);

    canvas.requestRenderAll();
    canvas.fire("layer:updated");
    saveHistory();
    setDraggedLayerId(null);
  };

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#9ca3af] bg-white gap-3 select-none">
        <div className="w-12 h-12 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-lg text-[#9ca3af] shadow-sm font-semibold">
          📋
        </div>
        <p className="text-xs max-w-[160px] leading-relaxed font-semibold text-[#4b5563]">
          No layers yet. Upload an image or add objects.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-2 bg-white select-none">
      <div className="flex flex-col gap-2">
        {layers.map((layer, uiIndex) => {
          const isActive = layer.object === selectedObject;
          const isDragging = layer.id === draggedLayerId;
          const isDragOver = layer.id === dragOverLayerId;

          return (
            <div
              key={layer.id}
              className={`flex flex-col rounded-lg border transition-all cursor-pointer overflow-hidden ${
                isActive
                  ? "border-[#0070f3] bg-[#f0f7ff] shadow-sm"
                  : "border-[#e5e7eb] hover:bg-[#f9fafb]"
              } ${!layer.visible ? "opacity-50" : ""}`}
              style={{
                opacity: isDragging ? 0.4 : !layer.visible ? 0.5 : 1,
                borderTop: isDragOver ? "2px solid #0070f3" : "",
              }}
              draggable={draggableLayerId === layer.id}
              onDragStart={(e) => onDragStart(e, layer)}
              onDragOver={(e) => onDragOver(e, layer)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, layer, uiIndex)}
              onClick={() => selectLayer(layer.object)}
            >
              <div className="flex items-center p-2.5 min-h-[44px] gap-2">
                {/* Drag handle */}
                <span
                  className="text-[#9ca3af] hover:text-[#4b5563] cursor-grab active:cursor-grabbing transition-colors"
                  onMouseEnter={() => setDraggableLayerId(layer.id)}
                  onMouseLeave={() => setDraggableLayerId(null)}
                >
                  <TbGridDots className="w-4 h-4" />
                </span>

                {/* Type icon */}
                <span className="w-7 h-7 flex items-center justify-center bg-[#f3f4f6] rounded-md border border-[#e5e7eb] shrink-0">
                  {typeIcon(layer.type)}
                </span>

                {/* Name */}
                <span className="text-xs text-[#111827] truncate font-semibold flex-1 ml-1">
                  {layer.name}
                </span>

                {/* Controls */}
                <div className="flex items-center gap-0.5">
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[#4b5563] hover:bg-[#e5e7eb] hover:text-[#111827] transition-all"
                    title={layer.visible ? "Hide" : "Show"}
                    onClick={(e) => toggleVisibility(layer, e)}
                  >
                    {layer.visible ? (
                      <TbEye className="w-4 h-4" />
                    ) : (
                      <TbEyeOff className="w-4 h-4 text-[#ef4444]" />
                    )}
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[#4b5563] hover:bg-[#e5e7eb] hover:text-[#111827] transition-all"
                    title={layer.locked ? "Unlock" : "Lock"}
                    onClick={(e) => toggleLock(layer, e)}
                  >
                    {layer.locked ? (
                      <TbLock className="w-3.5 h-3.5 text-[#f59e0b]" />
                    ) : (
                      <TbLockOpen className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[#4b5563] hover:bg-[#e5e7eb] hover:text-[#111827] transition-all"
                    title="Duplicate"
                    onClick={(e) => duplicateLayer(layer, e)}
                  >
                    <TbCopy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[#9ca3af] hover:bg-[#fee2e2] hover:text-[#ef4444] transition-all"
                    title="Delete"
                    onClick={(e) => deleteLayer(layer, e)}
                  >
                    <TbTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded controls when active */}
              {isActive && (
                <div
                  className="px-3 pb-3 pt-2 flex flex-col gap-2.5 border-t border-[#e5e7eb] bg-[#f9fafb]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-[#4b5563]">
                        Opacity
                      </span>
                    </div>
                    <input
                      type="range"
                      className="flex-1"
                      min="0"
                      max="1"
                      step="0.01"
                      draggable={false}
                      onDragStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      value={layer.opacity}
                      onChange={(e) =>
                        changeOpacity(layer, parseFloat(e.target.value))
                      }
                      style={{ '--range-progress': `${layer.opacity * 100}%` }}
                    />
                    <span className="text-[10px] font-mono font-bold text-[#111827]">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                  <select
                    className="w-full bg-white border border-[#e5e7eb] rounded-lg text-[#111827] px-2.5 py-1.5 outline-none text-xs font-semibold focus:border-[#0070f3] cursor-pointer"
                    value={layer.blendMode}
                    draggable={false}
                    onDragStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => changeBlendMode(layer, e.target.value)}
                  >
                    {BLEND_MODES.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
