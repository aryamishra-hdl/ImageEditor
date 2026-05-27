import { useState } from "react";
import { useEditorContext } from "../../../context/EditorContextInstance";
import { BLEND_MODES } from "../../../utils/filters";

const typeIcon = (type) => {
  if (type === "image") return "🖼";
  if (type === "textbox" || type === "text") return "T";
  if (type === "path") return "✏";
  return "⬛";
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
      // Preserve custom adjustment state
      if (layer.object.effectsData) clone.effectsData = layer.object.effectsData;
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

    // fabric index is reversed from UI index
    const newFabricIndex = layers.length - 1 - targetUiIndex;

    // Move the object in the canvas stack
    canvas.moveObjectTo(sourceLayer.object, newFabricIndex);

    canvas.requestRenderAll();
    canvas.fire("layer:updated");
    saveHistory();
    setDraggedLayerId(null);
  };

  if (layers.length === 0) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-icon">📋</div>
        <p>No layers yet. Upload an image or add objects.</p>
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      <div className="layers-list">
        {layers.map((layer, uiIndex) => {
          const isActive = layer.object === selectedObject;
          const isDragging = layer.id === draggedLayerId;
          const isDragOver = layer.id === dragOverLayerId;

          return (
            <div
              key={layer.id}
              className={`layer-item ${isActive ? "layer-item--active" : ""} ${!layer.visible ? "layer-item--hidden" : ""}`}
              style={{
                opacity: isDragging ? 0.5 : 1,
                borderTop: isDragOver
                  ? "2px solid #7c5cfc"
                  : "1px solid transparent",
              }}
              draggable={draggableLayerId === layer.id}
              onDragStart={(e) => onDragStart(e, layer)}
              onDragOver={(e) => onDragOver(e, layer)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, layer, uiIndex)}
              onClick={() => selectLayer(layer.object)}
            >
              {/* Drag handle */}
              <span
                className="layer-drag"
                onMouseEnter={() => setDraggableLayerId(layer.id)}
                onMouseLeave={() => setDraggableLayerId(null)}
              >
                ⠿
              </span>

              {/* Type icon */}
              <span className="layer-type-icon">{typeIcon(layer.type)}</span>

              {/* Name */}
              <span className="layer-name">{layer.name}</span>

              {/* Controls */}
              <div className="layer-controls">
                <button
                  className="layer-ctrl-btn"
                  title={layer.visible ? "Hide" : "Show"}
                  onClick={(e) => toggleVisibility(layer, e)}
                >
                  {layer.visible ? "👁" : "🙈"}
                </button>
                <button
                  className="layer-ctrl-btn"
                  title={layer.locked ? "Unlock" : "Lock"}
                  onClick={(e) => toggleLock(layer, e)}
                >
                  {layer.locked ? "🔒" : "🔓"}
                </button>
                <button
                  className="layer-ctrl-btn"
                  title="Duplicate"
                  onClick={(e) => duplicateLayer(layer, e)}
                >
                  ⧉
                </button>
                <button
                  className="layer-ctrl-btn layer-ctrl-btn--del"
                  title="Delete"
                  onClick={(e) => deleteLayer(layer, e)}
                >
                  ✕
                </button>
              </div>

              {/* Expanded controls when active */}
              {isActive && (
                <div
                  className="layer-expanded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="adj-row">
                    <div className="adj-label-row">
                      <span className="adj-label">Opacity</span>
                      <span className="adj-value">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      className="adj-slider"
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
                    />
                  </div>
                  <select
                    className="panel-select"
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