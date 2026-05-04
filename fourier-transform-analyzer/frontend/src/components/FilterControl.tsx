import React from 'react';
import { useAppStore } from '../store';
import { FilterType } from '../types';

const FilterControl: React.FC = () => {
  const {
    filterParams,
    setFilterParam,
    resetFilterParams,
  } = useAppStore();

  const filterTypeOptions: { value: FilterType; label: string }[] = [
    { value: 'none', label: '无滤波' },
    { value: 'lowpass', label: '低通滤波' },
    { value: 'highpass', label: '高通滤波' },
    { value: 'bandstop', label: '带阻滤波' },
  ];

  const showCutoffLow = filterParams.filter_type === 'lowpass' || filterParams.filter_type === 'bandstop';
  const showCutoffHigh = filterParams.filter_type === 'highpass' || filterParams.filter_type === 'bandstop';

  return (
    <div className="control-section">
      <h3>滤波器控制</h3>

      <div className="form-group">
        <label>滤波器类型</label>
        <select
          value={filterParams.filter_type}
          onChange={(e) => setFilterParam('filter_type', e.target.value as FilterType)}
        >
          {filterTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filterParams.filter_type !== 'none' && (
        <>
          {showCutoffLow && (
            <div className="form-group">
              <label>低截止频率 (Hz): {(filterParams.cutoff_low || 50).toFixed(1)}</label>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider-input"
                  min="1"
                  max="500"
                  step="1"
                  value={filterParams.cutoff_low || 50}
                  onChange={(e) => setFilterParam('cutoff_low', parseFloat(e.target.value))}
                />
                <div className="slider-value">
                  <span>1</span>
                  <span>500</span>
                </div>
              </div>
            </div>
          )}

          {showCutoffHigh && (
            <div className="form-group">
              <label>高截止频率 (Hz): {(filterParams.cutoff_high || 100).toFixed(1)}</label>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider-input"
                  min="1"
                  max="500"
                  step="1"
                  value={filterParams.cutoff_high || 100}
                  onChange={(e) => setFilterParam('cutoff_high', parseFloat(e.target.value))}
                />
                <div className="slider-value">
                  <span>1</span>
                  <span>500</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>滤波器阶数: {filterParams.order}</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                min="1"
                max="10"
                step="1"
                value={filterParams.order}
                onChange={(e) => setFilterParam('order', parseInt(e.target.value))}
              />
              <div className="slider-value">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilterParams}
            >
              重置滤波器
            </button>
          </div>
        </>
      )}

      {filterParams.filter_type === 'none' && (
        <div className="info-panel">
          <h4>提示</h4>
          <p>选择滤波器类型后可调节参数。滤波器将实时应用于信号分析。</p>
        </div>
      )}
    </div>
  );
};

export default FilterControl;
