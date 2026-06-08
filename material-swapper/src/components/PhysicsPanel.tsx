import { useState } from 'react';
import { MaterialPhysicsProps } from '../types/material';

interface PhysicsPanelProps {
  physics: MaterialPhysicsProps;
  onChange: (physics: Partial<MaterialPhysicsProps>) => void;
  disabled?: boolean;
}

const presets: Record<string, Partial<MaterialPhysicsProps>> = {
  glossy: { roughness: 0.1, envMapIntensity: 1.5, reflectivity: 0.9 },
  satin: { roughness: 0.4, envMapIntensity: 0.8, reflectivity: 0.5 },
  matte: { roughness: 0.9, envMapIntensity: 0.2, reflectivity: 0.1 }
};

export function PhysicsPanel({ physics, onChange, disabled = false }: PhysicsPanelProps) {
  const handleChange = (key: keyof MaterialPhysicsProps, value: number) => {
    onChange({ [key]: value });
  };

  return (
    <div className="physics-panel">
      <h4>物理属性</h4>
      
      <div className="preset-buttons">
        <button onClick={() => onChange(presets.glossy)} disabled={disabled}>
          高光
        </button>
        <button onClick={() => onChange(presets.satin)} disabled={disabled}>
          缎面
        </button>
        <button onClick={() => onChange(presets.matte)} disabled={disabled}>
          哑光
        </button>
      </div>

      <div className="control-group">
        <label>
          粗糙度
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={physics.roughness}
            onChange={e => handleChange('roughness', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{physics.roughness.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          金属度
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={physics.metalness}
            onChange={e => handleChange('metalness', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{physics.metalness.toFixed(2)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          环境光强度
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={physics.envMapIntensity}
            onChange={e => handleChange('envMapIntensity', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{physics.envMapIntensity.toFixed(1)}</span>
        </label>
      </div>

      <div className="control-group">
        <label>
          反射率
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={physics.reflectivity ?? 0.5}
            onChange={e => handleChange('reflectivity', parseFloat(e.target.value))}
            disabled={disabled}
          />
          <span>{(physics.reflectivity ?? 0.5).toFixed(2)}</span>
        </label>
      </div>

      {physics.clearcoat !== undefined && (
        <div className="control-group">
          <label>
            清漆层
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={physics.clearcoat}
              onChange={e => handleChange('clearcoat', parseFloat(e.target.value))}
              disabled={disabled}
            />
            <span>{physics.clearcoat.toFixed(2)}</span>
          </label>
        </div>
      )}
    </div>
  );
}
