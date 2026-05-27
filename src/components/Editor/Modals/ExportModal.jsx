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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Export Image</h2>
        
        <div className="input-group">
          <label>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}>
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        <div className="input-group">
          <label>Resolution Multiplier ({multiplier}x)</label>
          <select value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value))}>
            <option value={0.5}>0.5x (Half size)</option>
            <option value={1}>1x (Original size)</option>
            <option value={2}>2x (High Res)</option>
            <option value={3}>3x (Ultra Res)</option>
          </select>
        </div>

        {(format === "jpeg" || format === "webp") && (
          <div className="input-group">
            <label>Quality ({quality}%)</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={quality} 
              onChange={e => setQuality(parseInt(e.target.value))} 
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button" onClick={handleExport}>Download</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
