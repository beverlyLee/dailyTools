varying vec3 vColor;
varying float vSpeed;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  vec3 baseColor = clamp(vColor, 0.0, 1.0);

  float coreMask = 1.0 - smoothstep(0.0, 0.22, dist);
  float midMask  = 1.0 - smoothstep(0.0, 0.42, dist);
  float haloMask = 1.0 - smoothstep(0.0, 0.50, dist);

  float hotness = clamp(vSpeed * 0.18, 0.0, 1.0);
  float boost = 1.0 + hotness * 1.2;

  vec3 coreCol = baseColor * boost;
  vec3 midCol  = baseColor * (0.85 + hotness * 0.6);
  vec3 haloCol = baseColor * (0.55 + hotness * 0.35);

  float wCore = pow(coreMask, 1.5) * 1.2;
  float wMid  = pow(midMask, 1.8)  * 0.8;
  float wHalo = pow(haloMask, 2.2) * 0.5;

  float wSum = wCore + wMid + wHalo + 0.0001;

  vec3 finalColor = (coreCol * wCore + midCol * wMid + haloCol * wHalo) / wSum;

  float alpha = wCore * 0.55 + wMid * 0.35 + wHalo * 0.20;
  alpha = clamp(alpha, 0.0, 1.0);

  finalColor = clamp(finalColor, 0.0, 1.5);

  gl_FragColor = vec4(finalColor, alpha);
}
