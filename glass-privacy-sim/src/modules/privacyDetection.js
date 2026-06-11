import * as THREE from 'three';
import { GLASS_TYPES } from './glassMaterialLib.js';

function deterministicHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

function createViewCone(origin, direction, halfAngle, rayCount = 24, deterministic = true) {
  const rays = [];
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  const adjustedUp = new THREE.Vector3().crossVectors(right, direction).normalize();

  rays.push({ origin: origin.clone(), direction: direction.clone() });

  const rng = deterministic
    ? mulberry32(deterministicHash('cone:' + origin.x.toFixed(2) + ':' + origin.y.toFixed(2)))
    : null;

  for (let i = 0; i < rayCount - 1; i++) {
    const theta = (i / (rayCount - 1)) * Math.PI * 2;
    let phi;
    if (deterministic) {
      phi = halfAngle * (0.3 + rng() * 0.7);
    } else {
      phi = halfAngle * (0.3 + Math.random() * 0.7);
    }

    const rayDir = direction.clone()
      .add(right.clone().multiplyScalar(Math.sin(phi) * Math.cos(theta)))
      .add(adjustedUp.clone().multiplyScalar(Math.sin(phi) * Math.sin(theta)))
      .add(direction.clone().multiplyScalar(Math.cos(phi)));
    rayDir.normalize();

    rays.push({ origin: origin.clone(), direction: rayDir });
  }

  return rays;
}

function rayIntersectsHumanSilhouette(ray, humanBounds) {
  const min = humanBounds.min;
  const max = humanBounds.max;

  let tmin = (min.x - ray.origin.x) / ray.direction.x;
  let tmax = (max.x - ray.origin.x) / ray.direction.x;
  if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

  let tymin = (min.y - ray.origin.y) / ray.direction.y;
  let tymax = (max.y - ray.origin.y) / ray.direction.y;
  if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

  if (tmin > tymax || tymin > tmax) return null;
  tmin = Math.max(tmin, tymin);
  tmax = Math.min(tmax, tymax);

  let tzmin = (min.z - ray.origin.z) / ray.direction.z;
  let tzmax = (max.z - ray.origin.z) / ray.direction.z;
  if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

  if (tmin > tzmax || tzmin > tmax) return null;
  tmin = Math.max(tmin, tzmin);
  tmax = Math.min(tmax, tzmax);

  if (tmin < 0) tmin = tmax;
  if (tmin < 0) return null;

  const hitPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(tmin));
  return { distance: tmin, point: hitPoint };
}

function isRayBlockedByGlass(origin, direction, glassPlane, glassType, deterministic = true, seedIndex = 0) {
  const glass = GLASS_TYPES[glassType];
  const ray = new THREE.Ray(origin.clone(), direction.clone());
  const intersectionPoint = new THREE.Vector3();

  if (!ray.intersectPlane(glassPlane, intersectionPoint)) {
    return { blocked: false, transparency: 1.0 };
  }

  const toGlass = intersectionPoint.clone().sub(origin);
  const distToGlass = toGlass.length();
  const glassNormal = new THREE.Vector3(0, 0, 1);
  const cosAngle = Math.abs(direction.dot(glassNormal));

  const effectiveOpacity = (1.0 - glass.transmission) + glass.normalStrength * 0.6;
  const viewAngle = Math.acos(cosAngle);
  const angleFactor = 1.0 + viewAngle * 0.5;

  const blockedProbability = Math.min(1.0, effectiveOpacity * angleFactor);

  let isBlocked;
  if (deterministic) {
    const rng = mulberry32(deterministicHash(
      'block:' + glassType + ':' + intersectionPoint.x.toFixed(3) + ':' +
      intersectionPoint.y.toFixed(3) + ':' + seedIndex
    ));
    isBlocked = rng() < blockedProbability;
  } else {
    isBlocked = Math.random() < blockedProbability;
  }

  return {
    blocked: isBlocked,
    transparency: glass.transmission * cosAngle,
    intersectionPoint,
    distToGlass,
    effectiveOpacity,
    blockedProbability
  };
}

function performPrivacyCheck(
  observerOrigin,
  observerDirection,
  glassPlane,
  humanBounds,
  glassType,
  halfAngle = Math.PI / 12,
  sampleCount = 48,
  deterministic = true
) {
  const glass = GLASS_TYPES[glassType];
  const viewCone = createViewCone(observerOrigin, observerDirection, halfAngle, sampleCount, deterministic);

  let totalRays = viewCone.length;
  let raysReachingHuman = 0;
  let raysBlockedByGlass = 0;
  let penetrationDistances = [];
  let transparencyValues = [];

  for (let i = 0; i < viewCone.length; i++) {
    const ray = viewCone[i];
    const glassResult = isRayBlockedByGlass(ray.origin, ray.direction, glassPlane, glassType, deterministic, i);

    if (glassResult.blocked) {
      raysBlockedByGlass++;
      continue;
    }

    const humanHit = rayIntersectsHumanSilhouette(ray, humanBounds);
    if (humanHit) {
      if (!glassResult.intersectionPoint || humanHit.distance > glassResult.distToGlass) {
        raysReachingHuman++;
        penetrationDistances.push(humanHit.distance);
        transparencyValues.push(glassResult.transparency);
      }
    }
  }

  const penetrationRatio = raysReachingHuman / totalRays;
  const blockRatio = raysBlockedByGlass / totalRays;

  const avgTransparency = transparencyValues.length > 0
    ? transparencyValues.reduce((a, b) => a + b, 0) / transparencyValues.length
    : 0;

  let privacyScore;
  if (penetrationRatio < 0.05) {
    privacyScore = 0.95 + (0.05 - penetrationRatio) * 1.0;
  } else if (penetrationRatio < 0.2) {
    privacyScore = 0.7 + (0.2 - penetrationRatio) * 1.5;
  } else if (penetrationRatio < 0.5) {
    privacyScore = 0.3 + (0.5 - penetrationRatio) * 1.3;
  } else {
    privacyScore = Math.max(0, 0.3 - (penetrationRatio - 0.5) * 0.6);
  }
  privacyScore = Math.min(1.0, Math.max(0.0, privacyScore));

  let privacyGrade;
  if (privacyScore >= 0.85) privacyGrade = 'A';
  else if (privacyScore >= 0.7) privacyGrade = 'B';
  else if (privacyScore >= 0.5) privacyGrade = 'C';
  else if (privacyScore >= 0.3) privacyGrade = 'D';
  else privacyGrade = 'F';

  const isPrivacyAlert = privacyScore < 0.3;

  return {
    penetrationRatio,
    blockRatio,
    privacyScore,
    privacyGrade,
    isPrivacyAlert,
    avgTransparency,
    raysReachingHuman,
    totalRays,
    penetrationDistances,
    glassType,
    deterministic
  };
}

export { createViewCone, isRayBlockedByGlass, performPrivacyCheck, deterministicHash, mulberry32 };
