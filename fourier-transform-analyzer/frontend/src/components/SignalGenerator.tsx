import React from 'react';
import { useAppStore } from '../store';
import { SignalType, CompositeComponent } from '../types';

const SignalGenerator: React.FC = () => {
  const {
    signalParams,
    setSignalParam,
    addCompositeComponent,
    removeCompositeComponent,
    updateCompositeComponent,
  } = useAppStore();

  const signalTypeOptions: { value: SignalType; label: string }[] = [
    { value: 'sine', label: '正弦波' },
    { value: 'square', label: '方波' },
    { value: 'triangle', label: '三角波' },
    { value: 'noise', label: '白噪声' },
    { value: 'composite', label: '复合信号' },
  ];

  const componentTypeOptions: { value: SignalType; label: string }[] = [
    { value: 'sine', label: '正弦波' },
    { value: 'square', label: '方波' },
    { value: 'triangle', label: '三角波' },
  ];

  return (
    <div className="control-section">
      <h3>信号发生器</h3>

      <div className="form-group">
        <label>信号类型</label>
        <select
          value={signalParams.signal_type}
          onChange={(e) => setSignalParam('signal_type', e.target.value as SignalType)}
        >
          {signalTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {signalParams.signal_type !== 'composite' && signalParams.signal_type !== 'noise' && (
        <>
          <div className="form-group">
            <label>频率 (Hz): {signalParams.frequency.toFixed(1)}</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                min="0.1"
                max="500"
                step="0.1"
                value={signalParams.frequency}
                onChange={(e) => setSignalParam('frequency', parseFloat(e.target.value))}
              />
              <div className="slider-value">
                <span>0.1</span>
                <span>500</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>振幅: {signalParams.amplitude.toFixed(1)}</label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                min="0.1"
                max="10"
                step="0.1"
                value={signalParams.amplitude}
                onChange={(e) => setSignalParam('amplitude', parseFloat(e.target.value))}
              />
              <div className="slider-value">
                <span>0.1</span>
                <span>10</span>
              </div>
            </div>
          </div>

          {signalParams.signal_type !== 'noise' && (
            <div className="form-group">
              <label>相位 (弧度): {signalParams.phase.toFixed(2)}</label>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider-input"
                  min="0"
                  max="6.28"
                  step="0.01"
                  value={signalParams.phase}
                  onChange={(e) => setSignalParam('phase', parseFloat(e.target.value))}
                />
                <div className="slider-value">
                  <span>0</span>
                  <span>2π</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {signalParams.signal_type === 'composite' && (
        <div className="composite-components">
          <div className="form-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addCompositeComponent}
            >
              + 添加信号分量
            </button>
          </div>
          {signalParams.composite_components?.map((comp, index) => (
            <div key={index} className="component-item">
              <select
                value={comp.type}
                onChange={(e) => updateCompositeComponent(index, { type: e.target.value as SignalType })}
              >
                {componentTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="频率"
                value={comp.frequency}
                onChange={(e) => updateCompositeComponent(index, { frequency: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="振幅"
                value={comp.amplitude}
                onChange={(e) => updateCompositeComponent(index, { amplitude: parseFloat(e.target.value) || 0 })}
              />
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => removeCompositeComponent(index)}
              >
                删除
              </button>
            </div>
          ))}
          {(!signalParams.composite_components || signalParams.composite_components.length === 0) && (
            <div className="info-panel">
              <h4>提示</h4>
              <p>点击"添加信号分量"按钮来构建复合信号</p>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label>噪声水平: {signalParams.noise_level.toFixed(2)}</label>
        <div className="slider-container">
          <input
            type="range"
            className="slider-input"
            min="0"
            max="5"
            step="0.01"
            value={signalParams.noise_level}
            onChange={(e) => setSignalParam('noise_level', parseFloat(e.target.value))}
          />
          <div className="slider-value">
            <span>0</span>
            <span>5</span>
          </div>
        </div>
      </div>

      <div className="toggle-section">
        <div className="form-group">
          <label>持续时间 (秒): {signalParams.duration.toFixed(1)}</label>
          <div className="slider-container">
            <input
              type="range"
              className="slider-input"
              min="0.1"
              max="5"
              step="0.1"
              value={signalParams.duration}
              onChange={(e) => setSignalParam('duration', parseFloat(e.target.value))}
            />
            <div className="slider-value">
              <span>0.1</span>
              <span>5</span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>采样率 (Hz): {signalParams.sampling_rate.toFixed(0)}</label>
          <div className="slider-container">
            <input
              type="range"
              className="slider-input"
              min="100"
              max="5000"
              step="100"
              value={signalParams.sampling_rate}
              onChange={(e) => setSignalParam('sampling_rate', parseFloat(e.target.value))}
            />
            <div className="slider-value">
              <span>100</span>
              <span>5000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalGenerator;
