import { useState } from "react";

const ExportModal = ({ onClose, onExport }) => {
  const [format, setFormat] = useState("png");
  const [multiplier, setMultiplier] = useState(1);
  const [quality, setQuality] = useState(100);

  const handleExport = () => {
    onExport(format, multiplier, quality / 100);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center animate-fadeInSimple" onClick={onClose}>
      <div className="bg-white w-full max-w-[400px] rounded-xl shadow-lg border border-[#e5e7eb] flex flex-col p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
        <h2 className="mt-0 mb-5 text-[15px] font-semibold text-[#111827] tracking-[0.01em]">Export Image</h2>
        
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs font-semibold text-[#6b7280]">Format</label>
          <select 
            className="w-full bg-white border border-[#e5e7eb] rounded-sm text-[#111827] px-3 py-2 outline-none text-xs transition-colors focus:border-[#0070f3] appearance-none cursor-pointer uppercase" 
            value={format} 
            onChange={e => setFormat(e.target.value)}
          >
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs font-semibold text-[#6b7280]">Resolution Multiplier ({multiplier}x)</label>
          <select 
            className="w-full bg-white border border-[#e5e7eb] rounded-sm text-[#111827] px-3 py-2 outline-none text-xs transition-colors focus:border-[#0070f3] appearance-none cursor-pointer" 
            value={multiplier} 
            onChange={e => setMultiplier(parseFloat(e.target.value))}
          >
            <option value={0.5}>0.5x (Half size)</option>
            <option value={1}>1x (Original size)</option>
            <option value={2}>2x (High Res)</option>
            <option value={3}>3x (Ultra Res)</option>
          </select>
        </div>

        {(format === "jpeg" || format === "webp") && (
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-xs font-semibold text-[#6b7280]">Quality ({quality}%)</label>
            <input 
              type="range" 
              className="w-full mt-1.5"
              min="10" 
              max="100" 
              value={quality} 
              onChange={e => setQuality(parseInt(e.target.value))} 
              style={{ '--range-progress': `${((quality - 10) / (100 - 10)) * 100}%` }}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#e5e7eb]">
          <button className="px-5 py-2 rounded-md font-semibold text-xs cursor-pointer transition-colors bg-transparent border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f3f4f6]" onClick={onClose}>Cancel</button>
          <button className="px-5 py-2 rounded-md font-semibold text-xs cursor-pointer transition-colors bg-[#0070f3] text-white shadow-sm shadow-blue-500/10 hover:bg-[#0060d3]" onClick={handleExport}>Download</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
