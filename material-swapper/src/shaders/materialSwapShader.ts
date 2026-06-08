export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vTangent;

  uniform vec2 uvRepeat;
  uniform vec2 uvOffset;
  uniform float uvRotation;

  void main() {
    vUv = uv;
    
    float sinAngle = sin(uvRotation);
    float cosAngle = cos(uvRotation);
    vec2 rotatedUv = vec2(
      vUv.x * cosAngle - vUv.y * sinAngle,
      vUv.x * sinAngle + vUv.y * cosAngle
    );
    vUv = rotatedUv * uvRepeat + uvOffset;
    
    vec3 tangent = normalize(vec3(1.0, 0.0, 0.0));
    vTangent = normalize(normalMatrix * tangent);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying vec3 vTangent;

  uniform int materialType;
  uniform vec3 baseColor;
  uniform float roughness;
  uniform float metalness;
  uniform float envMapIntensity;
  uniform float clearcoat;
  uniform float clearcoatRoughness;
  uniform float reflectivity;
  uniform float time;
  uniform vec3 lightPosition;
  uniform vec3 lightColor;
  uniform float lightIntensity;
  uniform vec3 ambientColor;
  uniform float ambientIntensity;
  uniform float normalStrength;
  uniform sampler2D customMap;
  uniform sampler2D customNormalMap;
  uniform sampler2D customRoughnessMap;
  uniform sampler2D customAOMap;
  uniform bool useCustomTextures;

  #define MATERIAL_WOOD 0
  #define MATERIAL_STONE 1
  #define MATERIAL_FABRIC 2
  #define MATERIAL_METAL 3
  #define MATERIAL_CONCRETE 4
  #define MATERIAL_CUSTOM 5

  #define PI 3.14159265359

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 8; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  float fbm6(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  vec2 fbm2(vec2 p) {
    return vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  }

  float voronoi(vec2 p, float scale) {
    p *= scale;
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = fract(hash(i + neighbor) * vec2(12.9898, 78.233) * 43758.5453);
        vec2 diff = neighbor + point - f;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
    return minDist;
  }

  float voronoiF1F2(vec2 p, float scale, out float f2) {
    p *= scale;
    vec2 i = floor(p);
    vec2 f = fract(p);
    float f1 = 1.0;
    f2 = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = fract(hash(i + neighbor) * vec2(12.9898, 78.233) * 43758.5453);
        vec2 diff = neighbor + point - f;
        float dist = length(diff);
        if (dist < f1) {
          f2 = f1;
          f1 = dist;
        } else if (dist < f2) {
          f2 = dist;
        }
      }
    }
    return f1;
  }

  float woodGrain(vec2 uv) {
    float grain = 0.0;
    
    float baseWarp = fbm(uv * 2.0) * 0.3;
    float fineWarp = fbm(uv * 8.0) * 0.1;
    
    float y = uv.y * 12.0 + baseWarp * 3.0;
    
    float primaryGrain = sin(y * 1.5 + fbm(uv * 2.5) * 2.0) * 0.5 + 0.5;
    primaryGrain = pow(primaryGrain, 1.5);
    
    float secondaryGrain = sin(y * 4.0 + fineWarp * 5.0 + fbm(uv * 6.0) * 1.5) * 0.5 + 0.5;
    secondaryGrain = pow(secondaryGrain, 2.0) * 0.4;
    
    grain = primaryGrain * 0.7 + secondaryGrain * 0.3;
    
    float rayNoise = fbm(vec2(uv.x * 40.0, uv.y * 0.5));
    grain += rayNoise * 0.15;
    
    float fineDetail = fbm(uv * 80.0) * 0.1;
    grain += fineDetail;
    
    return clamp(grain, 0.0, 1.0);
  }

  float woodKnots(vec2 uv, out float knotMask) {
    float knots = 0.0;
    knotMask = 0.0;
    
    vec2 distorted = uv + fbm2(uv * 1.5) * 0.2;
    
    float vor = voronoi(distorted, 3.0);
    float knotCenters = smoothstep(0.0, 0.15, vor);
    knotCenters = 1.0 - knotCenters;
    
    float knotRings = sin(vor * 30.0) * 0.5 + 0.5;
    knotRings *= knotCenters;
    
    float darkKnots = smoothstep(0.2, 0.0, vor) * 0.6;
    
    knots = knotRings * 0.4 + darkKnots;
    knotMask = knotCenters;
    
    return knots;
  }

  vec3 woodColor(vec2 uv) {
    float grain = woodGrain(uv);
    float knotMask;
    float knots = woodKnots(uv, knotMask);
    
    vec3 lightWood = baseColor * 1.25;
    vec3 midWood = baseColor;
    vec3 darkWood = baseColor * 0.65;
    vec3 veryDarkWood = baseColor * 0.4;
    
    vec3 base = mix(darkWood, midWood, grain * 0.7);
    base = mix(base, lightWood, smoothstep(0.4, 0.9, grain) * 0.6);
    
    float ringVariation = sin(uv.y * 20.0 + fbm(uv * 5.0) * 3.0) * 0.5 + 0.5;
    base *= 0.9 + ringVariation * 0.2;
    
    vec3 knotColor = mix(veryDarkWood, darkWood, knots);
    base = mix(base, knotColor, knotMask * 0.8);
    
    float poreNoise = fbm(uv * 150.0);
    base *= 0.95 + poreNoise * 0.1;
    
    float dustNoise = fbm(uv * 30.0) * 0.05;
    base += vec3(dustNoise);
    
    return clamp(base, 0.0, 1.0);
  }

  float marbleVeins(vec2 uv) {
    vec2 p = uv * 2.5;
    
    float warp1 = fbm(p * 1.5) * 0.8;
    float warp2 = fbm(p * 3.0 + 5.0) * 0.4;
    vec2 warped = p + vec2(warp1, warp2 * 0.5);
    
    float veins = 0.0;
    
    float mainVein = sin(warped.x * 2.5 + warped.y * 0.5) * 0.5 + 0.5;
    mainVein = pow(mainVein, 4.0);
    
    float secVein1 = sin(warped.x * 6.0 + warped.y * 1.5 + fbm(p * 4.0) * 2.0) * 0.5 + 0.5;
    secVein1 = pow(secVein1, 6.0) * 0.6;
    
    float secVein2 = sin(warped.x * 12.0 + warped.y * 3.0 + fbm(p * 8.0) * 3.0) * 0.5 + 0.5;
    secVein2 = pow(secVein2, 8.0) * 0.3;
    
    float crackNoise = fbm(p * 20.0);
    float cracks = smoothstep(0.55, 0.65, crackNoise) * 0.2;
    
    veins = mainVein + secVein1 + secVein2 + cracks;
    
    float edgeDetail = fbm(p * 50.0) * 0.15;
    veins += edgeDetail * mainVein;
    
    return clamp(veins, 0.0, 1.0);
  }

  vec3 marbleColor(vec2 uv) {
    float veins = marbleVeins(uv);
    
    vec3 baseStone = baseColor;
    
    vec3 darkVein = baseColor * 0.4;
    vec3 mediumVein = baseColor * 0.65;
    
    vec3 color = baseStone;
    
    color = mix(color, mediumVein, smoothstep(0.1, 0.4, veins) * 0.5);
    
    color = mix(color, darkVein, smoothstep(0.5, 0.9, veins) * 0.8);
    
    float crystalSparkle = fbm(uv * 60.0);
    crystalSparkle = pow(crystalSparkle, 3.0) * 0.15;
    color += vec3(crystalSparkle);
    
    float surfaceVariation = fbm(uv * 8.0) * 0.03;
    color += vec3(surfaceVariation);
    
    float microDetail = fbm(uv * 120.0) * 0.05;
    color *= 0.97 + microDetail;
    
    return clamp(color, 0.0, 1.0);
  }

  float carpetFiber(vec2 uv) {
    float fiber = 0.0;
    
    float directionNoise = fbm(uv * 3.0) * PI;
    float cosDir = cos(directionNoise);
    float sinDir = sin(directionNoise);
    
    vec2 stretchedUv = vec2(
      uv.x * cosDir - uv.y * sinDir,
      uv.x * sinDir + uv.y * cosDir
    ) * 80.0;
    
    float fiberLines = sin(stretchedUv.x + fbm(uv * 20.0) * 5.0) * 0.5 + 0.5;
    fiberLines = pow(fiberLines, 2.0);
    
    fiber += fiberLines * 0.4;
    
    fiber += fbm(uv * 60.0) * 0.3;
    fiber += fbm(uv * 120.0) * 0.2;
    fiber += fbm(uv * 250.0) * 0.1;
    
    float clumps = fbm(uv * 10.0);
    clumps = pow(clumps, 2.0);
    fiber += clumps * 0.15;
    
    float tuftPattern = sin(uv.x * 30.0) * sin(uv.y * 30.0) * 0.5 + 0.5;
    tuftPattern = pow(tuftPattern, 4.0);
    fiber += tuftPattern * 0.1;
    
    return clamp(fiber, 0.0, 1.0);
  }

  vec3 carpetColor(vec2 uv) {
    float fiber = carpetFiber(uv);
    
    vec3 baseFiber = baseColor * 0.9;
    vec3 lightTip = baseColor * 1.2;
    vec3 darkRoot = baseColor * 0.7;
    
    vec3 color = mix(darkRoot, baseFiber, smoothstep(0.2, 0.6, fiber));
    color = mix(color, lightTip, smoothstep(0.6, 0.95, fiber) * 0.6);
    
    float colorVariation = fbm(uv * 5.0);
    vec3 varColor = baseColor * (0.9 + colorVariation * 0.2);
    color = mix(color, varColor, 0.3);
    
    float shadowNoise = fbm(uv * 15.0);
    color *= 0.85 + shadowNoise * 0.3;
    
    float microShadows = fbm(uv * 80.0) * 0.1;
    color -= vec3(microShadows);
    
    float sheen = pow(fiber, 3.0) * 0.1;
    color += vec3(sheen);
    
    return clamp(color, 0.0, 1.0);
  }

  float carpetHeight(vec2 uv) {
    float height = 0.0;
    
    height += fbm(uv * 40.0) * 0.4;
    height += fbm(uv * 100.0) * 0.3;
    height += fbm(uv * 200.0) * 0.2;
    
    float tufts = sin(uv.x * 25.0 + fbm(uv * 10.0) * 3.0) * 
                  sin(uv.y * 25.0 + fbm(uv * 10.0 + 2.0) * 3.0);
    tufts = pow(tufts * 0.5 + 0.5, 3.0);
    height += tufts * 0.3;
    
    return clamp(height, 0.0, 1.0);
  }

  float brushedMetal(vec2 uv) {
    float brush = 0.0;
    
    float mainBrush = fbm(vec2(uv.x * 30.0, uv.y * 0.3));
    mainBrush = pow(mainBrush, 1.5);
    brush += mainBrush * 0.6;
    
    brush += fbm(vec2(uv.x * 100.0, uv.y * 1.0)) * 0.25;
    brush += fbm(vec2(uv.x * 300.0, uv.y * 2.0)) * 0.15;
    
    float scratches = fbm(vec2(uv.x * 500.0, uv.y * 10.0));
    scratches = pow(scratches, 4.0) * 0.1;
    brush += scratches;
    
    float grainNoise = fbm(uv * 20.0) * 0.1;
    brush += grainNoise;
    
    return clamp(brush, 0.0, 1.0);
  }

  vec3 metalColor(vec2 uv) {
    float brush = brushedMetal(uv);
    
    vec3 darkMetal = baseColor * 0.75;
    vec3 midMetal = baseColor;
    vec3 brightMetal = baseColor * 1.3;
    
    vec3 color = mix(darkMetal, midMetal, brush * 0.6);
    color = mix(color, brightMetal, smoothstep(0.6, 0.95, brush) * 0.5);
    
    float grainDetail = fbm(uv * 60.0) * 0.1;
    color += vec3(grainDetail);
    
    float microScratch = fbm(uv * 400.0);
    microScratch = pow(microScratch, 5.0) * 0.15;
    color += vec3(microScratch);
    
    float tarnish = fbm(uv * 5.0) * 0.05;
    color *= 0.95 + tarnish;
    
    return clamp(color, 0.0, 1.0);
  }

  float concreteTexture(vec2 uv) {
    float concrete = 0.0;
    
    concrete += fbm(uv * 3.0) * 0.35;
    concrete += fbm(uv * 8.0) * 0.25;
    concrete += fbm(uv * 20.0) * 0.2;
    concrete += fbm(uv * 50.0) * 0.15;
    concrete += fbm(uv * 120.0) * 0.1;
    concrete += fbm(uv * 300.0) * 0.05;
    
    return clamp(concrete, 0.0, 1.0);
  }

  float concreteSpots(vec2 uv) {
    float spots = 0.0;
    
    float vor = voronoi(uv, 8.0);
    spots = smoothstep(0.0, 0.3, 1.0 - vor);
    spots *= 0.3;
    
    float poreNoise = fbm(uv * 100.0);
    poreNoise = smoothstep(0.6, 0.9, poreNoise);
    spots -= poreNoise * 0.15;
    
    return spots;
  }

  vec3 concreteColor(vec2 uv) {
    float texture = concreteTexture(uv);
    float spots = concreteSpots(uv);
    
    vec3 baseConcrete = baseColor;
    vec3 lightConcrete = baseColor * 1.15;
    vec3 darkConcrete = baseColor * 0.8;
    vec3 spotColor = baseColor * 0.65;
    
    vec3 color = mix(darkConcrete, baseConcrete, texture * 0.5);
    color = mix(color, lightConcrete, smoothstep(0.5, 0.9, texture) * 0.4);
    
    color = mix(color, spotColor, abs(spots));
    
    float aggregate = fbm(uv * 40.0);
    aggregate = pow(aggregate, 3.0) * 0.1;
    color += vec3(aggregate);
    
    float fineGrain = fbm(uv * 200.0) * 0.05;
    color += vec3(fineGrain);
    
    float wearPattern = fbm(uv * 2.0) * 0.05;
    color += vec3(wearPattern);
    
    return clamp(color, 0.0, 1.0);
  }

  vec3 getMaterialColor(vec2 uv) {
    if (useCustomTextures && materialType == MATERIAL_CUSTOM) {
      vec3 texColor = texture2D(customMap, uv).rgb;
      return texColor * baseColor;
    }
    
    if (materialType == MATERIAL_WOOD) {
      return woodColor(uv);
    }
    else if (materialType == MATERIAL_STONE) {
      return marbleColor(uv);
    }
    else if (materialType == MATERIAL_FABRIC) {
      return carpetColor(uv);
    }
    else if (materialType == MATERIAL_METAL) {
      return metalColor(uv);
    }
    else if (materialType == MATERIAL_CONCRETE) {
      return concreteColor(uv);
    }
    
    return baseColor;
  }

  float getMaterialRoughness(vec2 uv) {
    float rough = roughness;
    
    if (useCustomTextures && materialType == MATERIAL_CUSTOM) {
      float roughTex = texture2D(customRoughnessMap, uv).r;
      rough *= roughTex;
      return clamp(rough, 0.0, 1.0);
    }
    
    if (materialType == MATERIAL_WOOD) {
      float grain = woodGrain(uv);
      rough += grain * 0.08;
      float knots;
      woodKnots(uv, knots);
      rough += knots * 0.1;
    }
    else if (materialType == MATERIAL_STONE) {
      float veins = marbleVeins(uv);
      rough += veins * 0.05;
      rough += fbm(uv * 30.0) * 0.03;
    }
    else if (materialType == MATERIAL_FABRIC) {
      float fiber = carpetFiber(uv);
      rough = 0.8 + fiber * 0.2;
    }
    else if (materialType == MATERIAL_METAL) {
      float brush = brushedMetal(uv);
      rough += brush * 0.12;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      rough += concreteTexture(uv) * 0.1;
    }
    
    return clamp(rough, 0.0, 1.0);
  }

  float getMaterialHeight(vec2 uv) {
    if (materialType == MATERIAL_WOOD) {
      return woodGrain(uv) * 0.3;
    }
    else if (materialType == MATERIAL_STONE) {
      return marbleVeins(uv) * 0.15;
    }
    else if (materialType == MATERIAL_FABRIC) {
      return carpetHeight(uv);
    }
    else if (materialType == MATERIAL_METAL) {
      return brushedMetal(uv) * 0.1;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      return concreteTexture(uv) * 0.2;
    }
    return 0.0;
  }

  vec3 getMaterialNormal(vec2 uv, vec3 surfNormal) {
    vec3 normal = surfNormal;
    
    if (useCustomTextures && materialType == MATERIAL_CUSTOM) {
      vec3 normalMap = texture2D(customNormalMap, uv).xyz * 2.0 - 1.0;
      normalMap.xy *= normalStrength;
      
      vec3 T = normalize(vTangent);
      vec3 N = normalize(surfNormal);
      vec3 B = normalize(cross(N, T));
      mat3 TBN = mat3(T, B, N);
      
      normal = normalize(TBN * normalMap);
      return normal;
    }
    
    float height = 0.0;
    
    if (materialType == MATERIAL_WOOD) {
      height = woodGrain(uv) * 0.3;
      float knots;
      woodKnots(uv, knots);
      height -= knots * 0.2;
    }
    else if (materialType == MATERIAL_STONE) {
      height = marbleVeins(uv) * 0.15;
      height += fbm(uv * 40.0) * 0.1;
    }
    else if (materialType == MATERIAL_FABRIC) {
      height = carpetHeight(uv);
    }
    else if (materialType == MATERIAL_METAL) {
      height = brushedMetal(uv) * 0.1;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      height = concreteTexture(uv) * 0.2;
      height += concreteSpots(uv) * 0.1;
    }
    
    float strength = normalStrength;
    float hx = height - getMaterialHeight(uv + vec2(0.001, 0.0));
    float hy = height - getMaterialHeight(uv + vec2(0.0, 0.001));
    
    vec3 T = normalize(vTangent);
    vec3 N = normalize(surfNormal);
    vec3 B = normalize(cross(N, T));
    
    vec3 bumpNormal = normalize(vec3(hx * strength, hy * strength, 1.0));
    mat3 TBN = mat3(T, B, N);
    
    normal = normalize(TBN * bumpNormal);
    
    return normal;
  }

  float getAmbientOcclusion(vec2 uv) {
    if (useCustomTextures && materialType == MATERIAL_CUSTOM) {
      return texture2D(customAOMap, uv).r;
    }
    
    float ao = 1.0;
    
    if (materialType == MATERIAL_FABRIC) {
      float height = carpetHeight(uv);
      ao = 0.7 + height * 0.3;
    }
    else if (materialType == MATERIAL_STONE) {
      float veins = marbleVeins(uv);
      ao = 0.9 - veins * 0.2;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      float tex = concreteTexture(uv);
      ao = 0.85 + tex * 0.15;
    }
    
    return clamp(ao, 0.0, 1.0);
  }

  float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return nom / denom;
  }

  float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    return nom / denom;
  }

  float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
  }

  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  vec3 getEnvColor(vec3 dir) {
    float skyGradient = smoothstep(-0.3, 0.9, dir.y);
    vec3 skyColor = mix(vec3(0.4, 0.45, 0.55), vec3(0.85, 0.9, 0.95), skyGradient);
    
    float sunDir = dot(dir, normalize(vec3(0.5, 0.8, 0.3)));
    vec3 sunColor = vec3(1.0, 0.95, 0.85) * pow(max(sunDir, 0.0), 32.0) * 0.5;
    
    float horizonGlow = smoothstep(0.0, 0.1, dir.y) * smoothstep(0.3, 0.1, dir.y);
    vec3 horizonColor = vec3(0.9, 0.85, 0.75) * horizonGlow * 0.3;
    
    return skyColor + sunColor + horizonColor;
  }

  void main() {
    vec2 uv = vUv;
    vec3 surfNormal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    vec3 albedo = getMaterialColor(uv);
    float rough = getMaterialRoughness(uv);
    float metal = metalness;
    vec3 normal = getMaterialNormal(uv, surfNormal);
    float ao = getAmbientOcclusion(uv);
    
    vec3 lightDir = normalize(lightPosition - vWorldPosition);
    vec3 halfVec = normalize(viewDir + lightDir);
    
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metal);
    
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    
    float NDF = DistributionGGX(normal, halfVec, rough);
    float G = GeometrySmith(normal, viewDir, lightDir, rough);
    vec3 F = fresnelSchlick(max(dot(halfVec, viewDir), 0.0), F0);
    
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * NdotV * NdotL + 0.0001;
    vec3 specular = numerator / denominator;
    
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metal;
    
    vec3 radiance = lightColor * lightIntensity;
    vec3 Lo = (kD * albedo / PI + specular) * radiance * NdotL;
    
    vec3 F_ambient = fresnelSchlickRoughness(NdotV, F0, rough);
    vec3 kS_ambient = F_ambient;
    vec3 kD_ambient = (1.0 - kS_ambient) * (1.0 - metal);
    
    vec3 irradiance = getEnvColor(normal) * ambientIntensity * 0.3;
    vec3 diffuseIrradiance = irradiance * albedo;
    
    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 prefilteredColor = getEnvColor(reflectDir);
    vec3 specularIrradiance = prefilteredColor * (F_ambient * envMapIntensity + (1.0 - F_ambient) * 0.04);
    
    vec3 ambient = (kD_ambient * diffuseIrradiance + specularIrradiance * 0.5) * ao;
    
    if (clearcoat > 0.0) {
      float coatNdotV = max(dot(surfNormal, viewDir), 0.0);
      float coatFresnel = pow(1.0 - coatNdotV, 5.0);
      vec3 coatReflect = reflect(-viewDir, surfNormal);
      vec3 coatEnv = getEnvColor(coatReflect);
      float coatSpec = mix(0.04, 1.0, coatFresnel) * clearcoat * envMapIntensity;
      ambient += coatEnv * coatSpec * 0.3;
    }
    
    vec3 finalColor = ambient + Lo;
    
    finalColor = finalColor / (finalColor + vec3(1.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
