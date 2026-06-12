import {
  LuMousePointer,
  LuHand,
  LuCrop,
  LuBrush,
  LuEraser,
  LuType,
  LuSquare,
  LuCircle,
  LuTriangle,
  LuMinus,
  LuHexagon,
  LuStar,
  LuOctagon,
  LuDiamond,
  LuPentagon,
  LuTriangleRight,
} from "react-icons/lu";
import { useEditorContext } from "../../context/EditorContextInstance";
import { GoArrowDownRight } from "react-icons/go";
import { FaMagnet, FaRegSquareFull } from "react-icons/fa6";
import { PiPolygon, PiShapes } from "react-icons/pi";
import { TbLasso } from "react-icons/tb";

const tools = [
  {
    id: "select",
    icon: <LuMousePointer className="w-5 h-5 text-[#0070f3]" />,
    label: "Select (V)",
  },
  {
    id: "pan",
    icon: <LuHand className="w-5 h-5 text-[#0070f3]" />,
    label: "Pan (H)",
  },
  {
    id: "crop",
    icon: <LuCrop className="w-5 h-5 text-[#0070f3]" />,
    label: "Crop (C)",
  },
  {
    id: "brush",
    icon: <LuBrush className="w-5 h-5 text-[#0070f3]" />,
    label: "Brush (B)",
  },
  {
    id: "eraser",
    icon: <LuEraser className="w-5 h-5 text-[#0070f3]" />,
    label: "Eraser (E)",
  },
  {
    id: "text",
    icon: <LuType className="w-5 h-5 text-[#0070f3]" />,
    label: "Text (T)",
  },
  {
    id: "shape",
    icon: <PiShapes className="w-6 h-6 text-[#0070f3]" />,
    label: "Shape (S)",
  },
  {
    id: "lasso",
    icon: <TbLasso className="w-5 h-5 text-[#0070f3]" />,
    label: "Lasso (L)",
  },
  {
    id: "magneticLasso",
    icon: <FaMagnet className="w-5 h-5 text-[#0070f3]" />,
    label: "Magnetic Lasso (M)",
  },
  {
    id: "polygon",
    icon: <PiPolygon className="w-5 h-5 text-[#0070f3]" />,
    label: "Polygon (P)",
  },
  {
    id: "arrow",
    icon: <GoArrowDownRight className="w-5 h-5 text-[#0070f3]" />,
    label: "Arrow (A)",
  },
];

const Toolbar = ({ onAddText, onAddShape }) => {
  const {
    activeTool,
    setActiveTool,
    setSelectMode,
    setPanMode,
    setBrushMode,
    setEraserMode,
    startCropMode,
    startLassoMode,
    startMagneticLasso,
    setPolygonMode,
    setArrowMode,
    brushSettings,
    fabricRef,
  } = useEditorContext();

  const handleTool = (tool) => {
    switch (tool) {
      case "select":
        setSelectMode();
        break;
      case "pan":
        setPanMode();
        break;
      case "brush":
        setBrushMode(brushSettings);
        break;
      case "eraser":
        setEraserMode({ size: brushSettings.size });
        break;
      case "text":
        setSelectMode();
        onAddText?.();
        return;
      case "shape":
        setSelectMode();
        break;
      case "crop":
        startCropMode();
        break;
      case "lasso":
        startLassoMode();
        break;
      case "magneticLasso":
        startMagneticLasso();
        break;
      case "polygon":
        setPolygonMode();
        break;
      case "arrow":
        setArrowMode();
        break;
      default:
        setSelectMode();
    }
    setActiveTool(tool);
  };

  return (
    <div className="flex h-full col-start-1 z-10 w-full">
      {/* Editor Tool-select sidebar (white/light column) */}
      <div className="w-[60px] bg-white border-r border-[#e5e7eb] flex flex-col items-center py-4 shrink-0">
        {/* R badge */}
        <div className="w-7 h-7 rounded-md bg-[#0070f3] text-white flex items-center justify-center text-xs font-bold mb-4 shadow-sm select-none">
          R
        </div>

        <div className="flex flex-col gap-2.5 flex-1 w-full items-center">
          {tools.map(({ id, icon, label }) => {
            const isActive = activeTool === id;
            return (
              <button
                key={id}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? "bg-[#e0edff] text-[#0070f3] border border-[#0070f3]/20 shadow-sm"
                    : "text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]"
                }`}
                onClick={() => handleTool(id)}
                title={label}
              >
                {icon}
              </button>
            );
          })}
        </div>

        {/* Shape sub-tools shown when shape is active */}
        {activeTool === "shape" && (
          <div className="absolute left-[60px] top-[290px] grid grid-cols-4 gap-1 bg-white rounded-lg p-1.5 border border-[#e5e7eb] shadow-xl z-50">
            {[
              {
                id: "rect",
                icon: <FaRegSquareFull className="w-3.5 h-3.5" />,
                title: "Rectangle",
              },
              {
                id: "rounded-rect",
                icon: <LuSquare className="w-4 h-4" />,
                title: "Rounded Rect",
              },
              {
                id: "circle",
                icon: <LuCircle className="w-4 h-4" />,
                title: "Circle",
              },
              {
                id: "ellipse",
                icon: (
                  <svg width="50" height="50" viewBox="0 0 100 100">
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="40"
                      ry="20"
                      className="fill-none stroke-gray-600 "
                      strokeWidth="4"
                    />
                  </svg>
                ),
                title: "Ellipse",
              },
              {
                id: "triangle",
                icon: <LuTriangle className="w-4 h-4" />,
                title: "Triangle",
              },
              {
                id: "right-triangle",
                icon: <LuTriangleRight className="w-4 h-4 rotate-90" />,
                title: "Right Triangle",
              },
              {
                id: "diamond",
                icon: <LuDiamond className="w-4 h-4" />,
                title: "Diamond",
              },
              {
                id: "pentagon",
                icon: <LuPentagon className="w-4 h-4" />,
                title: "Pentagon",
              },
              {
                id: "hexagon",
                icon: <LuHexagon className="w-4 h-4" />,
                title: "Hexagon",
              },
              {
                id: "octagon",
                icon: <LuOctagon className="w-4 h-4" />,
                title: "Octagon",
              },
              {
                id: "star",
                icon: <LuStar className="w-4 h-4" />,
                title: "Star",
              },
              {
                id: "line",
                icon: <LuMinus className="w-4 h-4" />,
                title: "Line",
              },
            ].map((s) => (
              <button
                key={s.id}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-all"
                onClick={() => onAddShape?.(s.id)}
                title={s.title}
              >
                {s.icon}
              </button>
            ))}
          </div>
        )}

        {/* Polygon mode hint & finish button */}
        {activeTool === "polygon" && (
          <div className="absolute left-[130px] bottom-[40px] flex flex-col gap-2 bg-white rounded-lg p-2.5 border border-[#e5e7eb] shadow-xl z-50 w-48">
            <div className="text-[10px] text-[#6b7280] text-center leading-normal">
              Click to add points
              <br />
              Click near start to close
              <br />
              or press Enter/Esc
            </div>
            <button
              className="py-1 px-2.5 bg-[#0070f3] text-white rounded text-xs font-semibold hover:bg-[#0060d3] transition-all"
              onClick={() => fabricRef.current?.finishPolygon?.()}
              title="Finish polygon"
            >
              âœ“ Finish
            </button>
          </div>
        )}

        {/* Magnetic lasso hint */}
        {activeTool === "magneticLasso" && (
          <div className="absolute left-[130px] bottom-[40px] flex flex-col gap-1 bg-white rounded-lg p-2.5 border border-[#e5e7eb] shadow-xl z-50 w-48">
            <div className="text-[10px] text-[#6b7280] text-center leading-normal">
              Click to place anchors
              <br />
              Click near start to close
              <br />
              Double-click or Enter to finish
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
