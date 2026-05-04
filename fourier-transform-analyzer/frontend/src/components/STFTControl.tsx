import React from 'react';
import { useAppStore } from '../store';

const STFTControl: React.FC = () => {
  const {
    performSTFT,
    setPerformSTFT,
    stftWindowSize,
    setSTFTWindowSize,
    stftOverlap,
    setSTFTOverlap,
  } = useAppStore();

  return (
    <div className="control-section">
      <h3>短时傅里叶变换 (STFT)</h3>

      <div className="form-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="stft-toggle"
            checked={performSTFT}
            onChange={(e) => setPerformSTFT(e.target.checked)}
          />
          <label htmlFor="stft-toggle">启用 STFT 时频分析</label>
        </div>
      </div>

      {performSTFT && (
        <>
          <div className="form-group">
            <label>窗口大小: {stftWindowSize}</label>
            <select
              value={stftWindowSize}
              onChange={(e) => setSTFTWindowSize(parseInt(e.target.value))}
            >
              <option value={64}>64</option>
              <option value={128}>128</option>
              <option value={256}>256</option>
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
            </select>
          </div>

          <div className="form-group">
            <label>重叠比例: {(stftOverlap * 100).toFixed(0)}%</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                min="0"
                max="0.9"
                step="0.1"
                value={stftOverlap}
                onChange={(e) => setSTFTOverlap(parseFloat(e.target.value))}
              />
              <div className="slider-value">
                <span>0%</span>
                <span>90%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default STFTControl;
