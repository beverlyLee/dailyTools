import { SceneObjectType } from '../types/material';

interface ObjectSelectorProps {
  selectedObject: SceneObjectType;
  onChange: (obj: SceneObjectType) => void;
}

const objects: { id: SceneObjectType; name: string; icon: string }[] = [
  { id: 'floor', name: '地面', icon: '⬛' },
  { id: 'backWall', name: '后墙', icon: '⬜' },
  { id: 'sideWall', name: '侧墙', icon: '▫️' },
  { id: 'leftPillar', name: '左柱', icon: '🕋' },
  { id: 'rightPillar', name: '右柱', icon: '🕋' }
];

export function ObjectSelector({ selectedObject, onChange }: ObjectSelectorProps) {
  return (
    <div className="object-selector">
      <h4>编辑对象</h4>
      <div className="object-buttons">
        {objects.map(obj => (
          <button
            key={obj.id}
            className={`object-btn ${selectedObject === obj.id ? 'active' : ''}`}
            onClick={() => onChange(obj.id)}
          >
            <span className="object-icon">{obj.icon}</span>
            <span className="object-name">{obj.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
