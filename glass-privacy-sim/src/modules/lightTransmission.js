import * as THREE from 'three';
import { GLASS_TYPES } from './glassMaterialLib.js';

function computeRefraction(incidentDir, normal, ior, glassType) {
  const glass = GLASS_TYPES[glassType];
  const cosI = -normal.dot(incidentDir);
  const eta = cosI > 0 ? (1.0 / ior) : ior;
  const sinT2 = eta * eta * (1.0 - cosI * cosI);

  if (sinT2 > 1.0) {
    return incidentDir.clone().reflect(normal);
  }

  const cosT = Math.sqrt(1.0 - sinT2);
  const refracted = incidentDir.clone().multiplyScalar(eta)
    .add(normal.clone().multiplyScalar(eta * cosI - cosT));

  const normalStrength = glass.normalStrength;
  const perturbation = new THREE.Vector3(
    (Math.random() - 0.5) * normalStrength * 0.3,
    (Math.random() - 0.5) * normalStrength * 0.3,
    0
  );
  refracted.add(perturbation);
  refracted.normalize();

  return refracted;
}

function fresnelReflectance(cosTheta, ior) {
  let r0 = (1.0 - ior) / (1.0 + ior);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * Math.pow(1.0 - cosTheta, 5);
}

function traceLightRay(origin, direction, glassPlane, glassType, maxBounces = 3) {
  const glass = GLASS_TYPES[glassType];
  const ray = new THREE.Ray(origin.clone(), direction.clone());
  const intersectionPoint = new THREE.Vector3();

  if (!ray.intersectPlane(glassPlane, intersectionPoint)) {
    return null;
  }

  const glassNormal = new THREE.Vector3(0, 0, 1);
  const cosI = Math.abs(glassNormal.dot(direction));

  const reflectance = fresnelReflectance(cosI, glass.ior);
  const transmittance = (1.0 - reflectance) * glass.transmission;

  const refractedDir = computeRefraction(direction, glassNormal, glass.ior, glassType);

  const offset = 0.001;
  const exitPoint = intersectionPoint.clone().add(
    glassNormal.clone().multiplyScalar(-glass.thickness * 50)
  );

  const exitRay = new THREE.Ray(exitPoint, refractedDir);

  const angularDeviation = glass.normalStrength * 0.35;
  const spreadDir = refractedDir.clone();
  spreadDir.x += (Math.random() - 0.5) * angularDeviation;
  spreadDir.y += (Math.random() - 0.5) * angularDeviation;
  spreadDir.normalize();

  return {
    entryPoint: intersectionPoint.clone(),
    exitPoint: exitPoint.clone(),
    exitDirection: spreadDir,
    transmittance: transmittance,
    reflectance: reflectance,
    angularDeviation: angularDeviation,
    effectiveLightLoss: 1.0 - transmittance
  };
}

function computeBatchRefraction(origin, direction, glassPlane, glassType, sampleCount = 64) {
  const results = [];
  for (let i = 0; i < sampleCount; i++) {
    const result = traceLightRay(origin, direction, glassPlane, glassType);
    if (result) results.push(result);
  }

  if (results.length === 0) return null;

  const avgTransmittance = results.reduce((s, r) => s + r.transmittance, 0) / results.length;
  const avgDeviation = results.reduce((s, r) => s + r.angularDeviation, 0) / results.length;
  const avgLightLoss = results.reduce((s, r) => s + r.effectiveLightLoss, 0) / results.length;

  const scatterVariance = results.reduce((s, r) => {
    return s + r.angularDeviation * r.angularDeviation;
  }, 0) / results.length;

  return {
    avgTransmittance,
    avgDeviation,
    avgLightLoss,
    scatterVariance,
    sampleCount: results.length,
    glassType
  };
}

export { computeRefraction, fresnelReflectance, traceLightRay, computeBatchRefraction };
