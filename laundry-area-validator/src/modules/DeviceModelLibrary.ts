export interface DeviceDimensions {
  width: number;   
  depth: number;    
  height: number;   
}

export interface DoorParameters {
  type: 'front' | 'top' | 'side';
  openingAngle: number;     
  doorRadius: number;       
  hingePosition: { x: number; y: number; z: number };
  interferenceRadius: number;
}

export interface HeatVentilation {
  requiresSpace: boolean;
  minBackDistance: number;  
  ventPosition: { x: number; y: number; z: number };
  ventSize: { width: number; height: number };
}

export interface DeviceModel {
  id: string;
  brand: string;
  model: string;
  type: 'washer' | 'dryer';
  dimensions: DeviceDimensions;
  door: DoorParameters;
  ventilation?: HeatVentilation;
  weight: number;
  stackable: boolean;
  stackKitRequired: boolean;
  description: string;
}

export const washerModels: Record<string, DeviceModel> = {
  siemens_wm14p2680w: {
    id: 'siemens_wm14p2680w',
    brand: '西门子',
    model: 'WM14P2680W',
    type: 'washer',
    dimensions: { width: 60, depth: 61, height: 85 },
    door: {
      type: 'front',
      openingAngle: 180,
      doorRadius: 30,
      hingePosition: { x: 58, y: 42.5, z: 0 },
      interferenceRadius: 32
    },
    weight: 75,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 变频滚筒洗衣机'
  },
  haier_eg100max5s: {
    id: 'haier_eg100max5s',
    brand: '海尔',
    model: 'EG100MAX5S',
    type: 'washer',
    dimensions: { width: 59.5, depth: 60, height: 85 },
    door: {
      type: 'front',
      openingAngle: 165,
      doorRadius: 29.5,
      hingePosition: { x: 57.5, y: 42.5, z: 0 },
      interferenceRadius: 31
    },
    weight: 72,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 直驱变频洗衣机'
  },
  xiaomi_xhqg100mj103: {
    id: 'xiaomi_xhqg100mj103',
    brand: '米家',
    model: 'XHQG100MJ103',
    type: 'washer',
    dimensions: { width: 59.5, depth: 59.5, height: 85 },
    door: {
      type: 'front',
      openingAngle: 170,
      doorRadius: 29,
      hingePosition: { x: 58, y: 42.5, z: 0 },
      interferenceRadius: 30
    },
    weight: 68,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 互联网洗衣机'
  },
  bosch_wau28568hw: {
    id: 'bosch_wau28568hw',
    brand: '博世',
    model: 'WAU28568HW',
    type: 'washer',
    dimensions: { width: 60, depth: 60, height: 84.8 },
    door: {
      type: 'front',
      openingAngle: 180,
      doorRadius: 30,
      hingePosition: { x: 58, y: 42.4, z: 0 },
      interferenceRadius: 32
    },
    weight: 78,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 高效静音洗衣机'
  }
};

export const dryerModels: Record<string, DeviceModel> = {
  siemens_wt47w5680w: {
    id: 'siemens_wt47w5680w',
    brand: '西门子',
    model: 'WT47W5680W',
    type: 'dryer',
    dimensions: { width: 60, depth: 60, height: 85 },
    door: {
      type: 'front',
      openingAngle: 180,
      doorRadius: 30,
      hingePosition: { x: 58, y: 42.5, z: 0 },
      interferenceRadius: 32
    },
    ventilation: {
      requiresSpace: true,
      minBackDistance: 10,
      ventPosition: { x: 58, y: 42.5, z: 28 },
      ventSize: { width: 55, height: 30 }
    },
    weight: 62,
    stackable: true,
    stackKitRequired: true,
    description: '9kg 热泵烘干机'
  },
  haier_gbn10018u1: {
    id: 'haier_gbn10018u1',
    brand: '海尔',
    model: 'GBN100-18U1',
    type: 'dryer',
    dimensions: { width: 59.5, depth: 63, height: 85 },
    door: {
      type: 'front',
      openingAngle: 165,
      doorRadius: 29.5,
      hingePosition: { x: 57.5, y: 42.5, z: 0 },
      interferenceRadius: 31
    },
    ventilation: {
      requiresSpace: true,
      minBackDistance: 10,
      ventPosition: { x: 61, y: 42.5, z: 30 },
      ventSize: { width: 54, height: 28 }
    },
    weight: 58,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 热泵烘干机'
  },
  xiaomi_thp100wm201: {
    id: 'xiaomi_thp100wm201',
    brand: '米家',
    model: 'THP100WM201',
    type: 'dryer',
    dimensions: { width: 59.5, depth: 60, height: 85 },
    door: {
      type: 'front',
      openingAngle: 170,
      doorRadius: 29,
      hingePosition: { x: 58, y: 42.5, z: 0 },
      interferenceRadius: 30
    },
    ventilation: {
      requiresSpace: true,
      minBackDistance: 10,
      ventPosition: { x: 58, y: 42.5, z: 28 },
      ventSize: { width: 55, height: 26 }
    },
    weight: 55,
    stackable: true,
    stackKitRequired: true,
    description: '10kg 热泵烘干机'
  },
  bosch_wtw87568hw: {
    id: 'bosch_wtw87568hw',
    brand: '博世',
    model: 'WTW87568HW',
    type: 'dryer',
    dimensions: { width: 60, depth: 61, height: 84.8 },
    door: {
      type: 'front',
      openingAngle: 180,
      doorRadius: 30,
      hingePosition: { x: 58, y: 42.4, z: 0 },
      interferenceRadius: 32
    },
    ventilation: {
      requiresSpace: true,
      minBackDistance: 10,
      ventPosition: { x: 59, y: 42.4, z: 29 },
      ventSize: { width: 56, height: 28 }
    },
    weight: 64,
    stackable: true,
    stackKitRequired: true,
    description: '9kg 热泵烘干机'
  }
};

export function getDeviceModel(type: 'washer' | 'dryer', modelId: string): DeviceModel | null {
  if (type === 'washer') {
    return washerModels[modelId] || null;
  } else {
    return dryerModels[modelId] || null;
  }
}

export function getAllModels(type: 'washer' | 'dryer'): DeviceModel[] {
  const models = type === 'washer' ? washerModels : dryerModels;
  return Object.values(models);
}
