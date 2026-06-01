export const AuroraShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorGreen: { value: { r: 0.15, g: 1.0, b: 0.45 } },
    uColorPurple: { value: { r: 0.55, g: 0.15, b: 0.9 } },
    uColorCyan: { value: { r: 0.25, g: 0.85, b: 1.0 } }
  },

  vertexShader: `
    uniform float uTime;
    
    varying vec2 vUv;
    varying float vHeight;
    varying float vNoise;
    varying float vRayPattern;
    
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      
      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      vUv = uv;
      
      vec3 pos = position;
      
      float timeScale = uTime * 0.1;
      
      float baseNoise = snoise(vec3(pos.x * 0.2 + timeScale, pos.y * 0.08, timeScale * 0.25));
      float detailNoise = snoise(vec3(pos.x * 0.5 - timeScale * 0.2, pos.y * 0.2, timeScale * 0.5)) * 0.35;
      float fineNoise = snoise(vec3(pos.x * 1.2 + timeScale * 0.12, pos.y * 0.5, timeScale * 0.7)) * 0.1;
      
      float combinedNoise = baseNoise + detailNoise + fineNoise;
      
      float silkWave = sin(pos.x * 0.35 + uTime * 0.1 + pos.y * 0.2) * 0.2;
      silkWave += sin(pos.x * 0.7 - uTime * 0.05 + pos.y * 0.4) * 0.1;
      
      pos.y += combinedNoise * 2.0 + silkWave * 1.0;
      pos.x += combinedNoise * 1.2 * sin(uTime * 0.03 + position.y * 0.15);
      pos.z += combinedNoise * 0.5 + silkWave * 0.2;
      
      float rayStripe = sin(pos.x * 2.0 + uTime * 0.2) * 0.5 + 0.5;
      rayStripe += sin(pos.x * 4.5 - uTime * 0.12 + pos.y * 1.2) * 0.25;
      rayStripe = clamp(rayStripe, 0.0, 1.0);
      
      float sharpStripe = pow(rayStripe, 2.5);
      vRayPattern = sharpStripe;
      
      vHeight = position.y * 0.5 + 0.5;
      vNoise = combinedNoise;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 uColorGreen;
    uniform vec3 uColorPurple;
    uniform vec3 uColorCyan;
    uniform float uTime;
    
    varying vec2 vUv;
    varying float vHeight;
    varying float vNoise;
    varying float vRayPattern;
    
    void main() {
      float heightFactor = smoothstep(0.0, 1.0, vHeight);
      
      vec3 baseColor = mix(uColorGreen, uColorCyan, heightFactor * 0.2);
      baseColor = mix(baseColor, uColorPurple, heightFactor * 0.65);
      
      float verticalMask = smoothstep(0.03, 0.15, vUv.y);
      verticalMask *= 1.0 - smoothstep(0.8, 0.97, vUv.y);
      
      float distFromCenter = abs(vUv.x - 0.5);
      
      float coreHalf = 0.05;
      float fadeRange = 0.25;
      float coreMask = 1.0 - smoothstep(coreHalf, coreHalf + fadeRange, distFromCenter);
      coreMask = pow(coreMask, 1.4);
      
      float stripeIntensity = vRayPattern * 0.7 + 0.3;
      stripeIntensity = pow(stripeIntensity, 1.3);
      
      float flicker = sin(uTime * 1.2 + vUv.x * 5.0) * 0.03 + 1.0;
      flicker += sin(uTime * 2.0 + vUv.y * 4.0) * 0.015;
      
      float noiseMod = 0.7 + 0.3 * clamp(vNoise, -1.0, 1.0);
      
      float totalIntensity = verticalMask * coreMask * stripeIntensity * flicker * noiseMod;
      
      float edgeFadeTop = smoothstep(1.0, 0.82, vUv.y);
      float edgeFadeBottom = smoothstep(0.0, 0.06, vUv.y);
      float edgeFade = edgeFadeTop * edgeFadeBottom;
      
      float alpha = totalIntensity * edgeFade;
      alpha = pow(alpha, 0.9);
      
      float emissionBoost = 0.9 + heightFactor * 0.4;
      vec3 finalColor = baseColor * emissionBoost;
      finalColor += baseColor * vRayPattern * 0.15;
      
      float totalAlpha = clamp(alpha * 0.7, 0.0, 1.0);
      
      if (totalAlpha < 0.005) discard;
      
      gl_FragColor = vec4(finalColor, totalAlpha);
    }
  `
}

const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
]

const PERM = new Uint8Array(512)
const PERM_MOD12 = new Uint8Array(512)
{
  const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,
    103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,
    197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,
    20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,
    231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,
    200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,
    226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,
    47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,
    70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,
    224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,
    12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,
    199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,
    93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]
  for (let i = 0; i < 256; i++) {
    PERM[i] = p[i]
    PERM[i + 256] = p[i]
    PERM_MOD12[i] = p[i] % 12
    PERM_MOD12[i + 256] = p[i] % 12
  }
}

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z
}

const F3 = 1.0 / 3.0
const G3 = 1.0 / 6.0

export function sampleNoiseAt(time: number): number {
  return simplex3(0, 0, time * 0.1)
}

function simplex3(xin: number, yin: number, zin: number): number {
  let n0: number, n1: number, n2: number, n3: number

  const s = (xin + yin + zin) * F3
  const i = Math.floor(xin + s)
  const j = Math.floor(yin + s)
  const k = Math.floor(zin + s)

  const t = (i + j + k) * G3
  const X0 = i - t
  const Y0 = j - t
  const Z0 = k - t
  const x0 = xin - X0
  const y0 = yin - Y0
  const z0 = zin - Z0

  let i1: number, j1: number, k1: number
  let i2: number, j2: number, k2: number

  if (x0 >= y0) {
    if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0 }
    else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1 }
    else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1 }
  } else {
    if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1 }
    else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1 }
    else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0 }
  }

  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2.0 * G3
  const y2 = y0 - j2 + 2.0 * G3
  const z2 = z0 - k2 + 2.0 * G3
  const x3 = x0 - 1.0 + 3.0 * G3
  const y3 = y0 - 1.0 + 3.0 * G3
  const z3 = z0 - 1.0 + 3.0 * G3

  const ii = i & 255
  const jj = j & 255
  const kk = k & 255

  const gi0 = PERM_MOD12[ii + PERM[jj + PERM[kk]]]
  const gi1 = PERM_MOD12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]]
  const gi2 = PERM_MOD12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]]
  const gi3 = PERM_MOD12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]]

  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0
  if (t0 < 0) n0 = 0.0
  else { t0 *= t0; n0 = t0 * t0 * dot3(GRAD3[gi0], x0, y0, z0) }

  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1
  if (t1 < 0) n1 = 0.0
  else { t1 *= t1; n1 = t1 * t1 * dot3(GRAD3[gi1], x1, y1, z1) }

  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2
  if (t2 < 0) n2 = 0.0
  else { t2 *= t2; n2 = t2 * t2 * dot3(GRAD3[gi2], x2, y2, z2) }

  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3
  if (t3 < 0) n3 = 0.0
  else { t3 *= t3; n3 = t3 * t3 * dot3(GRAD3[gi3], x3, y3, z3) }

  return 32.0 * (n0 + n1 + n2 + n3)
}
