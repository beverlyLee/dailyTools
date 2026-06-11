import * as THREE from 'three';
import { GLASS_TYPES } from './glassMaterialLib.js';

function createViewCone(origin, direction, halfAngle, rayCount = 24) {
  const rays = [];
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(direction, up).normalize();
  const adjustedUp = new THREE.Vector3().crossVectors(right, direction).normalize();

  rays.push({ origin: origin.clone(), direction: direction.clone() });

  for (let i = 0; i < rayCount - 1; i++) {
    const theta = (i / (rayCount - 1)) * Math.PI * 2;
    const phi = halfAngle * (0.3 + Math.random() * 0.7);

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

function isRayBlockedByGlass(origin, direction, glassPlane, glassType) {
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

  return {
    blocked: Math.random() < blockedProbability,
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
  sampleCount = 48
) {
  const glass = GLASS_TYPES[glassType];
  const viewCone = createViewCone(observerOrigin, observerDirection, halfAngle, sampleCount);

  let totalRays = viewCone.length;
  let raysReachingHuman = 0;
  let raysBlockedByGlass = 0;
  let penetrationDistances = [];
  let transparencyValues = [];

  for (const ray of viewCone) {
    const glassResult = isRayBlockedByGlass(ray.origin, ray.direction, glassPlane, glassType);

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
    glassType
  };
}

export { createViewCone, isRayBlockedByGlass, performPrivacyCheck };
