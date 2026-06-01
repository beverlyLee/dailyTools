varying vec2 vUv;
varying float vDistance;
varying vec2 vWorldPos;

uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uTime;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2d(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise2d(p * frequency);
    frequency *= 2.1;
    amplitude *= 0.52;
  }
  return value;
}

vec3 getTemperatureColor(float t) {
  vec3 deepBlue = vec3(0.02, 0.08, 1.0);
  vec3 blue = vec3(0.15, 0.35, 1.0);
  vec3 white = vec3(1.0, 0.95, 0.9);
  vec3 yellow = vec3(1.0, 0.8, 0.3);
  vec3 orange = vec3(1.0, 0.5, 0.05);
  vec3 red = vec3(1.0, 0.2, 0.02);
  vec3 brightRed = vec3(1.0, 0.08, 0.0);
  vec3 deepRed = vec3(1.0, 0.03, 0.0);
  
  if (t < 0.1) {
    return mix(deepBlue, blue, t * 10.0);
  } else if (t < 0.25) {
    float s = (t - 0.1) / 0.15;
    s = s * s * (3.0 - 2.0 * s);
    return mix(blue, white, s);
  } else if (t < 0.4) {
    float s = (t - 0.25) / 0.15;
    s = s * s * (3.0 - 2.0 * s);
    return mix(white, yellow, s);
  } else if (t < 0.55) {
    float s = (t - 0.4) / 0.15;
    s = s * s * (3.0 - 2.0 * s);
    return mix(yellow, orange, s);
  } else if (t < 0.7) {
    float s = (t - 0.55) / 0.15;
    s = s * s * (3.0 - 2.0 * s);
    return mix(orange, red, s);
  } else if (t < 0.85) {
    float s = (t - 0.7) / 0.15;
    s = pow(s, 0.7);
    return mix(red, brightRed, s);
  } else {
    float s = (t - 0.85) / 0.15;
    s = pow(s, 0.5);
    return mix(brightRed, deepRed, s);
  }
}

void main() {
  float normalizedDist = (vDistance - uInnerRadius) / (uOuterRadius - uInnerRadius);
  normalizedDist = clamp(normalizedDist, 0.0, 1.0);
  
  float brightness = 1.0 - normalizedDist;
  brightness = pow(brightness, 0.85);
  
  float outerBrightnessBoost = smoothstep(0.3, 0.95, normalizedDist);
  brightness += outerBrightnessBoost * 0.5;
  
  float localTime = uTime * (1.0 + normalizedDist * 0.6);
  
  vec2 pos = vWorldPos;
  float angle = atan(pos.y, pos.x);
  
  vec2 radialDir = normalize(pos);
  vec2 tangentDir = vec2(-radialDir.y, radialDir.x);
  
  vec2 turbulenceCoord = pos * 2.5;
  float turbulence = fbm2d(turbulenceCoord + vec2(localTime * 0.3, localTime * -0.2));
  
  vec2 distortedPos = pos + tangentDir * turbulence * 0.4 + radialDir * turbulence * 0.15;
  
  float radialNoise = fbm2d(distortedPos * 1.8 + vec2(localTime * 0.25, -localTime * 0.15));
  float tangentialNoise = fbm2d(vec2(angle * 3.0 / 6.2832 + localTime * 0.12, normalizedDist * 8.0));
  float fineNoise = fbm2d(distortedPos * 6.0 + vec2(-localTime * 0.4, localTime * 0.35));
  float microNoise = noise2d(distortedPos * 20.0 + localTime * 1.2);
  
  float combinedNoise = radialNoise * 0.35 + tangentialNoise * 0.3 + fineNoise * 0.2 + microNoise * 0.15;
  brightness *= 0.55 + combinedNoise * 0.8;
  
  float hotStreak = smoothstep(0.6, 0.9, tangentialNoise * fineNoise);
  brightness += hotStreak * 0.3;
  
  float innerGlow = 1.0 - smoothstep(0.0, 0.15, normalizedDist);
  brightness += innerGlow * 0.5;
  
  vec3 color = getTemperatureColor(normalizedDist + turbulence * 0.08);
  
  float outerBoost = smoothstep(0.4, 1.0, normalizedDist);
  color.r += outerBoost * 0.25;
  color.g *= 1.0 - outerBoost * 0.2;
  color.b -= outerBoost * 0.08;
  
  color *= brightness;
  
  float alpha = brightness * 0.9;
  alpha *= smoothstep(0.0, 0.06, normalizedDist);
  alpha *= smoothstep(1.0, 0.75, normalizedDist);
  alpha += outerBoost * 0.3;
  
  gl_FragColor = vec4(color, alpha);
}
