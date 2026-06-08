import { useState } from 'react';

interface UVEditorProps {
  uv: {
    repeatX?: number;
    repeatY?: number;
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
  };
  onChange: (uv: Partial<UVEditorProps['uv']>) => void;
  disabled?: boolean;
}

export function UVEditor({ uv, onChange, disabled = false }: UVEditorProps) {
  const handleChange = (key: string, value: number) => {
    onChange({ [key]: value });
  };

  return (
    <div className="uv-editor">
      <h4>UV 映射设置</h4>
      
      <div className="control-group">
        <label>
          水平重复
          <input
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={uv.repeatX ?? 1}
            onChange={e => handleChange('repeatX', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{uv.repeatX?.toFixed(1)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          垂直重复
          <input
            type="range"
            min="0.1"
            max="20"
            step="0.1"
            value={uv.repeatY ?? 1}
            onChange={e => handleChange('repeatY', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{uv.repeatY?.toFixed(1)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          水平偏移
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={uv.offsetX ?? 0}
            onChange={e => handleChange('offsetX', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{(uv.offsetX ?? 0).toFixed(2)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          垂直偏移
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={uv.offsetY ?? 0}
            onChange={e => handleChange('offsetY', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{(uv.offsetY ?? 0).toFixed(2)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          旋转角度
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={(uv.rotation ?? 0) * (180 / Math.PI)}
            onChange={e => handleChange('rotation', parseFloat(e.target.value) * (Math.PI / 180))}
            disabled={disabled}
          />
          <span>{((uv.rotation ?? 0) * (180 / Math.PI)).toFixed(0)}°</span>
        </label>
      </div>

      <div className="preset-buttons">
        <button onClick={() => onChange({ repeatX: 1, repeatY: 1 })} disabled={disabled}>
          重置
        </button>
        <button onClick={() => onChange({ repeatX: 4, repeatY: 4 })} disabled={disabled}>
          平铺
        </button>
        <button onClick={() => onChange({ repeatX: 8, repeatY: 8 })} disabled={disabled}>
          密铺
        </button>
      </div>
    </div>
  );
}
