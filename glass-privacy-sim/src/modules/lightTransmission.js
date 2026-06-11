import * as THREE from 'three';
import { GLASS_TYPES } from './glassMaterialLib.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getDeterministicRng(context, index) {
  const seed = deterministicHash(context + ':' + index);
  return mulberry32(seed);
}

function computeRefraction(incidentDir, normal, ior, glassType, deterministicRng) {
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
  const rand1 = deterministicRng ? (deterministicRng() - 0.5) : (Math.random() - 0.5);
  const rand2 = deterministicRng ? (deterministicRng() - 0.5) : (Math.random() - 0.5);
  const perturbation = new THREE.Vector3(
    rand1 * normalStrength * 0.3,
    rand2 * normalStrength * 0.3,
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

function traceLightRay(origin, direction, glassPlane, glassType, maxBounces = 3, deterministicRng) {
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

  const refractedDir = computeRefraction(direction, glassNormal, glass.ior, glassType, deterministicRng);

  const offset = 0.001;
  const exitPoint = intersectionPoint.clone().add(
    glassNormal.clone().multiplyScalar(-glass.thickness * 50)
  );

  const angularDeviation = glass.normalStrength * 0.35;
  const spreadDir = refractedDir.clone();
  const randDev1 = deterministicRng ? (deterministicRng() - 0.5) : (Math.random() - 0.5);
  const randDev2 = deterministicRng ? (deterministicRng() - 0.5) : (Math.random() - 0.5);
  spreadDir.x += randDev1 * angularDeviation;
  spreadDir.y += randDev2 * angularDeviation;
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

function computeBatchRefraction(origin, direction, glassPlane, glassType, sampleCount = 64, deterministic = true) {
  const results = [];
  for (let i = 0; i < sampleCount; i++) {
    const deterministicRng = deterministic ? getDeterministicRng(
      'refr:' + glassType + ':' + origin.x.toFixed(2) + ':' + origin.y.toFixed(2),
      i
    ) : null;
    const result = traceLightRay(origin, direction, glassPlane, glassType, 3, deterministicRng);
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
    glassType,
    deterministic
  };
}

export { computeRefraction, fresnelReflectance, traceLightRay, computeBatchRefraction, mulberry32, deterministicHash, getDeterministicRng };
