uniform float uTime;
uniform float uSpeed;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float flowSpeed = uTime * 0.3 + uSpeed * 0.01;
  float v = vUv.y + flowSpeed;

  float stripes = sin(v * 40.0);
  float glow = smoothstep(0.8, 1.0, stripes);
  glow += smoothstep(-1.0, -0.8, stripes) * 0.8;

  float pulse = sin(uTime * 2.0) * 0.25 + 0.75;
  glow *= pulse;

  float secondaryStripes = sin(v * 20.0 + uTime * 5.0);
  float secondaryGlow = smoothstep(0.85, 1.0, secondaryStripes) * 1.5;

  float tertiaryStripes = sin(v * 80.0 + uTime * 8.0);
  float tertiaryGlow = smoothstep(0.92, 1.0, tertiaryStripes) * 0.5;

  vec3 color1 = hsv2rgb(vec3(0.85, 1.0, 1.0));
  vec3 color2 = hsv2rgb(vec3(0.55, 1.0, 1.0));
  vec3 color3 = hsv2rgb(vec3(0.15, 1.0, 1.0));

  float colorMix = sin(v * 5.0 + uTime * 0.5);
  vec3 neonColor = mix(color1, color2, smoothstep(-1.0, 1.0, colorMix));
  neonColor = mix(neonColor, color3, smoothstep(-0.5, 0.5, sin(v * 3.0 - uTime * 0.3)));

  float viewDepth = length(vViewPosition);
  float depthFade = smoothstep(0.0, 150.0, viewDepth);
  depthFade = 0.6 + (1.0 - depthFade) * 0.4;

  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(normalize(vNormal), viewDir));
  float edgeGlow = pow(fresnel, 1.2) * 2.0;

  vec3 finalColor = neonColor * glow * 6.0;
  finalColor += neonColor * secondaryGlow * 2.0;
  finalColor += neonColor * tertiaryGlow * 3.0;

  vec3 baseColor = neonColor * 0.4;
  finalColor += baseColor;

  finalColor += neonColor * edgeGlow;

  finalColor *= depthFade;

  gl_FragColor = vec4(finalColor, 1.0);
}
