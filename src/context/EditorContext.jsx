import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { EditorContext } from "./EditorContextInstance";
import { useFabricEditor } from "../hooks/useFabricEditor";

export const EditorProvider = ({ children }) => {
  const editor = useFabricEditor();
  const [layers, setLayers] = useState([]);
  const [activePanel, setActivePanel] = useState("properties");
  const [brushSettings, setBrushSettings] = useState({
    size: 20,
    color: "#ff6b6b",
    opacity: 1,
    hardness: 100,
    tipShape: "round",
  });

  // Use a ref to keep the sync logic fresh while keeping the callback identity perfectly stable
  const syncLayersRef = useRef();
  
  useEffect(() => {
    syncLayersRef.current = () => {
      const canvas = editor.fabricRef.current;
      if (!canvas) return;
      const objs = canvas.getObjects();
      setLayers(
        [...objs].reverse().filter(obj => !obj.excludeFromLayers).map((obj, i) => {
          if (!obj.id) obj.id = `layer-${Date.now()}-${i}`;
          return {
            id: obj.id,
            name: obj.name || `${obj.type} ${objs.length - i}`,
            type: obj.type,
            visible: obj.visible !== false,
            locked: !obj.selectable,
            opacity: obj.opacity ?? 1,
            blendMode: obj.globalCompositeOperation || "source-over",
            object: obj,
          };
        }),
      );
    };
  });

  const syncLayers = useCallback(() => {
    syncLayersRef.current?.();
  }, []);

  // Bind canvas events once the canvas is initialized.
  const bindCanvasEvents = useCallback(
    (canvas) => {
      // Clear existing listeners to prevent duplicates during HMR
      canvas.off("object:added", syncLayers);
      canvas.off("object:removed", syncLayers);
      canvas.off("object:modified", syncLayers);
      canvas.off("layer:updated", syncLayers);
      canvas.off("path:created", syncLayers);

      canvas.on("object:added", syncLayers);
      canvas.on("object:removed", syncLayers);
      canvas.on("object:modified", syncLayers);
      canvas.on("layer:updated", syncLayers);
      canvas.on("path:created", syncLayers);
      
      // Fix: Avoid synchronous setState within an effect by using queueMicrotask
      queueMicrotask(() => {
        syncLayers();
      });
    },
    [syncLayers],
  );

  // We wrap initCanvas to additionally bind our layer-sync events
  const { initCanvas: fabricInitCanvas } = editor;
  const initCanvas = useCallback(
    (el) => {
      const canvas = fabricInitCanvas(el);
      if (canvas) bindCanvasEvents(canvas);
    },
    [fabricInitCanvas, bindCanvasEvents],
  );

  // If the canvas is already initialized before we bind, sync once on mount
  useEffect(() => {
    const canvas = editor.fabricRef.current;
    if (canvas) bindCanvasEvents(canvas);
  }, [editor.fabricRef, bindCanvasEvents]);

  const value = {
    ...editor,
    initCanvas,
    layers,
    syncLayers,
    activePanel,
    setActivePanel,
    brushSettings,
    setBrushSettings,
  };

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
};
