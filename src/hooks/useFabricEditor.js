import { useCallback, useRef, useState, useEffect } from "react";
import {
  Canvas,
  FabricImage,
  Control,
  util,
  Rect,
  Circle,
  Triangle,
  Textbox,
  Line,
  PencilBrush,
  Polygon,
  Group,
  Shadow,
  Ellipse,
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

  // Tool-shortcut ref — populated after mode callbacks are defined (see bottom of hook)
  const toolShortcutsRef = useRef({});
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isHistoryProcessingRef = useRef(false);
  const activeToolRef = useRef("select");

  const setActiveTool = useCallback((tool) => {
    const canvas = fabricRef.current;
    if (activeToolRef.current === tool) return;

    if (canvas) {
      // 1. Cleanup polygon state if switching away from polygon
      if (activeToolRef.current === "polygon") {
        if (canvas.tempLines) {
          canvas.tempLines.forEach((l) => canvas.remove(l));
        }
        if (canvas.activeLine) {
          canvas.remove(canvas.activeLine);
        }
        canvas.polyPoints = [];
        canvas.tempLines = [];
        canvas.activeLine = null;
        canvas.requestRenderAll();
      }

      // 2. Cleanup arrow state if switching away from arrow
      if (activeToolRef.current === "arrow") {
        if (canvas.arrowLine) canvas.remove(canvas.arrowLine);
        if (canvas.arrowHead) canvas.remove(canvas.arrowHead);
        canvas.arrowLine = null;
        canvas.arrowHead = null;
        canvas.requestRenderAll();
      }

      // 3. Cleanup lasso state if switching away from lasso
      if (activeToolRef.current === "lasso") {
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = "default";
        canvas.getObjects().forEach((o) => {
          o.selectable = true;
          o.evented = true;
        });
        setIsCropping(false);
        canvas.requestRenderAll();
      }

      // 4. Cleanup eraser mode if switching away from eraser
      if (activeToolRef.current === "eraser" && canvas._eraserCleanup) {
        canvas._eraserCleanup();
        canvas._eraserCleanup = null;
      }

      // 5. Cleanup magnetic lasso if switching away from it
      if (
        activeToolRef.current === "magneticLasso" &&
        canvas._magneticCleanup
      ) {
        canvas._magneticCleanup();
        canvas._magneticCleanup = null;
      }
    }

    activeToolRef.current = tool;
    _setActiveTool(tool);
  }, []);

  // ─── History ────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    if (!fabricRef.current || isHistoryProcessingRef.current) return;
    try {
      const canvasObjects = fabricRef.current
        .getObjects()
        .filter((o) => !o.id?.toString().startsWith("crop-rect"));
      const json = fabricRef.current.toObject([
        "id",
        "name",
        "effectsData",
        "_skipHistoryOnAdd",
      ]);
      json.objects = canvasObjects.map((o) =>
        o.toObject(["id", "name", "effectsData", "_skipHistoryOnAdd"]),
      );

      if (historyIndexRef.current < historyRef.current.length - 1)
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1,
        );
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
    if (
      historyIndexRef.current >= historyRef.current.length - 1 ||
      isHistoryProcessingRef.current
    )
      return;
    historyIndexRef.current++;
    restoreHistory(historyRef.current[historyIndexRef.current]);
  }, [restoreHistory]);

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        e.preventDefault();
        const canvas = fabricRef.current;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj && !obj.isEditing) {
          canvas.remove(obj);
          canvas.requestRenderAll();
          saveHistory();
        }
      } else if (e.key === "Escape") {
        toolShortcutsRef.current.setSelectMode?.();
      } else if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Tool shortcuts — resolved via ref so no definition-order issue
        const s = toolShortcutsRef.current;
        switch (e.key.toLowerCase()) {
          case "v":
            s.setSelectMode?.();
            break;
          case "h":
            s.setPanMode?.();
            break;
          case "b":
            s.setBrushMode?.();
            break;
          case "e":
            s.setEraserMode?.();
            break;
          case "l":
            s.startLassoMode?.();
            break;
          case "m":
            s.startMagneticLasso?.();
            break;
          case "p":
            s.setPolygonMode?.();
            break;
          case "a":
            s.setArrowMode?.();
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, saveHistory]);

  // ─── Custom Controls ─────────────────────────────────────────────────
  const addCustomControls = useCallback(
    (obj) => {
      if (!obj) return;
      const svgUrl =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444' stroke='white' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='15' y1='9' x2='9' y2='15'/%3E%3Cline x1='9' y1='9' x2='15' y2='15'/%3E%3C/svg%3E";
      const img = document.createElement("img");
      img.src = svgUrl;
      obj.controls.deleteControl = new Control({
        x: 0.5,
        y: -0.5,
        offsetY: -16,
        offsetX: 16,
        cursorStyle: "pointer",
        mouseUpHandler: (_, transform) => {
          const t = transform.target;
          t.canvas?.remove(t);
          t.canvas?.requestRenderAll();
          saveHistory();
          return true;
        },
        render: (ctx, left, top, _, fabricObject) => {
          const s = 24;
          ctx.save();
          ctx.translate(left, top);
          ctx.rotate(util.degreesToRadians(fabricObject.angle));
          ctx.drawImage(img, -s / 2, -s / 2, s, s);
          ctx.restore();
        },
      });
    },
    [saveHistory],
  );

  // ─── Canvas Init ─────────────────────────────────────────────────────

  const initCanvas = useCallback(
    (el) => {
      if (!el) return;
      if (fabricRef.current) return fabricRef.current;
      if (canvasInstances.has(el)) {
        fabricRef.current = canvasInstances.get(el);
        return fabricRef.current;
      }

      // Default canvas: 800 × 600 (user can resize at any time)
      const cw = 800;
      const ch = 600;

      const canvas = new Canvas(el, {
        width: cw,
        height: ch,
        backgroundColor: null,
        preserveObjectStacking: true,
        selection: true,
      });
      canvasInstances.set(el, canvas);
      fabricRef.current = canvas;
      saveHistory();

      const syncSelection = (event) => {
        const obj = canvas.getActiveObject() || event?.target || null;
        if (!obj) {
          clearSel();
          return;
        }
        setSelectedObject(obj);
        setObjectState({
          x: Math.round(obj.left ?? 0),
          y: Math.round(obj.top ?? 0),
          angle: Math.round(obj.angle ?? 0),
          scaleX: Number((obj.scaleX ?? 1).toFixed(2)),
          scaleY: Number((obj.scaleY ?? 1).toFixed(2)),
          fill:
            typeof obj.fill === "string" ? obj.fill : DEFAULT_OBJECT_STATE.fill,
          opacity: obj.opacity ?? 1,
          fontFamily: obj.fontFamily ?? DEFAULT_OBJECT_STATE.fontFamily,
          flipX: obj.flipX ?? false,
          flipY: obj.flipY ?? false,
          width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
          height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
          charSpacing: obj.charSpacing ?? 0,
          lineHeight: obj.lineHeight ?? 1.16,
          textAlign: obj.textAlign ?? "left",
          direction: obj.direction ?? "ltr",
        });

        if (obj.type === "image") {
          // Prefer any stored per-object effects (set when adjustments are applied),
          // but fall back to computed values from the object's filters.
          const stored = obj.effectsData || obj.effects || {};
          const computed = {
            shadow: Boolean(obj.shadow),
            outline: Boolean(obj.strokeWidth && obj.strokeWidth > 0),
            blendMode: obj.globalCompositeOperation || "source-over",
            brightness:
              (obj.filters?.find((f) => f.type === "Brightness")?.brightness ||
                0) * 100,
            contrast:
              (obj.filters?.find((f) => f.type === "Contrast")?.contrast || 0) *
              100,
            saturation:
              (obj.filters?.find((f) => f.type === "Saturation")?.saturation ||
                0) * 100,
            exposure:
              (obj.filters?.find((f) => f.type === "Exposure")?.exposure || 0) *
              100,
            hue:
              (obj.filters?.find((f) => f.type === "HueRotation")?.rotation ||
                0) * 360,
            vibrance:
              (obj.filters?.find((f) => f.type === "Vibrance")?.vibrance || 0) *
              100,
            blur:
              (obj.filters?.find((f) => f.type === "Blur")?.blur || 0) * 100,
            noise: obj.filters?.find((f) => f.type === "Noise")?.noise || 0,
            preset: stored.preset || "none",
            curvePts: stored.curvePts || null,
            curveMidpoint: stored.curveMidpoint || 0,
            redMultiplier: stored.redMultiplier ?? 1,
            greenMultiplier: stored.greenMultiplier ?? 1,
            blueMultiplier: stored.blueMultiplier ?? 1,
          };
          setEffects((prev) => ({ ...prev, ...computed, ...stored }));
        } else {
          setEffects((prev) => ({
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
      canvas.on("object:modified", (e) => {
        syncSelection(e);
        saveHistory();
      });
      canvas.on("object:moving", (e) => {
        syncSelection(e);
      });
      canvas.on("object:added", (e) => {
        if (
          !isHistoryProcessingRef.current &&
          e.target?.type !== "activeSelection" &&
          e.target?.id !== "crop-rect" &&
          !e.target?._skipHistoryOnAdd // eraser/lasso commit their own history
        )
          saveHistory();
      });

      // ─── Global Mouse Handlers for Custom Tools ──────────────────────────
      // We store custom tool states directly on the canvas instance to allow external cleanup
      canvas.polyPoints = [];
      canvas.tempLines = [];
      canvas.activeLine = null;
      canvas.arrowLine = null;
      canvas.arrowHead = null;
      let isPanning = false,
        lastX = 0,
        lastY = 0,
        nativePanMoveHandler = null;

      // Attach a finish method to the canvas instance so event handlers can call it safely
      canvas.finishPolygon = () => {
        if (activeToolRef.current !== "polygon") return;

        // Restore interactivity
        canvas.getObjects().forEach((o) => {
          o.selectable = true;
          o.evented = true;
        });
        canvas.selection = true;
        canvas.defaultCursor = "default";

        if (canvas.tempLines) canvas.tempLines.forEach((l) => canvas.remove(l));
        if (canvas.activeLine) canvas.remove(canvas.activeLine);

        if (canvas.polyPoints && canvas.polyPoints.length > 2) {
          const uniquePoints = [];
          canvas.polyPoints.forEach((p) => {
            if (uniquePoints.length === 0) uniquePoints.push(p);
            else {
              const last = uniquePoints[uniquePoints.length - 1];
              if (Math.hypot(p.x - last.x, p.y - last.y) > 1)
                uniquePoints.push(p);
            }
          });
          if (uniquePoints.length > 2) {
            const polygon = new Polygon(uniquePoints, {
              fill: "rgba(83,102,255,0.3)",
              stroke: "#5366ff",
              strokeWidth: 2,
              name: "Polygon",
              id: `polygon-${Date.now()}`,
              cornerStyle: "circle",
              cornerColor: "#5366ff",
              transparentCorners: false,
            });
            addCustomControls(polygon);
            canvas.add(polygon);
            canvas.setActiveObject(polygon);
            saveHistory();
          }
        }

        canvas.polyPoints = [];
        canvas.tempLines = [];
        canvas.activeLine = null;
        activeToolRef.current = "select";
        _setActiveTool("select");
      };

      const getClientPos = (ev) => {
        if (!ev) return { x: 0, y: 0 };
        const src = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
        return { x: src.clientX, y: src.clientY };
      };

      canvas.on("mouse:down", (opt) => {
        const e = opt.e;
        const tool = activeToolRef.current;
        // Skip for tools that have their own dedicated event handlers
        if (tool === "eraser" || tool === "brush" || tool === "lasso" || tool === "magneticLasso" || tool === "crop") return;
        const pointer = canvas.getScenePoint(opt.e);

        if (tool === "pan") {
          isPanning = true;
          const pos = getClientPos(e);
          lastX = pos.x;
          lastY = pos.y;
          canvas.defaultCursor = "grabbing";
          try {
            document.body.style.cursor = "grabbing";
          } catch {
            /* ignore */
          }

          if (nativePanMoveHandler) {
            document.removeEventListener("mousemove", nativePanMoveHandler);
          }
          nativePanMoveHandler = (nativeE) => {
            if (!isPanning) return;
            const wrapper = document.querySelector(".canvas-workspace");
            const dx = nativeE.clientX - lastX;
            const dy = nativeE.clientY - lastY;
            if (wrapper) {
              wrapper.scrollLeft -= dx;
              wrapper.scrollTop -= dy;
            }
            lastX = nativeE.clientX;
            lastY = nativeE.clientY;
          };
          document.addEventListener("mousemove", nativePanMoveHandler);
        } else if (tool === "arrow") {
          const points = [pointer.x, pointer.y, pointer.x, pointer.y];
          canvas.arrowLine = new Line(points, {
            strokeWidth: 4,
            fill: "#ff0000",
            stroke: "#ff0000",
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          });
          canvas.arrowHead = new Triangle({
            width: 15,
            height: 15,
            fill: "#ff0000",
            left: pointer.x,
            top: pointer.y,
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          });
          canvas.add(canvas.arrowLine, canvas.arrowHead);
        } else if (tool === "polygon") {
          // If user clicked near the first point, finish the polygon
          if (canvas.polyPoints && canvas.polyPoints.length > 0) {
            const first = canvas.polyPoints[0];
            const dx = pointer.x - first.x;
            const dy = pointer.y - first.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 8 && canvas.polyPoints.length > 2) {
              canvas.finishPolygon();
              return;
            }
          }

          canvas.polyPoints.push({ x: pointer.x, y: pointer.y });

          if (canvas.activeLine) {
            canvas.tempLines.push(canvas.activeLine);
            canvas.activeLine = null;
          }

          canvas.activeLine = new Line(
            [pointer.x, pointer.y, pointer.x, pointer.y],
            {
              stroke: "#5366ff",
              strokeWidth: 2,
              selectable: false,
              evented: false,
            },
          );
          canvas.add(canvas.activeLine);
        }
      });

      canvas.on("mouse:move", (opt) => {
        const tool = activeToolRef.current;
        // Skip for tools that have their own dedicated event handlers
        if (tool === "eraser" || tool === "brush" || tool === "lasso" || tool === "magneticLasso" || tool === "crop") return;
        const pointer = canvas.getScenePoint(opt.e);

        if (tool === "pan") {
          // Handled by native document listener
        } else if (tool === "arrow" && canvas.arrowLine && canvas.arrowHead) {
          canvas.arrowLine.set({ x2: pointer.x, y2: pointer.y });
          canvas.arrowHead.set({ left: pointer.x, top: pointer.y });
          const dx = pointer.x - canvas.arrowLine.x1;
          const dy = pointer.y - canvas.arrowLine.y1;
          canvas.arrowHead.set({
            angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
          });
          canvas.requestRenderAll();
        } else if (tool === "polygon" && canvas.polyPoints.length > 0) {
          if (!canvas.activeLine) {
            const lastPt = canvas.polyPoints[canvas.polyPoints.length - 1];
            canvas.activeLine = new Line(
              [lastPt.x, lastPt.y, pointer.x, pointer.y],
              {
                stroke: "#5366ff",
                strokeWidth: 2,
                selectable: false,
                evented: false,
              },
            );
            canvas.add(canvas.activeLine);
          } else {
            canvas.activeLine.set({ x2: pointer.x, y2: pointer.y });
          }
          canvas.requestRenderAll();
        }
      });

      canvas.on("mouse:up", () => {
        const tool = activeToolRef.current;
        // Skip for tools that have their own dedicated event handlers
        if (tool === "eraser" || tool === "brush" || tool === "lasso" || tool === "magneticLasso" || tool === "crop") return;
        if (tool === "pan") {
          isPanning = false;
          canvas.defaultCursor = "grab";
          try {
            document.body.style.cursor = "grab";
          } catch {
            /* ignore */
          }
          if (nativePanMoveHandler) {
            document.removeEventListener("mousemove", nativePanMoveHandler);
            nativePanMoveHandler = null;
          }
        } else if (tool === "arrow" && canvas.arrowLine && canvas.arrowHead) {
          // Restore all objects' interactivity first
          canvas.getObjects().forEach((o) => {
            o.selectable = true;
            o.evented = true;
          });
          canvas.selection = true;
          canvas.defaultCursor = "default";

          // Compute a minimal bounding rect for the arrow
          const x1 = canvas.arrowLine.x1,
            y1 = canvas.arrowLine.y1,
            x2 = canvas.arrowLine.x2,
            y2 = canvas.arrowLine.y2;
          // Only add if the user actually dragged (not a click in place)
          if (Math.hypot(x2 - x1, y2 - y1) > 5) {
            const grp = new Group([canvas.arrowLine, canvas.arrowHead], {
              name: "Arrow",
              id: `arrow-${Date.now()}`,
            });
            canvas.remove(canvas.arrowLine, canvas.arrowHead);
            addCustomControls(grp);
            canvas.add(grp);
            canvas.setActiveObject(grp);
            saveHistory();
          } else {
            canvas.remove(canvas.arrowLine, canvas.arrowHead);
          }

          canvas.arrowLine = null;
          canvas.arrowHead = null;
          activeToolRef.current = "select";
          _setActiveTool("select");
        }
      });

      canvas.on("path:created", (e) => {
        const path = e.path;
        if (!path) return;
        if (activeToolRef.current === "brush") {
          path.set({ name: "Brush Stroke", _skipHistoryOnAdd: true });
          saveHistory();
        }
      });

      // Attach double click to canvas wrapper
      const wrapper = document.querySelector(".canvas-workspace");
      if (wrapper)
        wrapper.addEventListener("dblclick", () =>
          fabricRef.current?.finishPolygon?.(),
        );

      const handleKeydown = (e) => {
        if (
          (e.key === "Enter" || e.key === "Escape") &&
          activeToolRef.current === "polygon"
        ) {
          fabricRef.current?.finishPolygon?.();
        }
      };
      window.addEventListener("keydown", handleKeydown);

      return canvas;
    },
    [saveHistory, addCustomControls],
  );

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
    fabricRef.current.defaultCursor = "default";
    fabricRef.current.getObjects().forEach((o) => {
      o.selectable = true;
      o.evented = true;
    });
    setActiveTool("select");
  }, [setActiveTool]);

  const setPanMode = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    fabricRef.current.selection = false;
    fabricRef.current.defaultCursor = "grab";
    fabricRef.current.getObjects().forEach((o) => {
      o.selectable = false;
      o.evented = false;
    });
    setActiveTool("pan");
  }, [setActiveTool]);

  const setBrushMode = useCallback(
    ({
      size = 20,
      color = "#ff6b6b",
      opacity = 1,
      hardness = 100,
      tipShape = "round",
    } = {}) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      canvas.isDrawingMode = true;
      canvas.selection = false;
      const brush = new PencilBrush(canvas);
      brush.color =
        color +
        Math.round(opacity * 255)
          .toString(16)
          .padStart(2, "0");
      brush.width = size;

      if (tipShape === "square") {
        brush.strokeLineCap = "square";
        brush.strokeLineJoin = "miter";
      } else {
        brush.strokeLineCap = "round";
        brush.strokeLineJoin = "round";
      }

      if (hardness < 100) {
        // Simulate soft brush with shadow
        const blurAmount = ((100 - hardness) / 100) * (size / 2);
        brush.shadow = new Shadow({
          blur: blurAmount,
          color: brush.color,
          offsetX: 0,
          offsetY: 0,
        });
      } else {
        brush.shadow = null;
      }

      canvas.freeDrawingBrush = brush;
      setActiveTool("brush");
    },
    [setActiveTool],
  );

  const setEraserMode = useCallback(
    ({ size = 20 } = {}) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;

      // ── Tear down any previous eraser session cleanly ──────────────────
      if (canvas._eraserCleanup) {
        canvas._eraserCleanup();
        canvas._eraserCleanup = null;
      }

      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.discardActiveObject();
      canvas.getObjects().forEach((o) => {
        o.selectable = false;
        o.evented = false;
      });
      canvas.requestRenderAll();
      setActiveTool("eraser");

      // ── Overlay canvas for live stroke preview ─────────────────────────
      const lowerEl = canvas.lowerCanvasEl ?? canvas.getElement();
      const overlay = document.createElement("canvas");
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      Object.assign(overlay.style, {
        position: "absolute",
        inset: 0,
        width: lowerEl.style.width || canvas.width + "px",
        height: lowerEl.style.height || canvas.height + "px",
        pointerEvents: "none",
        zIndex: 10,
      });
      const parent = lowerEl.parentElement;
      parent.appendChild(overlay);
      const overlayCtx = overlay.getContext("2d");

      // ── Per-stroke state ───────────────────────────────────────────────
      let isErasing = false;
      let targetObj = null; // The Fabric object being erased
      let offscreen = null; // Working pixel copy of the target object
      let offCtx = null;
      let offBounds = null; // { left, top, width, height } in canvas coords
      let eraserSize = size;
      let lastPoint = null;

      // ── FIX 1: resolve the topmost erasable object (any type) ──────────
      const getTopObjectAt = (pt) => {
        const objects = canvas.getObjects();
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if (obj.excludeFromLayers) continue;
          // Skip the canvas background rect if any
          if (obj.id?.toString().startsWith("crop-rect")) continue;
          const bound = obj.getBoundingRect(true);
          if (
            pt.x >= bound.left &&
            pt.x <= bound.left + bound.width &&
            pt.y >= bound.top &&
            pt.y <= bound.top + bound.height
          ) {
            return obj;
          }
        }
        return null;
      };

      // Render any Fabric object (image, path, shape, text…) into an
      // offscreen canvas at its natural bounding-box size.
      const initOffscreen = (obj) => {
        const bound = obj.getBoundingRect(true);
        offBounds = {
          left: bound.left,
          top: bound.top,
          width: bound.width,
          height: bound.height,
        };

        // Use 2× for sharpness
        const scale = 2;
        offscreen = document.createElement("canvas");
        offscreen.width = Math.ceil(bound.width * scale);
        offscreen.height = Math.ceil(bound.height * scale);
        offCtx = offscreen.getContext("2d");
        offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

        // Render the object into the bounding-box coordinate space.
        // obj.render() internally calls obj.transform(ctx) which applies
        // calcTransformMatrix() — that already handles position, rotation, and scale.
        // We only need to translate to bound origin and apply the 2x scale.
        offCtx.save();
        offCtx.scale(scale, scale);
        offCtx.translate(-bound.left, -bound.top);
        obj.render(offCtx);
        offCtx.restore();
      };

      // Erase a circle at canvas-space point `pt` into the offscreen buffer
      const erasePoint = (pt) => {
        if (!offCtx || !offBounds) return;
        const scale = offscreen.width / offBounds.width;

        // Map canvas coords → offscreen pixel coords
        const ox = (pt.x - offBounds.left) * scale;
        const oy = (pt.y - offBounds.top) * scale;
        const r = (eraserSize / 2) * scale;

        offCtx.save();
        offCtx.globalCompositeOperation = "destination-out";
        offCtx.beginPath();
        offCtx.arc(ox, oy, Math.max(r, 1), 0, Math.PI * 2);
        offCtx.fillStyle = "rgba(0,0,0,1)";
        offCtx.fill();
        offCtx.restore();
      };

      // Interpolated erase between two canvas-space points
      const eraseStroke = (from, to) => {
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(dist / (eraserSize / 4)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          erasePoint({
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          });
        }
      };

      // Draw eraser cursor ring on overlay
      const drawCursor = (pt) => {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        overlayCtx.save();
        overlayCtx.beginPath();
        overlayCtx.arc(pt.x, pt.y, eraserSize / 2, 0, Math.PI * 2);
        overlayCtx.strokeStyle = "rgba(255,255,255,0.8)";
        overlayCtx.lineWidth = 1.5;
        overlayCtx.setLineDash([3, 3]);
        overlayCtx.stroke();
        overlayCtx.restore();
      };

      // Commit offscreen buffer → replace Fabric object with erased FabricImage
      const commitErase = async (obj) => {
        if (!offscreen || !obj || !offBounds) return;
        const dataUrl = offscreen.toDataURL("image/png");
        return new Promise((resolve) => {
          FabricImage.fromURL(dataUrl).then((newImg) => {
            const scale = offscreen.width / offBounds.width;
            newImg.set({
              left: offBounds.left,
              top: offBounds.top,
              scaleX: 1 / scale,
              scaleY: 1 / scale,
              angle: 0, // bounding-box image is already axis-aligned
              flipX: false,
              flipY: false,
              opacity: obj.opacity,
              shadow: obj.shadow,
              cornerStyle: "circle",
              cornerColor: "#5366ff",
              transparentCorners: false,
              selectable: false,
              evented: false,
              id: obj.id,
              name: obj.name,
              originX: "left",
              originY: "top",
              _skipHistoryOnAdd: true, // commitErase calls saveHistory() itself
            });
            // Preserve adjustment state so Adjustments panel stays correct
            if (obj.effectsData) newImg.effectsData = obj.effectsData;
            addCustomControls(newImg);
            const idx = canvas.getObjects().indexOf(obj);
            canvas.remove(obj);
            canvas.add(newImg);
            if (idx >= 0) canvas.moveObjectTo(newImg, idx);
            canvas.requestRenderAll();
            saveHistory();
            resolve(newImg);
          });
        });
      };

      // ── Mouse event handlers ───────────────────────────────────────────
      const onMouseDown = (opt) => {
        if (activeToolRef.current !== "eraser") return;
        opt.e.preventDefault?.();
        opt.e.stopPropagation?.();
        const ptr = canvas.getScenePoint(opt.e);
        targetObj = getTopObjectAt(ptr);
        if (!targetObj) return;
        isErasing = true;
        initOffscreen(targetObj);
        lastPoint = ptr;
        erasePoint(ptr);
      };

      const onMouseMove = (opt) => {
        const ptr = canvas.getScenePoint(opt.e);
        drawCursor(ptr);
        if (!isErasing || !targetObj || !offscreen) return;
        eraseStroke(lastPoint, ptr);
        lastPoint = ptr;
      };

      const onMouseUp = async () => {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        if (!isErasing || !targetObj) {
          isErasing = false;
          targetObj = null;
          offscreen = null;
          offCtx = null;
          offBounds = null;
          lastPoint = null;
          return;
        }
        const obj = targetObj;
        isErasing = false;
        targetObj = null;
        lastPoint = null;
        await commitErase(obj);
        offscreen = null;
        offCtx = null;
        offBounds = null;
      };

      const onMouseOut = () => {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      };

      canvas.on("mouse:down", onMouseDown);
      canvas.on("mouse:move", onMouseMove);
      canvas.on("mouse:up", onMouseUp);
      canvas.on("mouse:out", onMouseOut);

      // ── FIX 2: cleanup only removes listeners & overlay — does NOT
      //    reset isDrawingMode/selection/selectable so the next tool
      //    (e.g. brush) is free to set those itself without being clobbered.
      canvas._eraserCleanup = () => {
        canvas.off("mouse:down", onMouseDown);
        canvas.off("mouse:move", onMouseMove);
        canvas.off("mouse:up", onMouseUp);
        canvas.off("mouse:out", onMouseOut);
        overlay.remove();
        // Restore objects to interactive state
        canvas.getObjects().forEach((o) => {
          o.selectable = true;
          o.evented = true;
        });
        canvas.requestRenderAll();
      };
    },
    [setActiveTool, addCustomControls, saveHistory],
  );

  // ─── Crop Mode ───────────────────────────────────────────────────────
  const startCropMode = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    if (
      canvas.getObjects().some((o) => o.id?.toString().startsWith("crop-rect"))
    )
      return;
    canvas.isDrawingMode = false;

    const cropRect = new Rect({
      left: canvas.width / 2,
      top: canvas.height / 2,
      originX: "center",
      originY: "center",
      width: canvas.width * 0.5,
      height: canvas.height * 0.5,
      fill: "rgba(0, 0, 0, 0.1)",
      stroke: "#22c55e",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: "#22c55e",
      transparentCorners: false,
      id: `crop-rect-${Date.now()}`,
      name: "Crop Region",
      excludeFromLayers: true,
      selectable: true,
      evented: true,
      hasRotatingPoint: false,
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
    const cropRect = canvas
      .getObjects()
      .find((o) => o.id?.toString().startsWith("crop-rect"));
    if (cropRect) canvas.remove(cropRect);
    canvas.requestRenderAll();
    setIsCropping(false);
    setActiveTool("select");
  }, [setActiveTool]);

  const applyCrop = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const cropRect = canvas
      .getObjects()
      .find((o) => o.id?.toString().startsWith("crop-rect"));
    if (!cropRect) {
      cancelCrop();
      return;
    }

    const rectBound = cropRect.getBoundingRect();
    cropRect.set("visible", false);
    canvas.discardActiveObject();
    canvas.renderAll();

    const multiplier = 2;
    const dataUrl = canvas.toDataURL({
      left: rectBound.left,
      top: rectBound.top,
      width: rectBound.width,
      height: rectBound.height,
      multiplier,
      format: "png",
    });

    FabricImage.fromURL(dataUrl).then((img) => {
      img.set({
        left: rectBound.left,
        top: rectBound.top,
        scaleX: 1 / multiplier,
        scaleY: 1 / multiplier,
        cornerStyle: "circle",
        cornerColor: "#5366ff",
        transparentCorners: false,
        id: `crop-${Date.now()}`,
        name: "Cropped Region",
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
  const addImage = useCallback(
    (url, options = {}) => {
      if (!fabricRef.current) {
        console.warn("addImage: Canvas not ready");
        return;
      }
      const canvas = fabricRef.current;

      // Use fromURL for better compatibility in Fabric 7
      FabricImage.fromURL(url)
        .then((img) => {
          const maxW = canvas.width * 0.85;
          const maxH = canvas.height * 0.85;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);

          img.set({
            left: (canvas.width - img.width * scale) / 2,
            top: (canvas.height - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            cornerStyle: "circle",
            cornerColor: "#5366ff",
            transparentCorners: false,
            id: `img-${Date.now()}`,
            name: "Image Layer",
            ...options,
          });

          addCustomControls(img);
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          console.log("addImage success:", img.id);
        })
        .catch((err) => {
          console.error("addImage failure:", err);
        });
    },
    [addCustomControls],
  );

  const replaceImage = useCallback(
    (url) => {
      if (
        !fabricRef.current ||
        !selectedObject ||
        selectedObject.type !== "image"
      ) {
        addImage(url);
        return;
      }
      const canvas = fabricRef.current;
      const old = selectedObject;

      FabricImage.fromURL(url).then((newImg) => {
        newImg.set({
          left: old.left,
          top: old.top,
          scaleX: old.scaleX,
          scaleY: old.scaleY,
          angle: old.angle,
          flipX: old.flipX,
          flipY: old.flipY,
          cornerStyle: "circle",
          cornerColor: "#5366ff",
          transparentCorners: false,
          id: old.id,
          name: old.name,
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
    },
    [selectedObject, addImage, addCustomControls, saveHistory],
  );

  const addText = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const t = new Textbox("Double-click to edit", {
      left: canvas.width / 2 - 130,
      top: canvas.height / 2 - 20,
      width: 260,
      fontSize: 32,
      fontFamily: "Inter",
      fill: "#ffffff",
      cornerStyle: "circle",
      cornerColor: "#5366ff",
      transparentCorners: false,
      id: `text-${Date.now()}`,
      name: "Text Layer",
    });
    addCustomControls(t);
    canvas.add(t);
    canvas.setActiveObject(t);
    setTimeout(() => {
      if (t.enterEditing) t.enterEditing();
      canvas.requestRenderAll();
    }, 50);
  }, [addCustomControls]);

  const addShape = useCallback(
    (type) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      const common = {
        left: canvas.width / 2 - 60,
        top: canvas.height / 2 - 60,
        fill: "#5366ff",
        opacity: 0.9,
        cornerStyle: "circle",
        cornerColor: "#5366ff",
        transparentCorners: false,
        id: `shape-${Date.now()}`,
        name: `${type[0].toUpperCase() + type.slice(1)} Layer`,
      };
      let shape;
      switch (type) {
        case "circle":
          shape = new Circle({ ...common, radius: 60 });
          break;
        case "triangle":
          shape = new Triangle({ ...common, width: 120, height: 120 });
          break;
        case "line":
          shape = new Line(
            [
              canvas.width / 2 - 70,
              canvas.height / 2,
              canvas.width / 2 + 70,
              canvas.height / 2,
            ],
            {
              ...common,
              fill: "transparent",
              stroke: "#5366ff",
              strokeWidth: 4,
            },
          );
          break;
        case "ellipse":
          shape = new Ellipse({ ...common, rx: 60, ry: 40 });
          break;
        case "rounded-rect":
          shape = new Rect({ ...common, width: 120, height: 120, rx: 24, ry: 24 });
          break;
        case "right-triangle":
          shape = new Polygon([
            {x: -60, y: 55},
            {x: 60, y: 55},
            {x: -60, y: -55},
          ], { ...common });
          break;
        case "diamond":
          shape = new Polygon([
            {x: 0, y: -70},
            {x: 55, y: 0},
            {x: 0, y: 70},
            {x: -55, y: 0},
          ], { ...common });
          break;
        case "pentagon":
          shape = new Polygon([
            {x: 0, y: -70},
            {x: 67, y: -22},
            {x: 41, y: 57},
            {x: -41, y: 57},
            {x: -67, y: -22},
          ], { ...common });
          break;
        case "hexagon":
          shape = new Polygon([
            {x: 70, y: 0},
            {x: 35, y: 61},
            {x: -35, y: 61},
            {x: -70, y: 0},
            {x: -35, y: -61},
            {x: 35, y: -61},
          ], { ...common });
          break;
        case "octagon":
          shape = new Polygon([
            {x: 65, y: 27},
            {x: 27, y: 65},
            {x: -27, y: 65},
            {x: -65, y: 27},
            {x: -65, y: -27},
            {x: -27, y: -65},
            {x: 27, y: -65},
            {x: 65, y: -27},
          ], { ...common });
          break;
        case "star":
          shape = new Polygon([
            {x: 0, y: -70},
            {x: 16, y: -22},
            {x: 67, y: -22},
            {x: 26, y: 8},
            {x: 41, y: 57},
            {x: 0, y: 27},
            {x: -41, y: 57},
            {x: -26, y: 8},
            {x: -67, y: -22},
            {x: -16, y: -22},
          ], { ...common });
          break;
        default:
          shape = new Rect({
            ...common,
            width: 120,
            height: 120,
            rx: 0,
            ry: 0,
          });
          break;
      }
      addCustomControls(shape);
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
    },
    [addCustomControls],
  );

  const flipSelected = useCallback(
    (axis) => {
      if (!fabricRef.current || !selectedObject) return;
      if (axis === "x") selectedObject.set("flipX", !selectedObject.flipX);
      else selectedObject.set("flipY", !selectedObject.flipY);
      selectedObject.setCoords();
      fabricRef.current.requestRenderAll();
      saveHistory();
    },
    [selectedObject, saveHistory],
  );

  const rotateSelected = useCallback(
    (delta) => {
      if (!fabricRef.current || !selectedObject) return;
      selectedObject.rotate((selectedObject.angle + delta) % 360);
      selectedObject.setCoords();
      fabricRef.current.requestRenderAll();
      setObjectState((prev) => ({
        ...prev,
        angle: Math.round(selectedObject.angle),
      }));
      saveHistory();
    },
    [selectedObject, saveHistory],
  );

  const deleteSelected = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.remove(selectedObject);
    fabricRef.current.requestRenderAll();
    setSelectedObject(null);
    setObjectState(DEFAULT_OBJECT_STATE);
    setEffects(DEFAULT_EFFECTS);
    saveHistory();
  }, [selectedObject, saveHistory]);

  const alignToCanvas = useCallback(
    (axis) => {
      if (!fabricRef.current || !selectedObject) return;
      const c = fabricRef.current;
      // Use getBoundingRect for accurate positioning regardless of originX/originY/angle
      const br = selectedObject.getBoundingRect();
      const sw = br.width;
      const sh = br.height;
      const offsetX = selectedObject.left - br.left; // distance from anchor to bounding box edge
      const offsetY = selectedObject.top - br.top;
      if (axis === "center")
        selectedObject.set("left", (c.width - sw) / 2 + offsetX);
      else if (axis === "middle")
        selectedObject.set("top", (c.height - sh) / 2 + offsetY);
      else if (axis === "left") selectedObject.set("left", offsetX);
      else if (axis === "right")
        selectedObject.set("left", c.width - sw + offsetX);
      else if (axis === "top") selectedObject.set("top", offsetY);
      else if (axis === "bottom")
        selectedObject.set("top", c.height - sh + offsetY);
      selectedObject.setCoords();
      c.requestRenderAll();
      setObjectState((prev) => ({
        ...prev,
        x: Math.round(selectedObject.left),
        y: Math.round(selectedObject.top),
      }));
      saveHistory();
    },
    [selectedObject, saveHistory],
  );

  const changeOrder = useCallback(
    (direction) => {
      if (!fabricRef.current || !selectedObject) return;
      if (direction === "front")
        fabricRef.current.bringObjectToFront(selectedObject);
      else if (direction === "back")
        fabricRef.current.sendObjectToBack(selectedObject);
      else if (direction === "forward")
        fabricRef.current.bringObjectForward(selectedObject);
      else if (direction === "backward")
        fabricRef.current.sendObjectBackwards(selectedObject);
      fabricRef.current.requestRenderAll();
      saveHistory();
    },
    [selectedObject, saveHistory],
  );

  const bringObjectBack = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    const canvas = fabricRef.current;
    const br = selectedObject.getBoundingRect(true);

    // Check if object is completely or mostly off-canvas
    if (
      br.left + br.width < 0 ||
      br.left > canvas.width ||
      br.top + br.height < 0 ||
      br.top > canvas.height
    ) {
      // Move to center of canvas
      selectedObject.set({
        left: (canvas.width - br.width) / 2,
        top: (canvas.height - br.height) / 2,
      });
      selectedObject.setCoords();
      canvas.requestRenderAll();
      setObjectState((prev) => ({
        ...prev,
        x: Math.round(selectedObject.left),
        y: Math.round(selectedObject.top),
      }));
      saveHistory();
    }
  }, [selectedObject, saveHistory]);

  const exportCanvas = useCallback(
    (format = "png", multiplier = 1, quality = 1) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      canvas.discardActiveObject();
      canvas.requestRenderAll();

      const originalBg = canvas.backgroundColor;
      if (format === "jpeg") canvas.backgroundColor = "#ffffff";
      else canvas.backgroundColor = null;
      canvas.requestRenderAll();

      // SVG export intentionally disabled — export as raster instead
      if (format === "svg") {
        console.warn("SVG export disabled; exporting PNG instead.");
        format = "png";
      }
      const url = canvas.toDataURL({ format, multiplier, quality });
      const ext = format === "jpeg" ? "jpg" : format;

      canvas.backgroundColor = originalBg;
      canvas.requestRenderAll();

      const a = document.createElement("a");
      a.href = url;
      a.download = `export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [],
  );

  const resizeCanvas = useCallback(
    (w, h, scaleContent) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      const scaleX = w / canvas.width;
      const scaleY = h / canvas.height;
      // Fabric v7 API: use setDimensions instead of setWidth/setHeight
      canvas.setDimensions({ width: w, height: h });
      if (scaleContent) {
        canvas.getObjects().forEach((obj) => {
          obj.scaleX = (obj.scaleX || 1) * scaleX;
          obj.scaleY = (obj.scaleY || 1) * scaleY;
          obj.left = (obj.left || 0) * scaleX;
          obj.top = (obj.top || 0) * scaleY;
          obj.setCoords();
        });
      }
      canvas.requestRenderAll();
      canvas.fire("canvas:resized");
      saveHistory();
    },
    [saveHistory],
  );

  const startLassoMode = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = true;
    canvas.selection = false;
    const brush = new PencilBrush(canvas);
    brush.color = "rgba(34, 197, 94, 0.8)";
    brush.width = 2;
    canvas.freeDrawingBrush = brush;
    setActiveTool("lasso");
    setIsCropping(true);

    const onPathCreated = (e) => {
      canvas.off("path:created", onPathCreated);
      const path = e.path;
      if (!path || path.path.length < 5) {
        if (path) canvas.remove(path);
        canvas.on("path:created", onPathCreated); // re-attach
        return;
      }

      path.set("visible", false);
      canvas.discardActiveObject();
      canvas.renderAll();

      // Use absolute coordinates ignoring viewport transform (zoom/pan)
      const br = path.getBoundingRect(true, true);
      const multiplier = 2;

      const offscreen = document.createElement("canvas");
      offscreen.width = br.width * multiplier;
      offscreen.height = br.height * multiplier;
      const ctx = offscreen.getContext("2d");

      // Draw the path as a solid shape using Fabric's native render
      ctx.save();
      ctx.scale(multiplier, multiplier);
      ctx.translate(-br.left, -br.top);

      const origFill = path.fill;
      const origStroke = path.stroke;
      const origVisible = path.visible;
      path.set({
        fill: "black",
        stroke: "black",
        strokeWidth: 1,
        visible: true,
      });
      path.render(ctx);
      path.set({ fill: origFill, stroke: origStroke, visible: origVisible });
      ctx.restore();

      // Extract the rectangular area from the main canvas using toDataURL (handles DPR natively)
      const dataUrl = canvas.toDataURL({
        left: br.left,
        top: br.top,
        width: br.width,
        height: br.height,
        multiplier,
        format: "png",
      });

      canvas.remove(path);

      const img = new Image();
      img.onload = () => {
        // Use source-in to keep only the intersection of the path and the canvas image
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

        // Add the resulting clipped image back to the canvas as a new layer
        FabricImage.fromURL(offscreen.toDataURL("image/png")).then((fabImg) => {
          fabImg.set({
            left: br.left,
            top: br.top,
            scaleX: 1 / multiplier,
            scaleY: 1 / multiplier,
            cornerStyle: "circle",
            cornerColor: "#5366ff",
            transparentCorners: false,
            id: `lasso-${Date.now()}`,
            name: "Lasso Region",
            originX: "left",
            originY: "top",
            _skipHistoryOnAdd: true, // lasso handler calls saveHistory() itself
          });

          addCustomControls(fabImg);
          canvas.add(fabImg);
          canvas.setActiveObject(fabImg);
          canvas.requestRenderAll();
          saveHistory();
        });
      };
      img.src = dataUrl;

      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.getObjects().forEach((o) => {
        o.selectable = true;
        o.evented = true;
      });
      setIsCropping(false);
      setActiveTool("select");
    };

    canvas.on("path:created", onPathCreated);
  }, [setActiveTool, addCustomControls, saveHistory]);

  // ─── Background Removal ───────────────────────────────────────────────────
  const removeBackground = useCallback(async (quality = "medium") => {
  if (!selectedObject || selectedObject.type !== "image") return;

  try {
    const { removeBackgroundFromFabricImage } =
      await import("../utils/removeBackground");

    const newObjectUrl = await removeBackgroundFromFabricImage(selectedObject, quality);

    FabricImage.fromURL(newObjectUrl, { crossOrigin: "anonymous" }).then((newImg) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Preserve all transforms from the original object
      newImg.set({
        left:    selectedObject.left,
        top:     selectedObject.top,
        scaleX:  selectedObject.scaleX,
        scaleY:  selectedObject.scaleY,
        angle:   selectedObject.angle,
        opacity: selectedObject.opacity,
        flipX:   selectedObject.flipX,
        flipY:   selectedObject.flipY,
      });

      canvas.remove(selectedObject);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();
      saveHistory();
    });
  } catch (err) {
    console.error("removeBackground failed:", err);
    alert(`Background removal failed: ${err.message}`);
  }
}, [selectedObject, fabricRef, saveHistory]);

  // ─── Magnetic Lasso ───────────────────────────────────────────────────────
  const startMagneticLasso = useCallback(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    // Clean up any previous magnetic lasso session
    if (canvas._magneticCleanup) {
      canvas._magneticCleanup();
      canvas._magneticCleanup = null;
    }

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";
    canvas.getObjects().forEach((o) => {
      o.selectable = false;
      o.evented = false;
    });
    setActiveTool("magneticLasso");
    setIsCropping(true);

    // ── Overlay canvas for live path preview ────────────────────────────────
    const lowerEl = canvas.lowerCanvasEl ?? canvas.getElement();
    const parent = lowerEl.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const elRect = lowerEl.getBoundingClientRect();

    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    Object.assign(overlay.style, {
      position: "absolute",
      top: elRect.top - parentRect.top + parent.scrollTop + "px",
      left: elRect.left - parentRect.left + parent.scrollLeft + "px",
      width: lowerEl.style.width || lowerEl.offsetWidth + "px",
      height: lowerEl.style.height || lowerEl.offsetHeight + "px",
      pointerEvents: "none",
      zIndex: 20,
    });
    parent.appendChild(overlay);
    const octx = overlay.getContext("2d");

    // ── Downscale canvas for edge detection (keeps worker fast) ─────────────
    const SCALE = 0.4; // work at 40% resolution
    const dw = Math.round(canvas.width * SCALE);
    const dh = Math.round(canvas.height * SCALE);
    const small = document.createElement("canvas");
    small.width = dw;
    small.height = dh;
    const sctx = small.getContext("2d");

    // Render entire canvas into the small offscreen
    const fullDataUrl = canvas.toDataURL({ format: "png", multiplier: SCALE });
    const seedImg = new Image();
    seedImg.src = fullDataUrl;

    let workerReady = false;
    let anchors = []; // locked anchor points [{x,y}] in canvas coords
    let livePath = []; // current snapped path from last anchor to cursor
    let allSegments = []; // completed segments [[{x,y},...],...]
    let cursorPos = null;

    // Vite resolves new URL('...', import.meta.url) with ?worker hint statically.
    // This works in both dev and production builds.
    let worker;
    try {
      const workerUrl = new URL(
        "../workers/MagneticLassoWorker.js",
        import.meta.url,
      );
      worker = new Worker(workerUrl, { type: "module" });
    } catch (err) {
      console.error("Failed to spawn MagneticLassoWorker:", err);
      setIsCropping(false);
      setActiveTool("select");
      return;
    }

    worker.onmessage = (e) => {
      if (e.data.type === "EDGES_READY") {
        workerReady = true;
      }
      if (e.data.type === "PATH_RESULT") {
        // Scale path coords back from worker space → canvas space
        livePath = e.data.path.map((p) => ({
          x: p.x / SCALE,
          y: p.y / SCALE,
        }));
        drawOverlay();
      }
    };

    seedImg.onload = () => {
      sctx.drawImage(seedImg, 0, 0, dw, dh);
      const imgData = sctx.getImageData(0, 0, dw, dh);
      worker.postMessage({
        type: "COMPUTE_EDGES",
        imageData: imgData,
        width: dw,
        height: dh,
      });
    };

    // ── Draw the overlay ─────────────────────────────────────────────────────
    const drawOverlay = () => {
      octx.clearRect(0, 0, overlay.width, overlay.height);

      // Collect all points: completed segments + live path
      const allPts = [...allSegments.flat(), ...livePath];
      if (allPts.length < 2) {
        // Just draw anchor dot
        if (anchors.length > 0) {
          drawAnchor(anchors[0]);
        }
        return;
      }

      // Dashed green path
      octx.save();
      octx.strokeStyle = "rgba(34,197,94,0.9)";
      octx.lineWidth = 1.5;
      octx.setLineDash([5, 3]);
      octx.beginPath();
      octx.moveTo(allPts[0].x, allPts[0].y);
      allPts.slice(1).forEach((p) => octx.lineTo(p.x, p.y));
      octx.stroke();
      octx.restore();

      // Closing line if near start
      if (anchors.length > 1 && cursorPos) {
        const start = anchors[0];
        const dist = Math.hypot(cursorPos.x - start.x, cursorPos.y - start.y);
        if (dist < 20) {
          octx.save();
          octx.strokeStyle = "rgba(34,197,94,0.5)";
          octx.lineWidth = 1;
          octx.setLineDash([3, 3]);
          octx.beginPath();
          octx.moveTo(allPts[allPts.length - 1].x, allPts[allPts.length - 1].y);
          octx.lineTo(start.x, start.y);
          octx.stroke();
          octx.restore();
        }
      }

      // Anchor dots
      anchors.forEach(drawAnchor);
    };

    const drawAnchor = (pt) => {
      octx.save();
      octx.beginPath();
      octx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      octx.fillStyle = "#22c55e";
      octx.strokeStyle = "#fff";
      octx.lineWidth = 1.5;
      octx.fill();
      octx.stroke();
      octx.restore();
    };

    // ── Request path from worker ─────────────────────────────────────────────
    let pathRequestTimer = null;
    const requestPath = (toX, toY) => {
      if (!workerReady || anchors.length === 0) return;
      clearTimeout(pathRequestTimer);
      pathRequestTimer = setTimeout(() => {
        const last = anchors[anchors.length - 1];
        worker.postMessage({
          type: "FIND_PATH",
          fromX: last.x * SCALE,
          fromY: last.y * SCALE,
          toX: toX * SCALE,
          toY: toY * SCALE,
        });
      }, 16); // ~60fps throttle
    };

    // ── Extract and add the lasso region ────────────────────────────────────
    const extractRegion = () => {
      const allPts = [...allSegments.flat(), ...livePath];
      if (allPts.length < 5) return;

      // Use an offscreen canvas — same approach as regular lasso
      const minX = Math.min(...allPts.map((p) => p.x));
      const minY = Math.min(...allPts.map((p) => p.y));
      const maxX = Math.max(...allPts.map((p) => p.x));
      const maxY = Math.max(...allPts.map((p) => p.y));
      const rw = maxX - minX;
      const rh = maxY - minY;
      if (rw < 2 || rh < 2) return;

      const MULT = 2;
      const off = document.createElement("canvas");
      off.width = rw * MULT;
      off.height = rh * MULT;
      const ctx = off.getContext("2d");

      // Draw filled polygon as mask
      ctx.save();
      ctx.scale(MULT, MULT);
      ctx.translate(-minX, -minY);
      ctx.beginPath();
      ctx.moveTo(allPts[0].x, allPts[0].y);
      allPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.restore();

      // Capture the canvas region
      const regionUrl = canvas.toDataURL({
        left: minX,
        top: minY,
        width: rw,
        height: rh,
        multiplier: MULT,
        format: "png",
      });

      const img = new Image();
      img.onload = () => {
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(img, 0, 0, off.width, off.height);

        FabricImage.fromURL(off.toDataURL("image/png")).then((fabImg) => {
          fabImg.set({
            left: minX,
            top: minY,
            scaleX: 1 / MULT,
            scaleY: 1 / MULT,
            cornerStyle: "circle",
            cornerColor: "#5366ff",
            transparentCorners: false,
            id: `magnetic-${Date.now()}`,
            name: "Magnetic Lasso",
            originX: "left",
            originY: "top",
            _skipHistoryOnAdd: true,
          });
          addCustomControls(fabImg);
          canvas.add(fabImg);
          canvas.setActiveObject(fabImg);
          canvas.requestRenderAll();
          saveHistory();
        });
      };
      img.src = regionUrl;
    };

    // ── Mouse events ─────────────────────────────────────────────────────────
    const onMouseMove = (opt) => {
      const ptr = canvas.getScenePoint(opt.e);
      cursorPos = { x: ptr.x, y: ptr.y };

      // Check if near first anchor to show close hint
      if (anchors.length > 1) {
        const dist = Math.hypot(ptr.x - anchors[0].x, ptr.y - anchors[0].y);
        overlay.style.cursor = dist < 20 ? "cell" : "crosshair";
      }

      requestPath(ptr.x, ptr.y);
      if (!workerReady && anchors.length === 0) drawOverlay();
    };

    const onMouseDown = (opt) => {
      if (activeToolRef.current !== "magneticLasso") return;
      opt.e.preventDefault();
      const ptr = canvas.getScenePoint(opt.e);

      // Close path if clicking near first anchor
      if (anchors.length > 1) {
        const dist = Math.hypot(ptr.x - anchors[0].x, ptr.y - anchors[0].y);
        if (dist < 20) {
          // Commit the live segment then extract
          if (livePath.length > 0) allSegments.push([...livePath]);
          extractRegion();
          cleanup();
          return;
        }
      }

      // Lock current live path as a completed segment and add new anchor
      if (livePath.length > 0) allSegments.push([...livePath]);
      anchors.push({ x: ptr.x, y: ptr.y });
      livePath = [];
      drawOverlay();
    };

    const onDblClick = () => {
      if (anchors.length > 1) {
        if (livePath.length > 0) allSegments.push([...livePath]);
        extractRegion();
      }
      cleanup();
    };

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        if (anchors.length > 1) {
          if (livePath.length > 0) allSegments.push([...livePath]);
          extractRegion();
        }
        cleanup();
      }
      if (e.key === "Escape") cleanup();
    };

    // ── Cleanup ──────────────────────────────────────────────────────────────
    const cleanup = () => {
      // Null out FIRST so setActiveTool's guard doesn't re-enter cleanup
      canvas._magneticCleanup = null;

      clearTimeout(pathRequestTimer);
      worker.terminate();
      overlay.remove();
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:down", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      lowerEl.removeEventListener("dblclick", onDblClick);
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = "default";
      canvas.getObjects().forEach((o) => {
        o.selectable = true;
        o.evented = true;
      });
      setIsCropping(false);
      // Use _setActiveTool directly — avoids re-entering the cleanup guard in setActiveTool
      activeToolRef.current = "select";
      _setActiveTool("select");
    };

    canvas._magneticCleanup = cleanup;

    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:down", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    lowerEl.addEventListener("dblclick", onDblClick);
  }, [
    setActiveTool,
    setIsCropping,
    addCustomControls,
    saveHistory,
    activeToolRef,
  ]);

  const setPolygonMode = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    fabricRef.current.selection = false;
    fabricRef.current.defaultCursor = "crosshair";
    fabricRef.current.getObjects().forEach((o) => {
      o.selectable = false;
      o.evented = false;
    });
    setActiveTool("polygon");
  }, [setActiveTool]);

  const setArrowMode = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = false;
    fabricRef.current.selection = false;
    fabricRef.current.defaultCursor = "crosshair";
    fabricRef.current.getObjects().forEach((o) => {
      o.selectable = false;
      o.evented = false;
    });
    setActiveTool("arrow");
  }, [setActiveTool]);

  // Populate keyboard-shortcut ref inside an effect — never during render
  useEffect(() => {
    toolShortcutsRef.current = {
      setSelectMode,
      setPanMode,
      setBrushMode,
      setEraserMode,
      startLassoMode,
      startMagneticLasso,
      setPolygonMode,
      setArrowMode,
    };
  }, [
    setSelectMode,
    setPanMode,
    setBrushMode,
    setEraserMode,
    startLassoMode,
    startMagneticLasso,
    setPolygonMode,
    setArrowMode,
  ]);

  return {
    fabricRef,
    selectedObject,
    objectState,
    effects,
    activeTool,
    isCropping,
    setObjectState,
    setEffects,
    setActiveTool,
    initCanvas,
    disposeCanvas,
    saveHistory,
    undo,
    redo,
    setSelectMode,
    setPanMode,
    setBrushMode,
    setEraserMode,
    startCropMode,
    applyCrop,
    cancelCrop,
    addImage,
    replaceImage,
    addText,
    addShape,
    flipSelected,
    rotateSelected,
    deleteSelected,
    alignToCanvas,
    changeOrder,
    bringObjectBack,
    exportCanvas,
    resizeCanvas,
    startLassoMode,
    startMagneticLasso,
    removeBackground,
    setPolygonMode,
    setArrowMode,
  };
};
