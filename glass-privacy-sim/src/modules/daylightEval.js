import * as THREE from 'three';
import { GLASS_TYPES } from './glassMaterialLib.js';
import { computeBatchRefraction } from './lightTransmission.js';

function evaluateDaylight(glassType, windowArea, sunDirection, glassPlane) {
  const glass = GLASS_TYPES[glassType];
  const baseTransmittance = glass.lightTransmittance;

  const glassNormal = new THREE.Vector3(0, 0, 1);
  const cosIncidence = Math.abs(sunDirection.dot(glassNormal));
  const angleFactor = cosIncidence;

  const normalLoss = glass.normalStrength * 0.25;
  const effectiveTransmittance = baseTransmittance * angleFactor * (1.0 - normalLoss);

  const sampleOrigin = new THREE.Vector3(0, 1.5, 3);
  const refractionResult = computeBatchRefraction(
    sampleOrigin, sunDirection.clone().negate(), glassPlane, glassType, 32
  );

  let scatterLoss = 0;
  if (refractionResult) {
    scatterLoss = refractionResult.avgLightLoss * 0.15;
  }

  const totalTransmittance = Math.max(0, effectiveTransmittance - scatterLoss);

  const luxInput = 50000;
  const luxIndoor = luxInput * totalTransmittance * windowArea;

  let daylightGrade;
  if (luxIndoor >= 300) daylightGrade = '优秀';
  else if (luxIndoor >= 150) daylightGrade = '良好';
  else if (luxIndoor >= 100) daylightGrade = '一般';
  else if (luxIndoor >= 50) daylightGrade = '不足';
  else daylightGrade = '严重不足';

  const needsAuxLight = luxIndoor < 150;
  const auxLightSuggestion = needsAuxLight
    ? `建议增加 ${(150 - luxIndoor).toFixed(0)} lux 辅助照明`
    : '采光充足，无需辅助光源';

  return {
    baseTransmittance,
    effectiveTransmittance: totalTransmittance,
    angleFactor,
    normalLoss,
    scatterLoss,
    luxIndoor: Math.round(luxIndoor),
    daylightGrade,
    needsAuxLight,
    auxLightSuggestion,
    lightLossPercent: ((1.0 - totalTransmittance) * 100).toFixed(1),
    glassType
  };
}

function computeDaylightMap(glassType, windowWidth, windowHeight, resolution = 16) {
  const glass = GLASS_TYPES[glassType];
  const map = [];

  for (let y = 0; y < resolution; y++) {
    const row = [];
    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1);
      const v = y / (resolution - 1);

      let localTransmittance = glass.lightTransmittance;

      if (glass.normalPattern === 'ribbed') {
        const stripe = Math.sin(u * windowWidth * 3) * 0.5 + 0.5;
        localTransmittance *= 0.85 + stripe * 0.15;
      } else if (glass.normalPattern === 'wired') {
        const isWireX = (u * windowWidth * 25) % 1 < 0.05;
        const isWireY = (v * windowHeight * 25) % 1 < 0.05;
        if (isWireX || isWireY) localTransmittance *= 0.3;
      } else if (glass.normalPattern === 'embossed') {
        const pattern = Math.sin(u * 10) * Math.cos(v * 8) * 0.5 + 0.5;
        localTransmittance *= 0.8 + pattern * 0.2;
      }

      row.push(localTransmittance);
    }
    map.push(row);
  }

  return map;
}

export { evaluateDaylight, computeDaylightMap };
