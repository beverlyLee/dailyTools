export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

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

  #define MATERIAL_WOOD 0
  #define MATERIAL_STONE 1
  #define MATERIAL_FABRIC 2
  #define MATERIAL_METAL 3
  #define MATERIAL_CONCRETE 4
  #define MATERIAL_CUSTOM 5

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  float woodGrain(vec2 uv) {
    float grain = 0.0;
    float y = uv.y * 8.0;
    grain += sin(y * 2.0 + fbm(uv * 3.0) * 0.5) * 0.5 + 0.5;
    grain += fbm(vec2(uv.x * 20.0, uv.y * 2.0)) * 0.3;
    float knots = smoothstep(0.6, 0.8, fbm(uv * 4.0));
    grain -= knots * 0.2;
    return clamp(grain, 0.0, 1.0);
  }

  float marbleVeins(vec2 uv) {
    float veins = 0.0;
    vec2 p = uv * 3.0;
    float noiseVal = fbm(p);
    veins = sin(p.x + noiseVal * 4.0) * 0.5 + 0.5;
    veins = pow(veins, 3.0);
    return veins;
  }

  float carpetFiber(vec2 uv) {
    float fiber = 0.0;
    fiber += fbm(uv * 50.0) * 0.4;
    fiber += fbm(uv * 100.0) * 0.3;
    fiber += fbm(uv * 200.0) * 0.2;
    float lines = sin(uv.y * 200.0 + fbm(uv * 10.0) * 5.0) * 0.5 + 0.5;
    fiber += lines * 0.1;
    return clamp(fiber, 0.0, 1.0);
  }

  float brushedMetal(vec2 uv) {
    float brush = 0.0;
    brush += fbm(vec2(uv.x * 20.0, uv.y * 0.5)) * 0.6;
    brush += fbm(vec2(uv.x * 100.0, uv.y * 2.0)) * 0.3;
    return brush;
  }

  float concreteTexture(vec2 uv) {
    float concrete = 0.0;
    concrete += fbm(uv * 10.0) * 0.5;
    concrete += fbm(uv * 30.0) * 0.3;
    concrete += fbm(uv * 100.0) * 0.2;
    float spots = smoothstep(0.7, 0.9, fbm(uv * 50.0));
    concrete -= spots * 0.1;
    return clamp(concrete, 0.0, 1.0);
  }

  vec3 getMaterialColor(vec2 uv) {
    vec3 color = baseColor;
    
    if (materialType == MATERIAL_WOOD) {
      float grain = woodGrain(uv);
      vec3 darkWood = baseColor * 0.7;
      vec3 lightWood = baseColor * 1.2;
      color = mix(darkWood, lightWood, grain);
      float noiseDetail = fbm(uv * 50.0) * 0.1;
      color += noiseDetail;
    }
    else if (materialType == MATERIAL_STONE) {
      float veins = marbleVeins(uv);
      vec3 veinColor = baseColor * 0.7;
      color = mix(baseColor, veinColor, veins * 0.5);
      float detail = fbm(uv * 30.0) * 0.05;
      color += detail;
    }
    else if (materialType == MATERIAL_FABRIC) {
      float fiber = carpetFiber(uv);
      vec3 darkFiber = baseColor * 0.85;
      vec3 lightFiber = baseColor * 1.1;
      color = mix(darkFiber, lightFiber, fiber);
      float weave = sin(uv.x * 100.0) * sin(uv.y * 100.0) * 0.05;
      color += weave;
    }
    else if (materialType == MATERIAL_METAL) {
      float brush = brushedMetal(uv);
      color = baseColor * (0.8 + brush * 0.4);
      float scratches = fbm(uv * 500.0) * 0.1;
      color += scratches;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      float concrete = concreteTexture(uv);
      color = baseColor * (0.9 + concrete * 0.2);
    }
    
    return color;
  }

  float getMaterialRoughness(vec2 uv) {
    float rough = roughness;
    
    if (materialType == MATERIAL_WOOD) {
      float grain = woodGrain(uv);
      rough += grain * 0.05;
    }
    else if (materialType == MATERIAL_FABRIC) {
      float fiber = carpetFiber(uv);
      rough = 0.85 + fiber * 0.15;
    }
    else if (materialType == MATERIAL_METAL) {
      float brush = brushedMetal(uv);
      rough += brush * 0.1;
    }
    else if (materialType == MATERIAL_CONCRETE) {
      rough += fbm(uv * 20.0) * 0.1;
    }
    
    return clamp(rough, 0.0, 1.0);
  }

  vec3 computePBR(vec3 albedo, vec3 normal, float rough, float metal, vec3 viewDir, vec3 lightDir, vec3 lightCol) {
    vec3 F0 = mix(vec3(0.04), albedo, metal);
    
    vec3 H = normalize(viewDir + lightDir);
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    float NdotH = max(dot(normal, H), 0.0);
    float VdotH = max(dot(viewDir, H), 0.0);
    
    float alpha = rough * rough;
    float alpha2 = alpha * alpha;
    
    float denom = NdotH * NdotH * (alpha2 - 1.0) + 1.0;
    float D = alpha2 / (3.14159265 * denom * denom);
    
    float k = (rough + 1.0) * (rough + 1.0) / 8.0;
    float G1V = NdotV / (NdotV * (1.0 - k) + k);
    float G1L = NdotL / (NdotL * (1.0 - k) + k);
    float G = G1V * G1L;
    
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
    
    vec3 specular = D * G * F / max(4.0 * NdotV * NdotL, 0.001);
    
    vec3 kd = (1.0 - F) * (1.0 - metal);
    vec3 diffuse = kd * albedo / 3.14159265;
    
    return (diffuse + specular) * lightCol * NdotL * lightIntensity;
  }

  void main() {
    vec2 uv = vUv;
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    vec3 albedo = getMaterialColor(uv);
    float rough = getMaterialRoughness(uv);
    float metal = metalness;
    
    vec3 lightDir = normalize(lightPosition - vWorldPosition);
    
    vec3 ambient = ambientColor * ambientIntensity * albedo;
    
    vec3 diffuseSpecular = computePBR(albedo, normal, rough, metal, viewDir, lightDir, lightColor);
    
    vec3 finalColor = ambient + diffuseSpecular;
    
    if (clearcoat > 0.0) {
      vec3 coatNormal = normal;
      float coatRough = clearcoatRoughness;
      float NdotV = max(dot(coatNormal, viewDir), 0.0);
      float fresnel = pow(1.0 - NdotV, 5.0);
      float coatSpecular = mix(0.04, 1.0, fresnel) * clearcoat * envMapIntensity;
      finalColor += vec3(coatSpecular) * 0.3;
    }
    
    if (materialType == MATERIAL_METAL) {
      float reflection = reflectivity * envMapIntensity;
      vec3 reflectDir = reflect(-viewDir, normal);
      float skyGradient = smoothstep(-0.2, 0.8, reflectDir.y);
      vec3 envColor = mix(vec3(0.5, 0.55, 0.6), vec3(0.9, 0.95, 1.0), skyGradient);
      finalColor = mix(finalColor, finalColor + envColor * reflection * 0.5, metal);
    }
    
    if (materialType == MATERIAL_STONE) {
      float NdotV = max(dot(normal, viewDir), 0.0);
      float fresnel = pow(1.0 - NdotV, 3.0);
      vec3 reflectDir = reflect(-viewDir, normal);
      float skyGradient = smoothstep(-0.2, 0.8, reflectDir.y);
      vec3 envColor = mix(vec3(0.5, 0.55, 0.6), vec3(0.9, 0.95, 1.0), skyGradient);
      finalColor += envColor * fresnel * reflectivity * envMapIntensity * 0.3;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
