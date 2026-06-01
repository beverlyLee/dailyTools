varying vec3 vWorldPosition;
varying vec3 vViewDirection;

uniform float uBlackHoleRadius;
uniform float uLensStrength;
uniform float uTime;

float random(vec3 st) {
  return fract(sin(dot(st.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
}

float noise(vec3 st) {
  vec3 i = floor(st);
  vec3 f = fract(st);
  float a = random(i);
  float b = random(i + vec3(1.0, 0.0, 0.0));
  float c = random(i + vec3(0.0, 1.0, 0.0));
  float d = random(i + vec3(1.0, 1.0, 0.0));
  float e = random(i + vec3(0.0, 0.0, 1.0));
  float f2 = random(i + vec3(1.0, 0.0, 1.0));
  float g = random(i + vec3(0.0, 1.0, 1.0));
  float h = random(i + vec3(1.0, 1.0, 1.0));
  
  vec3 u = f * f * (3.0 - 2.0 * f);
  
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  float y1 = mix(x1, x2, u.y);
  
  float x3 = mix(e, f2, u.x);
  float x4 = mix(g, h, u.x);
  float y2 = mix(x3, x4, u.y);
  
  return mix(y1, y2, u.z);
}

float fbm(vec3 st) {
  float value = 0.0;
  float amplitude = 0.6;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(st * frequency);
    frequency *= 2.0;
    amplitude *= 0.55;
  }
  return value;
}

vec3 getStarColor(float randVal) {
  if (randVal < 0.7) {
    return vec3(1.0);
  } else if (randVal < 0.85) {
    return vec3(1.0, 0.95, 0.8);
  } else if (randVal < 0.95) {
    return vec3(0.9, 0.95, 1.0);
  } else {
    return vec3(1.0, 0.8, 0.6);
  }
}

vec3 createStars(vec3 dir) {
  vec3 color = vec3(0.0);
  
  for (int octaves = 4; octaves > 0; octaves--) {
    float scale = 8.0 + float(4 - octaves) * 4.0;
    vec3 st = dir * scale;
    float stars = noise(st);
    stars = pow(stars, 35.0);
    float brightness = 0.3 + float(octaves) * 0.15;
    color += stars * brightness * getStarColor(random(floor(st)));
  }
  
  return color;
}

vec3 gravitationalLens(vec3 viewDir, vec3 blackHolePos, float blackHoleRadius) {
  vec3 toBlackHole = blackHolePos - cameraPosition;
  float distToBlackHole = length(toBlackHole);
  vec3 dirToBlackHole = normalize(toBlackHole);
  
  float cosAngle = dot(viewDir, dirToBlackHole);
  float angle = acos(clamp(cosAngle, -1.0, 1.0));
  
  float schwarzschild = blackHoleRadius * 2.0;
  
  float minAngle = schwarzschild / distToBlackHole;
  float effectiveAngle = max(angle, minAngle * 0.1);
  
  float bendAngle = (schwarzschild / effectiveAngle) * uLensStrength * 0.1;
  bendAngle = min(bendAngle, angle * 0.8);
  
  float spatialCoupling = 1.0 + angle * 0.5;
  float perturbation = fbm(viewDir * 6.0 + uTime * 0.08 * spatialCoupling) * 0.25;
  bendAngle += perturbation * bendAngle * 1.5;
  
  float influenceRadius = 2.5;
  float influence = smoothstep(influenceRadius, 0.0, angle);
  influence = pow(influence, 0.6) * (1.0 - pow(1.0 - influence, 3.0));
  influence = influence * 0.8 + smoothstep(influenceRadius * 0.5, 0.0, angle) * 0.2;
  
  vec3 perp = normalize(viewDir - dirToBlackHole * cosAngle);
  float totalAngle = angle - bendAngle * influence;
  vec3 lensedDir = viewDir * cos(totalAngle) + perp * sin(totalAngle);
  
  return normalize(lensedDir);
}

void main() {
  vec3 viewDir = normalize(vViewDirection);
  vec3 blackHolePos = vec3(0.0);
  float blackHoleRadius = uBlackHoleRadius;
  
  vec3 lensedDir = gravitationalLens(viewDir, blackHolePos, blackHoleRadius);
  
  vec3 stars = createStars(lensedDir * 50.0);
  
  vec3 toBlackHole = blackHolePos - cameraPosition;
  float distToBlackHole = length(toBlackHole);
  vec3 dirToBlackHole = normalize(toBlackHole);
  float cosAngle = dot(viewDir, dirToBlackHole);
  float angle = acos(clamp(cosAngle, -1.0, 1.0));
  
  float apparentRadius = atan(blackHoleRadius, distToBlackHole);
  
  float timeWarp = uTime * (1.0 + angle * 0.4);
  
  float ringAngleNoise = fbm(viewDir * 5.0 + vec3(0.0, timeWarp * 0.07, 0.0)) * apparentRadius * 1.2;
  float noisyAngle = angle + ringAngleNoise;
  
  float einsteinRadius = apparentRadius * 1.8;
  
  float n1 = fbm(viewDir * 11.0 + vec3(timeWarp * 0.05, 0.0, 0.0));
  float n2 = fbm(viewDir * 9.0 + 3.0 + vec3(0.0, timeWarp * 0.045, 0.0));
  float n3 = fbm(viewDir * 10.0 + 10.0 + vec3(0.0, 0.0, timeWarp * 0.055));
  float n4 = fbm(viewDir * 7.0 + 7.0 + vec3(timeWarp * 0.04));
  
  float ring1Center = einsteinRadius * (0.9 + n1 * 0.5);
  float ring1Width = einsteinRadius * (0.15 + n2 * 0.35);
  float ring1Dist = abs(noisyAngle - ring1Center);
  float ring1 = 1.0 - smoothstep(0.0, ring1Width, ring1Dist);
  ring1 = pow(ring1, 0.6);
  
  float ring2Center = einsteinRadius * (1.7 + n3 * 0.5);
  float ring2Width = einsteinRadius * (0.2 + n4 * 0.4);
  float ring2Dist = abs(noisyAngle - ring2Center);
  float ring2 = 1.0 - smoothstep(0.0, ring2Width, ring2Dist);
  ring2 = pow(ring2, 0.7);
  
  float ring1Brightness = fbm(viewDir * 18.0 + vec3(timeWarp * 0.1)) * 0.8 + 0.2;
  float ring2Brightness = fbm(viewDir * 14.0 + vec3(0.0, timeWarp * 0.08, 0.0)) * 0.65 + 0.35;
  float totalRing = ring1 * 0.7 * ring1Brightness + ring2 * 0.4 * ring2Brightness;
  stars += vec3(0.35, 0.45, 0.7) * totalRing;
  
  float glowRadius = apparentRadius * 4.5;
  float glowNoiseVal = fbm(viewDir * 7.0 + vec3(0.0, 0.0, timeWarp * 0.06));
  float noisyGlowRadius = glowRadius * (0.7 + glowNoiseVal * 0.6);
  float glow = exp(-pow(noisyAngle / noisyGlowRadius, 2.0) * 2.0);
  glow *= (1.0 - smoothstep(apparentRadius * 0.85, apparentRadius * 0.92, angle));
  float glowDetailNoise = fbm(viewDir * 12.0 + vec3(timeWarp * 0.07, -timeWarp * 0.04, 0.0));
  float glowModulation = 0.4 + glowDetailNoise * 0.8;
  stars += vec3(0.08, 0.12, 0.22) * glow * glowModulation;
  
  float shadowNoiseDetail = fbm(viewDir * 15.0 + vec3(timeWarp * 0.045, timeWarp * 0.03, 0.0));
  float shadowNoise2 = fbm(viewDir * 25.0 + vec3(0.0, timeWarp * 0.06, timeWarp * 0.035));
  float shadowIrregularity = shadowNoiseDetail * 0.3 + shadowNoise2 * 0.15;
  float shadowEdge = apparentRadius * (1.05 + shadowIrregularity);
  float shadowWidth = apparentRadius * (0.1 + shadowNoise2 * 0.12);
  float shadow = 1.0 - smoothstep(shadowEdge - shadowWidth, shadowEdge, angle);
  shadow *= smoothstep(0.0, shadowEdge * 0.5, angle);
  stars *= (1.0 - shadow);
  
  gl_FragColor = vec4(stars, 1.0);
}
