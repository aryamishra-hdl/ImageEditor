import { useCallback, useRef, useState, useEffect } from "react";
import {
  Canvas, FabricImage, Control, util,
  Rect, Circle, Triangle, Textbox, Line, PencilBrush,
} from "fabric";
import { DEFAULT_OBJECT_STATE, DEFAULT_EFFECTS } from "../utils/imageHelpers";

const HISTORY_LIMIT = 50;
const canvasInstances = new WeakMap();

export const useFabricEditor = () => {
  const fabricRef = useRef(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectState, setObjectState] = useState(DEFAULT_OBJECT_STATE);
  const [effects, setEffects] = useState(DEFAULT_EFFECTS);
  const [activeTool, _setActiveTool] = useState("select");
  const [isCropping, setIsCropping] = useState(false);

  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isHistoryProcessingRef = useRef(false);
  const activeToolRef = useRef("select");

  const setActiveTool = useCallback((tool) => {
    activeToolRef.current = tool;
    _setActiveTool(tool);
  }, []);

  // ─── History ────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    if (!fabricRef.current || isHistoryProcessingRef.current) return;
    try {
      const canvasObjects = fabricRef.current.getObjects().filter(o => o.id !== "crop-rect");
      const json = fabricRef.current.toObject(["id", "name"]);
      json.objects = canvasObjects.map(o => o.toObject(["id", "name"]));
      
      if (historyIndexRef.current < historyRef.current.length - 1)
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(json);
      historyIndexRef.current = historyRef.current.length - 1;
      if (historyRef.current.length > HISTORY_LIMIT) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    } catch (e) {
      console.warn("History save ignored un-serializable canvas state:", e);
    }
  }, []);

  const restoreHistory = useCallback((json) => {
    if (!fabricRef.current) return;
    isHistoryProcessingRef.current = true;
    fabricRef.current.loadFromJSON(json).then(() => {
      fabricRef.current.requestRenderAll();
      isHistoryProcessingRef.current = false;
      setSelectedObject(null);
      setObjectState(DEFAULT_OBJECT_STATE);
      setEffects(DEFAULT_EFFECTS);
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0 || isHistoryProcessingRef.current) return;
    historyIndexRef.current--;
    restoreHistory(historyRef.current[historyIndexRef.current]);
  }, [restoreHistory]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || isHistoryProcessingRef.current) return;
    historyIndexRef.current++;
    restoreHistory(historyRef.current[historyIndexRef.current]);
  }, [restoreHistory]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault(); redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        e.preventDefault();
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj && !obj.isEditing) { canvas.remove(obj); canvas.requestRenderAll(); saveHistory(); }
      } else if (e.key === "Escape") {
        setActiveTool("select");
        if (fabricRef.current) { fabricRef.current.isDrawingMode = false; fabricRef.current.selection = true; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, setActiveTool, saveHistory]);

  // ─── Custom Controls ─────────────────────────────────────────────────
  const addCustomControls = useCallback((obj) => {
    if (!obj) return;
    const svgUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444' stroke='white' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='15' y1='9' x2='9' y2='15'/%3E%3Cline x1='9' y1='9' x2='15' y2='15'/%3E%3C/svg%3E";
    const img = document.createElement("img");
    img.src = svgUrl;
    obj.controls.deleteControl = new Control({
      x: 0.5, y: -0.5, offsetY: -16, offsetX: 16, cursorStyle: "pointer",
      mouseUpHandler: (_, transform) => {
        const t = transform.target;
        t.canvas?.remove(t); t.canvas?.requestRenderAll(); saveHistory();
        return true;
      },
      render: (ctx, left, top, _, fabricObject) => {
        const s = 24; ctx.save(); ctx.translate(left, top);
        ctx.rotate(util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore();
      },
    });
  }, [saveHistory]);

  // ─── Canvas Init ─────────────────────────────────────────────────────
  const initCanvas = useCallback((el) => {
    if (!el) return;
    if (fabricRef.current) return fabricRef.current;
    if (canvasInstances.has(el)) {
      fabricRef.current = canvasInstances.get(el);
      return fabricRef.current;
    }

    const canvas = new Canvas(el, {
      width: 920, height: 580,
      backgroundColor: "#16161e",
      preserveObjectStacking: true, selection: true,
    });
    canvasInstances.set(el, canvas);
    fabricRef.current = canvas;
    saveHistory();

    const syncSelection = (event) => {
      const obj = canvas.getActiveObject() || event?.target || null;
      if (!obj) { clearSel(); return; }
      setSelectedObject(obj);
      setObjectState({
        x: Math.round(obj.left ?? 0), y: Math.round(obj.top ?? 0),
        angle: Math.round(obj.angle ?? 0),
        scaleX: Number((obj.scaleX ?? 1).toFixed(2)),
        scaleY: Number((obj.scaleY ?? 1).toFixed(2)),
        fill: typeof obj.fill === "string" ? obj.fill : DEFAULT_OBJECT_STATE.fill,
        opacity: obj.opacity ?? 1,
        fontFamily: obj.fontFamily ?? DEFAULT_OBJECT_STATE.fontFamily,
        flipX: obj.flipX ?? false, flipY: obj.flipY ?? false,
        width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
        height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
      });
      
      if (obj.type === "image") {
        setEffects({
          shadow: Boolean(obj.shadow),
          outline: Boolean(obj.strokeWidth && obj.strokeWidth > 0),
          blendMode: obj.globalCompositeOperation || "source-over",
          brightness: (obj.filters?.find(f => f.type === "Brightness")?.brightness || 0) * 100,
          contrast: (obj.filters?.find(f => f.type === "Contrast")?.contrast || 0) * 100,
          saturation: (obj.filters?.find(f => f.type === "Saturation")?.saturation || 0) * 100,
          exposure: 0, hue: 0, vibrance: 0,
          blur: (obj.filters?.find(f => f.type === "Blur")?.blur || 0) * 100,
          noise: obj.filters?.find(f => f.type === "Noise")?.noise || 0,
          preset: "none",
        });
      } else {
        setEffects(prev => ({
          ...prev,
          shadow: Boolean(obj.shadow),
          outline: Boolean(obj.strokeWidth && obj.strokeWidth > 0),
          blendMode: obj.globalCompositeOperation || "source-over",
        }));
      }
    };

    const clearSel = () => {
      setSelectedObject(null);
      setObjectState(DEFAULT_OBJECT_STATE);
      setEffects(DEFAULT_EFFECTS);
    };

    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", clearSel);
    canvas.on("object:modified", e => { syncSelection(e); saveHistory(); });
    canvas.on("object:added", e => {
      if (!isHistoryProcessingRef.current && e.target?.type !== "activeSelection" && e.target?.id !== "crop-rect") saveHistory();
    });
    canvas.on("path:created", (e) => {
      if (activeToolRef.current === "eraser") {
        e.path.set("globalCompositeOperation", "destination-out");
        canvas.requestRenderAll();
      }
      saveHistory();
    });
    return canvas;
  }, [saveHistory]);

  const disposeCanvas = useCallback(async () => {
    if (!fabricRef.current) return;
    const c = fabricRef.current;
    fabricRef.current = null;
    const el = c.getElement?.();
    if (el) canvasInstances.delete(el);
    await c.dispose();
  }, []);

  // ─── Tool Modes ──────────────────────────────────────────────────────
  const setSelectMode = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    fabricRef.current.selection = true;
    fabricRef.current.getObjects().forEach(o => { o.selectable = true; o.evented = true; });
    setActiveTool("select");
  }, [setActiveTool]);

  const setBrushMode = useCallback(({ size = 20, color = "#ff6b6b", opacity = 1 } = {}) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = true;
    canvas.selection = false;
    const brush = new PencilBrush(canvas);
    brush.color = color + Math.round(opacity * 255).toString(16).padStart(2, "0");
    brush.width = size;
    canvas.freeDrawingBrush = brush;
    setActiveTool("brush");
  }, [setActiveTool]);

  const setEraserMode = useCallback(({ size = 20 } = {}) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = true;
    canvas.selection = false;
    const brush = new PencilBrush(canvas);
    brush.color = "rgba(255, 255, 255, 1)";
    brush.width = size;
    const ctx = canvas.contextTop;
    if (ctx) ctx.globalCompositeOperation = "destination-out";
    canvas.freeDrawingBrush = brush;
    setActiveTool("eraser");
  }, [setActiveTool]);

  // ─── Crop Mode ───────────────────────────────────────────────────────
  const startCropMode = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = false;

    const cropRect = new Rect({
      left: canvas.width * 0.25, top: canvas.height * 0.25,
      width: canvas.width * 0.5, height: canvas.height * 0.5,
      fill: "rgba(0, 0, 0, 0.1)", stroke: "#22c55e", strokeWidth: 2, strokeDashArray: [5, 5],
      cornerColor: "#22c55e", transparentCorners: false,
      id: "crop-rect", name: "Crop Region",
      selectable: true, evented: true, hasRotatingPoint: false,
    });

    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    canvas.requestRenderAll();
    setIsCropping(true);
    setActiveTool("crop");
  }, [setActiveTool]);

  const cancelCrop = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const cropRect = canvas.getObjects().find(o => o.id === "crop-rect");
    if (cropRect) canvas.remove(cropRect);
    canvas.requestRenderAll();
    setIsCropping(false);
    setActiveTool("select");
  }, [setActiveTool]);

  const applyCrop = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const cropRect = canvas.getObjects().find(o => o.id === "crop-rect");
    if (!cropRect) { cancelCrop(); return; }

    const rectBound = cropRect.getBoundingRect();
    cropRect.set("visible", false);
    canvas.discardActiveObject();
    canvas.renderAll();

    const multiplier = 2;
    const dataUrl = canvas.toDataURL({
      left: rectBound.left, top: rectBound.top,
      width: rectBound.width, height: rectBound.height,
      multiplier, format: "png"
    });

    FabricImage.fromURL(dataUrl).then((img) => {
      img.set({
        left: rectBound.left, top: rectBound.top,
        scaleX: 1 / multiplier, scaleY: 1 / multiplier,
        cornerStyle: "circle", cornerColor: "#5366ff", transparentCorners: false,
        id: `crop-${Date.now()}`, name: "Cropped Region",
      });
      addCustomControls(img);
      canvas.remove(cropRect);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      setIsCropping(false);
      setActiveTool("select");
      saveHistory();
    });
  }, [setActiveTool, saveHistory, cancelCrop, addCustomControls]);

  // ─── Add Objects ─────────────────────────────────────────────────────
  const addImage = useCallback((url, options = {}) => {
    if (!fabricRef.current) {
      console.warn("addImage: Canvas not ready");
      return;
    }
    const canvas = fabricRef.current;
    
    // Use fromURL for better compatibility in Fabric 7
    FabricImage.fromURL(url).then((img) => {
      const maxW = canvas.width * 0.85;
      const maxH = canvas.height * 0.85;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      
      img.set({
        left: (canvas.width - img.width * scale) / 2,
        top: (canvas.height - img.height * scale) / 2,
        scaleX: scale, scaleY: scale,
        cornerStyle: "circle", cornerColor: "#5366ff", transparentCorners: false,
        id: `img-${Date.now()}`, name: "Image Layer",
        ...options,
      });

      addCustomControls(img);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      console.log("addImage success:", img.id);
    }).catch(err => {
      console.error("addImage failure:", err);
    });
  }, [addCustomControls]);

  const replaceImage = useCallback((url) => {
    if (!fabricRef.current || !selectedObject || selectedObject.type !== "image") {
      addImage(url);
      return;
    }
    const canvas = fabricRef.current;
    const old = selectedObject;

    FabricImage.fromURL(url).then((newImg) => {
      newImg.set({
        left: old.left, top: old.top, scaleX: old.scaleX, scaleY: old.scaleY,
        angle: old.angle, flipX: old.flipX, flipY: old.flipY,
        cornerStyle: "circle", cornerColor: "#5366ff", transparentCorners: false,
        id: old.id, name: old.name,
      });
      addCustomControls(newImg);
      const idx = canvas.getObjects().indexOf(old);
      canvas.remove(old);
      canvas.add(newImg);
      canvas.moveObjectTo(newImg, idx);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();
      saveHistory();
    });
  }, [selectedObject, addImage, addCustomControls, saveHistory]);

  const addText = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const t = new Textbox("Double-click to edit", {
      left: canvas.width / 2 - 130, top: canvas.height / 2 - 20, width: 260,
      fontSize: 32, fontFamily: "Inter", fill: "#ffffff",
      cornerStyle: "circle", cornerColor: "#5366ff", transparentCorners: false,
      id: `text-${Date.now()}`, name: "Text Layer",
    });
    addCustomControls(t);
    canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
  }, [addCustomControls]);

  const addShape = useCallback((type) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const common = {
      left: canvas.width / 2 - 60, top: canvas.height / 2 - 60,
      fill: "#5366ff", opacity: 0.9, cornerStyle: "circle", cornerColor: "#5366ff",
      transparentCorners: false, id: `shape-${Date.now()}`,
      name: `${type[0].toUpperCase() + type.slice(1)} Layer`,
    };
    let shape;
    switch (type) {
      case "circle": shape = new Circle({ ...common, radius: 60 }); break;
      case "triangle": shape = new Triangle({ ...common, width: 120, height: 120 }); break;
      case "line": shape = new Line([canvas.width / 2 - 70, canvas.height / 2, canvas.width / 2 + 70, canvas.height / 2], { ...common, fill: "transparent", stroke: "#5366ff", strokeWidth: 4 }); break;
      default: shape = new Rect({ ...common, width: 120, height: 120, rx: 12, ry: 12 }); break;
    }
    addCustomControls(shape);
    canvas.add(shape); canvas.setActiveObject(shape); canvas.requestRenderAll();
  }, [addCustomControls]);

  const flipSelected = useCallback((axis) => {
    if (!fabricRef.current || !selectedObject) return;
    if (axis === "x") selectedObject.set("flipX", !selectedObject.flipX);
    else selectedObject.set("flipY", !selectedObject.flipY);
    selectedObject.setCoords(); fabricRef.current.requestRenderAll(); saveHistory();
  }, [selectedObject, saveHistory]);

  const rotateSelected = useCallback((delta) => {
    if (!fabricRef.current || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle + delta) % 360);
    selectedObject.setCoords(); fabricRef.current.requestRenderAll();
    setObjectState(prev => ({ ...prev, angle: Math.round(selectedObject.angle) }));
    saveHistory();
  }, [selectedObject, saveHistory]);

  const deleteSelected = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.remove(selectedObject);
    fabricRef.current.requestRenderAll();
    setSelectedObject(null);
    setObjectState(DEFAULT_OBJECT_STATE);
    setEffects(DEFAULT_EFFECTS);
    saveHistory();
  }, [selectedObject, saveHistory]);

  const alignToCanvas = useCallback((axis) => {
    if (!fabricRef.current || !selectedObject) return;
    const c = fabricRef.current;
    if (axis === "center") selectedObject.set("left", (c.width - selectedObject.getScaledWidth()) / 2);
    else if (axis === "middle") selectedObject.set("top", (c.height - selectedObject.getScaledHeight()) / 2);
    else if (axis === "left") selectedObject.set("left", 0);
    else if (axis === "right") selectedObject.set("left", c.width - selectedObject.getScaledWidth());
    else if (axis === "top") selectedObject.set("top", 0);
    else if (axis === "bottom") selectedObject.set("top", c.height - selectedObject.getScaledHeight());
    selectedObject.setCoords(); c.requestRenderAll();
    setObjectState(prev => ({ ...prev, x: Math.round(selectedObject.left), y: Math.round(selectedObject.top) }));
    saveHistory();
  }, [selectedObject, saveHistory]);

  const changeOrder = useCallback((direction) => {
    if (!fabricRef.current || !selectedObject) return;
    if (direction === "front") fabricRef.current.bringObjectToFront(selectedObject);
    else if (direction === "back") fabricRef.current.sendObjectToBack(selectedObject);
    else if (direction === "forward") fabricRef.current.bringObjectForward(selectedObject);
    else if (direction === "backward") fabricRef.current.sendObjectBackwards(selectedObject);
    fabricRef.current.requestRenderAll(); saveHistory();
  }, [selectedObject, saveHistory]);

  const exportCanvas = useCallback((format = "png", multiplier = 2) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    const url = canvas.toDataURL({ format, multiplier });
    const a = document.createElement("a");
    a.href = url; a.download = `export.${format}`; a.click();
  }, []);

  return {
    fabricRef, selectedObject, objectState, effects, activeTool, isCropping,
    setObjectState, setEffects, setActiveTool, initCanvas, disposeCanvas, saveHistory,
    undo, redo, setSelectMode, setBrushMode, setEraserMode, startCropMode, applyCrop, cancelCrop,
    addImage, replaceImage, addText, addShape, flipSelected, rotateSelected, deleteSelected,
    alignToCanvas, changeOrder, exportCanvas,
  };
};
