import { useState, useRef } from 'react';
import { PBRMaterialTextures } from '../types/material';

interface MaterialUploaderProps {
  onUpload: (material: {
    name: string;
    color: string;
    textures: PBRMaterialTextures;
    textureUrls: PBRMaterialTextures;
  }) => void;
  onCancel: () => void;
}

const textureTypes = [
  { key: 'map', label: '漫反射贴图 (Albedo)', description: '基础颜色贴图' },
  { key: 'normalMap', label: '法线贴图 (Normal)', description: '表面凹凸细节' },
  { key: 'roughnessMap', label: '粗糙度贴图 (Roughness)', description: '表面光滑程度' },
  { key: 'aoMap', label: '环境光遮蔽 (AO)', description: '缝隙阴影效果' }
];

export function MaterialUploader({ onUpload, onCancel }: MaterialUploaderProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [textures, setTextures] = useState<Record<string, string | null>>({
    map: null,
    normalMap: null,
    roughnessMap: null,
    aoMap: null
  });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string | null>>({
    map: null,
    normalMap: null,
    roughnessMap: null,
    aoMap: null
  });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (key: string, file: File | null) => {
    if (!file) {
      setTextures(prev => ({ ...prev, [key]: null }));
      setPreviewUrls(prev => ({ ...prev, [key]: null }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setTextures(prev => ({ ...prev, [key]: file.name }));
      setPreviewUrls(prev => ({ ...prev, [key]: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('请输入材质名称');
      return;
    }

    const textureUrls: PBRMaterialTextures = {};
    if (previewUrls.map) textureUrls.map = previewUrls.map;
    if (previewUrls.normalMap) textureUrls.normalMap = previewUrls.normalMap;
    if (previewUrls.roughnessMap) textureUrls.roughnessMap = previewUrls.roughnessMap;
    if (previewUrls.aoMap) textureUrls.aoMap = previewUrls.aoMap;

    const texturesData: PBRMaterialTextures = {};
    if (textures.map) texturesData.map = textures.map!;
    if (textures.normalMap) texturesData.normalMap = textures.normalMap!;
    if (textures.roughnessMap) texturesData.roughnessMap = textures.roughnessMap!;
    if (textures.aoMap) texturesData.aoMap = textures.aoMap!;

    onUpload({
      name: name.trim(),
      color,
      textures: texturesData,
      textureUrls
    });
  };

  return (
    <div className="material-uploader">
      <h4>上传自定义材质</h4>
      
      <div className="upload-form">
        <div className="form-group">
          <label>材质名称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="请输入材质名称"
          />
        </div>

        <div className="form-group">
          <label>基础颜色</label>
          <div className="color-picker-row">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
            <span className="color-hex">{color}</span>
          </div>
        </div>

        <div className="texture-uploads">
          <h5>贴图文件（可选）</h5>
          
          {textureTypes.map(type => (
            <div key={type.key} className="texture-upload-item">
              <div className="texture-info">
                <span className="texture-label">{type.label}</span>
                <span className="texture-desc">{type.description}</span>
              </div>
              
              <div className="texture-upload-controls">
                {previewUrls[type.key] ? (
                  <div className="texture-preview">
                    <img src={previewUrls[type.key]!} alt={type.label} />
                    <button 
                      className="remove-texture-btn"
                      onClick={() => handleFileChange(type.key, null)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="texture-upload-placeholder">
                    <span>无贴图</span>
                  </div>
                )}
                
                <button
                  className="choose-file-btn"
                  onClick={() => fileInputRefs.current[type.key]?.click()}
                >
                  选择文件
                </button>
                
                <input
                  ref={el => fileInputRefs.current[type.key] = el}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFileChange(type.key, e.target.files?.[0] || null)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="upload-actions">
        <button className="cancel-btn" onClick={onCancel}>
          取消
        </button>
        <button className="confirm-btn" onClick={handleSubmit}>
          添加材质
        </button>
      </div>
    </div>
  );
}
