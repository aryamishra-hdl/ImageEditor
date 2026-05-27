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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Resize Canvas</h2>

        <div className="grid-2">
          <div className="input-group">
            <label>Width (px)</label>
            <input type="number" value={width} min="100" max="8000" onChange={handleWidthChange} />
          </div>
          <div className="input-group">
            <label>Height (px)</label>
            <input type="number" value={height} min="100" max="8000" onChange={handleHeightChange} />
          </div>
        </div>

        <div className="checkbox-group" style={{ flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={lockAspect} onChange={e => setLockAspect(e.target.checked)} />
            Lock Aspect Ratio
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={scaleContent} onChange={e => setScaleContent(e.target.checked)} />
            Scale Existing Content
          </label>
        </div>

        <div className="modal-actions">
          <button className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button" onClick={handleResize}>Apply</button>
        </div>
      </div>
    </div>
  );
};

export default ResizeModal;
