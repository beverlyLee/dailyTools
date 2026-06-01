import * as THREE from 'three';

export function createGearGeometry(teeth, outerRadius, innerRadius, thickness, toothDepth = 0.12) {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / teeth;
  const toothWidth = angleStep * 0.4;
  const addendum = outerRadius * toothDepth;
  const dedendum = outerRadius * toothDepth;
  const tipRadius = outerRadius + addendum;
  const rootRadius = outerRadius - dedendum;

  for (let i = 0; i < teeth; i++) {
    const angle = i * angleStep;
    
    const rootAngle1 = angle - toothWidth * 0.8;
    const rootAngle2 = angle + toothWidth * 0.8;
    const tipAngle1 = angle - toothWidth * 0.3;
    const tipAngle2 = angle + toothWidth * 0.3;
    
    const p0 = new THREE.Vector2(
      Math.cos(rootAngle1) * rootRadius,
      Math.sin(rootAngle1) * rootRadius
    );
    const p1 = new THREE.Vector2(
      Math.cos(tipAngle1) * tipRadius,
      Math.sin(tipAngle1) * tipRadius
    );
    const p2 = new THREE.Vector2(
      Math.cos(tipAngle2) * tipRadius,
      Math.sin(tipAngle2) * tipRadius
    );
    const p3 = new THREE.Vector2(
      Math.cos(rootAngle2) * rootRadius,
      Math.sin(rootAngle2) * rootRadius
    );
    
    if (i === 0) {
      shape.moveTo(p0.x, p0.y);
    }
    
    const cp1 = new THREE.Vector2(
      Math.cos(angle - toothWidth * 0.5) * outerRadius,
      Math.sin(angle - toothWidth * 0.5) * outerRadius
    );
    shape.quadraticCurveTo(cp1.x, cp1.y, p1.x, p1.y);
    
    shape.lineTo(p2.x, p2.y);
    
    const cp2 = new THREE.Vector2(
      Math.cos(angle + toothWidth * 0.5) * outerRadius,
      Math.sin(angle + toothWidth * 0.5) * outerRadius
    );
    shape.quadraticCurveTo(cp2.x, cp2.y, p3.x, p3.y);
    
    if (i < teeth - 1) {
      const nextAngle = (i + 1) * angleStep - toothWidth * 0.8;
      const midRootAngle = (rootAngle2 + nextAngle) / 2;
      const midRoot = new THREE.Vector2(
        Math.cos(midRootAngle) * rootRadius,
        Math.sin(midRootAngle) * rootRadius
      );
      shape.quadraticCurveTo(midRoot.x, midRoot.y, 
        Math.cos(nextAngle) * rootRadius, 
        Math.sin(nextAngle) * rootRadius
      );
    } else {
      const firstAngle = -toothWidth * 0.8;
      const midRootAngle = (rootAngle2 + firstAngle + Math.PI * 2) / 2;
      const midRoot = new THREE.Vector2(
        Math.cos(midRootAngle) * rootRadius,
        Math.sin(midRootAngle) * rootRadius
      );
      shape.quadraticCurveTo(midRoot.x, midRoot.y,
        Math.cos(firstAngle) * rootRadius,
        Math.sin(firstAngle) * rootRadius
      );
    }
  }

  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.1,
    bevelSize: thickness * 0.08,
    bevelSegments: 3
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createEscapeWheelGeometry(teeth = 15, outerRadius = 0.5, innerRadius = 0.12, thickness = 0.08) {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const angle = i * angleStep;
    const nextAngle = (i + 1) * angleStep;
    
    const toothTipAngle = angle + angleStep * 0.15;
    const toothBaseAngle = angle + angleStep * 0.35;
    const valleyAngle = angle + angleStep * 0.75;
    
    const tipRadius = outerRadius * 1.15;
    const baseRadius = outerRadius * 0.95;
    const valleyRadius = outerRadius * 0.7;
    
    const tip = new THREE.Vector2(
      Math.cos(toothTipAngle) * tipRadius,
      Math.sin(toothTipAngle) * tipRadius
    );
    const base = new THREE.Vector2(
      Math.cos(toothBaseAngle) * baseRadius,
      Math.sin(toothBaseAngle) * baseRadius
    );
    const valley = new THREE.Vector2(
      Math.cos(valleyAngle) * valleyRadius,
      Math.sin(valleyAngle) * valleyRadius
    );
    const nextBase = new THREE.Vector2(
      Math.cos(nextAngle + angleStep * 0.15) * baseRadius,
      Math.sin(nextAngle + angleStep * 0.15) * baseRadius
    );
    
    if (i === 0) {
      shape.moveTo(valley.x, valley.y);
    }
    
    const impulseCp = new THREE.Vector2(
      Math.cos(toothTipAngle - 0.05) * tipRadius * 0.95,
      Math.sin(toothTipAngle - 0.05) * tipRadius * 0.95
    );
    shape.quadraticCurveTo(impulseCp.x, impulseCp.y, tip.x, tip.y);
    
    const dropCp = new THREE.Vector2(
      Math.cos(toothBaseAngle - 0.05) * baseRadius * 0.98,
      Math.sin(toothBaseAngle - 0.05) * baseRadius * 0.98
    );
    shape.quadraticCurveTo(dropCp.x, dropCp.y, base.x, base.y);
    
    const valleyCp = new THREE.Vector2(
      Math.cos((toothBaseAngle + valleyAngle) / 2) * valleyRadius * 1.05,
      Math.sin((toothBaseAngle + valleyAngle) / 2) * valleyRadius * 1.05
    );
    shape.quadraticCurveTo(valleyCp.x, valleyCp.y, valley.x, valley.y);
    
    if (i < teeth - 1) {
      const liftCp = new THREE.Vector2(
        Math.cos((valleyAngle + nextAngle + angleStep * 0.15) / 2) * baseRadius * 0.9,
        Math.sin((valleyAngle + nextAngle + angleStep * 0.15) / 2) * baseRadius * 0.9
      );
      shape.quadraticCurveTo(liftCp.x, liftCp.y, nextBase.x, nextBase.y);
    }
  }

  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.15,
    bevelSize: thickness * 0.1,
    bevelSegments: 4
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createAnchorGeometry(thickness = 0.08) {
  const shape = new THREE.Shape();
  
  const bodyLength = 0.7;
  const bodyWidth = 0.12;
  const palletWidth = 0.18;
  const palletLength = 0.22;
  const hornLength = 0.28;
  
  shape.moveTo(-bodyLength/2, -bodyWidth/2);
  shape.lineTo(bodyLength/2 - palletLength, -bodyWidth/2);
  
  shape.lineTo(bodyLength/2 - palletLength, -palletWidth/2);
  shape.lineTo(bodyLength/2, -palletWidth/3);
  shape.lineTo(bodyLength/2, palletWidth/3);
  shape.lineTo(bodyLength/2 - palletLength, palletWidth/2);
  shape.lineTo(bodyLength/2 - palletLength, bodyWidth/2);
  
  shape.lineTo(-bodyLength/2 + palletLength, bodyWidth/2);
  
  shape.lineTo(-bodyLength/2 + palletLength, palletWidth/2);
  shape.lineTo(-bodyLength/2, palletWidth/3);
  shape.lineTo(-bodyLength/2, -palletWidth/3);
  shape.lineTo(-bodyLength/2 + palletLength, -palletWidth/2);
  shape.lineTo(-bodyLength/2 + palletLength, -bodyWidth/2);
  
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, 0.05, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: thickness * 0.12,
    bevelSegments: 4
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createCageGeometry(radius = 1.0, thickness = 0.06) {
  const shape = new THREE.Shape();
  
  const outerRadius = radius;
  const innerRadius = radius * 0.88;
  const spokeCount = 4;
  const spokeWidth = 0.12;
  
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  shape.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const nextAngle = ((i + 0.5) / spokeCount) * Math.PI * 2;
    
    const holePath = new THREE.Path();
    const holeRadius = (outerRadius + innerRadius) / 2;
    const holeStartAngle = angle + spokeWidth / holeRadius;
    const holeEndAngle = nextAngle - spokeWidth / holeRadius;
    
    holePath.absarc(0, 0, innerRadius + 0.02, holeStartAngle, holeEndAngle, false);
    holePath.absarc(0, 0, outerRadius - 0.02, holeEndAngle, holeStartAngle, true);
    
    shape.holes.push(holePath);
  }

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: thickness * 0.15,
    bevelSegments: 4
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createHandGeometry(length, width, thickness) {
  const shape = new THREE.Shape();
  
  const tailWidth = width * 0.4;
  const headLength = length * 0.25;
  
  shape.moveTo(-length * 0.15, -tailWidth/2);
  shape.lineTo(length * 0.6, -width/2);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.6, width/2);
  shape.lineTo(-length * 0.15, tailWidth/2);
  shape.lineTo(-length * 0.15, tailWidth/4);
  shape.lineTo(-length * 0.3, tailWidth/4);
  shape.lineTo(-length * 0.3, -tailWidth/4);
  shape.lineTo(-length * 0.15, -tailWidth/4);
  shape.lineTo(-length * 0.15, -tailWidth/2);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.3,
    bevelSize: thickness * 0.2,
    bevelSegments: 3
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

export function createRubyBearingGeometry(radius = 0.06) {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.8, radius * 0.6, 16);
  return geometry;
}

export function createWheelBridgeGeometry(width = 1.2, height = 0.15, thickness = 0.05) {
  const shape = new THREE.Shape();
  
  const endRadius = height / 2;
  
  shape.moveTo(-width/2 + endRadius, -height/2);
  shape.lineTo(width/2 - endRadius, -height/2);
  shape.absarc(width/2 - endRadius, 0, endRadius, -Math.PI/2, Math.PI/2, false);
  shape.lineTo(-width/2 + endRadius, height/2);
  shape.absarc(-width/2 + endRadius, 0, endRadius, Math.PI/2, -Math.PI/2, false);
  
  const holePath1 = new THREE.Path();
  holePath1.absarc(-width/2 + endRadius, 0, height * 0.25, 0, Math.PI * 2, true);
  shape.holes.push(holePath1);
  
  const holePath2 = new THREE.Path();
  holePath2.absarc(width/2 - endRadius, 0, height * 0.25, 0, Math.PI * 2, true);
  shape.holes.push(holePath2);

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: thickness * 0.15,
    bevelSegments: 3
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}
