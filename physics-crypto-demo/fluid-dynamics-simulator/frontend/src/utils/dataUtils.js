export function base64ToFloat32Array(base64, shape) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = bytes.buffer;
  const float32Array = new Float32Array(buffer);
  
  if (shape.length === 2) {
    const result = [];
    for (let i = 0; i < shape[0]; i++) {
      const row = [];
      for (let j = 0; j < shape[1]; j++) {
        row.push(float32Array[i * shape[1] + j]);
      }
      result.push(row);
    }
    return result;
  } else if (shape.length === 3) {
    const result = [];
    for (let i = 0; i < shape[0]; i++) {
      const row = [];
      for (let j = 0; j < shape[1]; j++) {
        const vec = [];
        for (let k = 0; k < shape[2]; k++) {
          vec.push(float32Array[(i * shape[1] + j) * shape[2] + k]);
        }
        row.push(vec);
      }
      result.push(row);
    }
    return result;
  }
  
  return float32Array;
}

export function base64ToInt32Array(base64, shape) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = bytes.buffer;
  const int32Array = new Int32Array(buffer);
  
  if (shape.length === 2) {
    const result = [];
    for (let i = 0; i < shape[0]; i++) {
      const row = [];
      for (let j = 0; j < shape[1]; j++) {
        row.push(int32Array[i * shape[1] + j]);
      }
      result.push(row);
    }
    return result;
  }
  
  return int32Array;
}

export function parseSimulationState(state, gridWidth, gridHeight) {
  return {
    velocity: base64ToFloat32Array(state.velocity, [gridWidth, gridHeight, 2]),
    vorticity: base64ToFloat32Array(state.vorticity, [gridWidth, gridHeight]),
    density: base64ToFloat32Array(state.density, [gridWidth, gridHeight]),
    obstacle: base64ToInt32Array(state.obstacle, [gridWidth, gridHeight])
  };
}

export function vorticityToColor(vorticity, minVal = -0.1, maxVal = 0.1) {
  const normalized = (vorticity - minVal) / (maxVal - minVal);
  const clamped = Math.max(0, Math.min(1, normalized));
  
  if (clamped < 0.5) {
    const t = clamped * 2;
    return {
      r: Math.floor(t * 255),
      g: Math.floor(t * 255),
      b: 255
    };
  } else {
    const t = (clamped - 0.5) * 2;
    return {
      r: 255,
      g: Math.floor((1 - t) * 255),
      b: Math.floor((1 - t) * 255)
    };
  }
}

export function velocityToColor(ux, uy, maxSpeed = 0.3) {
  const speed = Math.sqrt(ux * ux + uy * uy);
  const normalized = Math.min(speed / maxSpeed, 1);
  
  return {
    r: Math.floor(normalized * 255),
    g: Math.floor(normalized * 200),
    b: Math.floor(normalized * 100)
  };
}
