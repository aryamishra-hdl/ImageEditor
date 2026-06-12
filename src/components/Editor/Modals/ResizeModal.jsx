import { useState, useEffect } from "react";

const ResizeModal = ({ fabricRef, onClose, onResize }) => {
  const [width, setWidth]   = useState(920);
  const [height, setHeight] = useState(580);
  const [lockAspect, setLockAspect]     = useState(true);
  const [scaleContent, setScaleContent] = useState(true);
  const [aspectRatio, setAspectRatio]   = useState(920 / 580);

  // Read actual canvas dimensions on open
  useEffect(() => {
    const canvas = fabricRef?.current;
    if (canvas) {
      setWidth(canvas.width);
      setHeight(canvas.height);
      setAspectRatio(canvas.width / canvas.height);
    }
  }, [fabricRef]);

  const handleWidthChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setWidth(val);
    if (lockAspect && val > 0) setHeight(Math.round(val / aspectRatio));
  };

  const handleHeightChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setHeight(val);
    if (lockAspect && val > 0) setWidth(Math.round(val * aspectRatio));
  };

  const handleResize = () => {
    if (width > 0 && height > 0) onResize(width, height, scaleContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center animate-fadeInSimple" onClick={onClose}>
      <div className="bg-white w-full max-w-[400px] rounded-xl shadow-lg border border-[#e5e7eb] flex flex-col p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
        <h2 className="mt-0 mb-5 text-[15px] font-semibold text-[#111827] tracking-[0.01em]">Resize Canvas</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#6b7280]">Width (px)</label>
            <input 
              type="number" 
              className="w-full bg-white border border-[#e5e7eb] rounded-sm text-[#111827] px-3 py-2 outline-none text-xs transition-colors focus:border-[#0070f3] font-mono"
              value={width} 
              min="100" 
              max="8000" 
              onChange={handleWidthChange} 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#6b7280]">Height (px)</label>
            <input 
              type="number" 
              className="w-full bg-white border border-[#e5e7eb] rounded-sm text-[#111827] px-3 py-2 outline-none text-xs transition-colors focus:border-[#0070f3] font-mono"
              value={height} 
              min="100" 
              max="8000" 
              onChange={handleHeightChange} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1 mb-4">
          <label className="flex items-center gap-2.5 text-xs text-[#111827] font-medium cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 appearance-none bg-white border border-[#d1d5db] rounded-[3px] outline-none cursor-pointer flex items-center justify-center transition-colors checked:bg-[#0070f3] checked:border-[#0070f3] after:content-[''] after:w-1 after:h-2 after:border-r-[1.5px] after:border-b-[1.5px] after:border-white after:rotate-[40deg] after:opacity-0 checked:after:opacity-100 after:mt-[-2px]"
              checked={lockAspect} 
              onChange={e => setLockAspect(e.target.checked)} 
            />
            Lock Aspect Ratio
          </label>
          <label className="flex items-center gap-2.5 text-xs text-[#111827] font-medium cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 appearance-none bg-white border border-[#d1d5db] rounded-[3px] outline-none cursor-pointer flex items-center justify-center transition-colors checked:bg-[#0070f3] checked:border-[#0070f3] after:content-[''] after:w-1 after:h-2 after:border-r-[1.5px] after:border-b-[1.5px] after:border-white after:rotate-[40deg] after:opacity-0 checked:after:opacity-100 after:mt-[-2px]"
              checked={scaleContent} 
              onChange={e => setScaleContent(e.target.checked)} 
            />
            Scale Existing Content
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#e5e7eb]">
          <button className="px-5 py-2 rounded-md font-semibold text-xs cursor-pointer transition-colors bg-transparent border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f3f4f6]" onClick={onClose}>Cancel</button>
          <button className="px-5 py-2 rounded-md font-semibold text-xs cursor-pointer transition-colors bg-[#0070f3] text-white shadow-sm shadow-blue-500/10 hover:bg-[#0060d3]" onClick={handleResize}>Apply</button>
        </div>
      </div>
    </div>
  );
};

export default ResizeModal;
