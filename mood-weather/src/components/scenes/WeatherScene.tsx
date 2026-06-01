"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type WeatherType = "sunny" | "rainy" | "snowy";

interface WeatherConfig {
  bgColor: number;
  ambientIntensity: number;
  dirIntensity: number;
  groundColor: number;
  cloudColor: number;
  cloudOpacity: number;
  sunVisible: boolean;
  particleCount: number;
  particleSpeed: number;
  particleType: "rain" | "snow" | "none";
}

const WEATHER_CONFIGS: Record<WeatherType, WeatherConfig> = {
  sunny: {
    bgColor: 0x87ceeb,
    ambientIntensity: 0.6,
    dirIntensity: 1.2,
    groundColor: 0x7cfc00,
    cloudColor: 0xffffff,
    cloudOpacity: 0.9,
    sunVisible: true,
    particleCount: 0,
    particleSpeed: 0,
    particleType: "none",
  },
  rainy: {
    bgColor: 0x1a1a2e,
    ambientIntensity: 0.3,
    dirIntensity: 0.2,
    groundColor: 0x1a1a1a,
    cloudColor: 0x2d2d2d,
    cloudOpacity: 0.95,
    sunVisible: false,
    particleCount: 15000,
    particleSpeed: 1.2,
    particleType: "rain",
  },
  snowy: {
    bgColor: 0xc9d6e5,
    ambientIntensity: 0.7,
    dirIntensity: 0.5,
    groundColor: 0xf5f5f5,
    cloudColor: 0xb0bec5,
    cloudOpacity: 0.9,
    sunVisible: false,
    particleCount: 8000,
    particleSpeed: 0.08,
    particleType: "snow",
  },
};

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createSnowflakeTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);

  const cx = 64;
  const cy = 64;
  const outerR = 52;
  const innerR = 20;

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const branchAngle1 = angle - Math.PI / 6;
    const branchAngle2 = angle + Math.PI / 6;
    const branchLen = (outerR - innerR) * 0.5;
    const midX = cx + Math.cos(angle) * (innerR + (outerR - innerR) * 0.4);
    const midY = cy + Math.sin(angle) * (innerR + (outerR - innerR) * 0.4);

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + Math.cos(branchAngle1) * branchLen, midY + Math.sin(branchAngle1) * branchLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(midX + Math.cos(branchAngle2) * branchLen, midY + Math.sin(branchAngle2) * branchLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x2, y2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createSplashTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);

  const cx = 32;
  const cy = 32;

  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
  grad.addColorStop(0, "rgba(200, 220, 255, 0.9)");
  grad.addColorStop(0.4, "rgba(180, 200, 240, 0.6)");
  grad.addColorStop(0.7, "rgba(150, 180, 230, 0.3)");
  grad.addColorStop(1, "rgba(100, 150, 220, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(220, 235, 255, 0.8)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r1 = 8 + Math.random() * 6;
    const r2 = 18 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface WeatherSceneProps {
  weatherType: WeatherType;
}

export default function WeatherScene({ weatherType }: WeatherSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const initialConfig = WEATHER_CONFIGS[weatherType];
    scene.background = new THREE.Color(initialConfig.bgColor);

    const ambientLight = new THREE.AmbientLight(0xffffff, initialConfig.ambientIntensity);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, initialConfig.dirIntensity);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const sunGroup = new THREE.Group();
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    sun.position.set(15, 15, -20);
    sunGroup.add(sun);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(4, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 })
    );
    sunGlow.position.copy(sun.position);
    sunGroup.add(sunGlow);
    sunGroup.visible = initialConfig.sunVisible;
    scene.add(sunGroup);

    const groundMaterial = new THREE.MeshLambertMaterial({ color: initialConfig.groundColor });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    scene.add(ground);

    const cloudMaterial = new THREE.MeshBasicMaterial({
      color: initialConfig.cloudColor,
      transparent: true,
      opacity: initialConfig.cloudOpacity,
    });
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < 15; i++) {
      const c = new THREE.Mesh(
        new THREE.SphereGeometry(3 + Math.random() * 2, 16, 16),
        cloudMaterial
      );
      c.position.set(-25 + Math.random() * 50, 10 + Math.random() * 5, -20 - Math.random() * 15);
      c.scale.set(2 + Math.random() * 2, 0.5 + Math.random() * 0.3, 1.5 + Math.random());
      cloudGroup.add(c);
    }
    scene.add(cloudGroup);

    const MAX = 15000;
    const particlePos = new Float32Array(MAX * 3);
    const particleVel = new Float32Array(MAX);
    const particleDrift = new Float32Array(MAX);
    const particleRot = new Float32Array(MAX);
    const particleRotSpeed = new Float32Array(MAX);
    const particleSize = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 80;
      particlePos[i * 3 + 1] = Math.random() * 50;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      particleVel[i] = 0.3 + Math.random() * 0.5;
      particleDrift[i] = Math.random() * Math.PI * 2;
      particleRot[i] = Math.random() * Math.PI * 2;
      particleRotSpeed[i] = (Math.random() - 0.5) * 0.05;
      particleSize[i] = 0.5 + Math.random() * 1;
    }

    const rainLinePos = new Float32Array(MAX * 6);
    for (let i = 0; i < MAX; i++) {
      const idx = i * 6;
      const yTop = particlePos[i * 3 + 1];
      rainLinePos[idx] = particlePos[i * 3];
      rainLinePos[idx + 1] = yTop;
      rainLinePos[idx + 2] = particlePos[i * 3 + 2];
      rainLinePos[idx + 3] = particlePos[i * 3];
      rainLinePos[idx + 4] = yTop - 1.2;
      rainLinePos[idx + 5] = particlePos[i * 3 + 2];
    }
    const rainLineGeom = new THREE.BufferGeometry();
    rainLineGeom.setAttribute("position", new THREE.BufferAttribute(rainLinePos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x88aadd, transparent: true, opacity: 0 });
    const rainLines = new THREE.LineSegments(rainLineGeom, rainMat);
    rainLines.visible = false;
    scene.add(rainLines);

    const snowflakeTex = createSnowflakeTexture();
    const snowGeom = new THREE.BufferGeometry();
    const snowPosArr = new Float32Array(particlePos);
    const snowSizeArr = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) {
      snowSizeArr[i] = particleSize[i];
    }
    snowGeom.setAttribute("position", new THREE.BufferAttribute(snowPosArr, 3));
    snowGeom.setAttribute("size", new THREE.BufferAttribute(snowSizeArr, 1));
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      map: snowflakeTex,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      alphaTest: 0.3,
      depthWrite: false,
    });
    const snowPoints = new THREE.Points(snowGeom, snowMat);
    snowPoints.visible = false;
    scene.add(snowPoints);

    const MAX_SPLASHES = 200;
    const splashTex = createSplashTexture();
    const splashPos = new Float32Array(MAX_SPLASHES * 3);
    const splashLife = new Float32Array(MAX_SPLASHES);
    const splashSize = new Float32Array(MAX_SPLASHES);
    const splashGeom = new THREE.BufferGeometry();
    splashGeom.setAttribute("position", new THREE.BufferAttribute(splashPos, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xbbddee,
      size: 2.5,
      map: splashTex,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const splashPoints = new THREE.Points(splashGeom, splashMat);
    splashPoints.visible = false;
    scene.add(splashPoints);

    let splashPool: number[] = [];
    for (let i = 0; i < MAX_SPLASHES; i++) {
      splashLife[i] = 0;
      splashPool.push(i);
    }

    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);

    let currentWeather = weatherType;
    let targetWeather = weatherType;
    let transitioning = false;
    let progress = 1;
    const TRANSITION_SPEED = 0.025;
    let time = 0;
    let rafId: number;
    let alive = true;

    const fromVals = {
      bg: new THREE.Color(WEATHER_CONFIGS[currentWeather].bgColor),
      ambient: WEATHER_CONFIGS[currentWeather].ambientIntensity,
      dir: WEATHER_CONFIGS[currentWeather].dirIntensity,
      ground: new THREE.Color(WEATHER_CONFIGS[currentWeather].groundColor),
      cloud: new THREE.Color(WEATHER_CONFIGS[currentWeather].cloudColor),
      cloudOp: WEATHER_CONFIGS[currentWeather].cloudOpacity,
      sunVis: WEATHER_CONFIGS[currentWeather].sunVisible,
      pType: WEATHER_CONFIGS[currentWeather].particleType,
      pCount: WEATHER_CONFIGS[currentWeather].particleCount,
      pSpeed: WEATHER_CONFIGS[currentWeather].particleSpeed,
    };

    const toVals = { ...fromVals };

    const bgColor = scene.background as THREE.Color;

    function startTransition(newWeather: WeatherType) {
      if (!alive) return;
      if (newWeather === targetWeather) return;

      targetWeather = newWeather;
      const tc = WEATHER_CONFIGS[newWeather];

      fromVals.bg = bgColor.clone();
      fromVals.ambient = ambientLight.intensity;
      fromVals.dir = dirLight.intensity;
      fromVals.ground = groundMaterial.color.clone();
      fromVals.cloud = cloudMaterial.color.clone();
      fromVals.cloudOp = cloudMaterial.opacity;
      fromVals.sunVis = sunGroup.visible;
      fromVals.pType = rainMat.opacity > 0.05 ? "rain" : snowMat.opacity > 0.05 ? "snow" : "none";
      fromVals.pCount =
        fromVals.pType === "rain" ? WEATHER_CONFIGS[currentWeather].particleCount :
        fromVals.pType === "snow" ? WEATHER_CONFIGS[currentWeather].particleCount : 0;
      fromVals.pSpeed =
        fromVals.pType === "rain" ? WEATHER_CONFIGS[currentWeather].particleSpeed :
        fromVals.pType === "snow" ? WEATHER_CONFIGS[currentWeather].particleSpeed : 0;

      toVals.bg = new THREE.Color(tc.bgColor);
      toVals.ambient = tc.ambientIntensity;
      toVals.dir = tc.dirIntensity;
      toVals.ground = new THREE.Color(tc.groundColor);
      toVals.cloud = new THREE.Color(tc.cloudColor);
      toVals.cloudOp = tc.cloudOpacity;
      toVals.sunVis = tc.sunVisible;
      toVals.pType = tc.particleType;
      toVals.pCount = tc.particleCount;
      toVals.pSpeed = tc.particleSpeed;

      transitioning = true;
      progress = 0;
    }

    (window as unknown as { __setWeather?: (w: WeatherType) => void }).__setWeather = startTransition;

    function triggerSplash(x: number, z: number) {
      if (splashPool.length === 0) return;
      const idx = splashPool.shift()!;
      splashPos[idx * 3] = x;
      splashPos[idx * 3 + 1] = -4.95;
      splashPos[idx * 3 + 2] = z;
      splashLife[idx] = 1;
      splashSize[idx] = 0.5 + Math.random() * 0.8;
      splashGeom.attributes.position.needsUpdate = true;
    }

    function animate() {
      if (!alive) return;
      rafId = requestAnimationFrame(animate);
      time += 0.016;

      if (transitioning) {
        progress = Math.min(progress + TRANSITION_SPEED, 1);
        const t = easeInOut(progress);

        bgColor.r = fromVals.bg.r + (toVals.bg.r - fromVals.bg.r) * t;
        bgColor.g = fromVals.bg.g + (toVals.bg.g - fromVals.bg.g) * t;
        bgColor.b = fromVals.bg.b + (toVals.bg.b - fromVals.bg.b) * t;

        ambientLight.intensity = fromVals.ambient + (toVals.ambient - fromVals.ambient) * t;
        dirLight.intensity = fromVals.dir + (toVals.dir - fromVals.dir) * t;

        groundMaterial.color.r = fromVals.ground.r + (toVals.ground.r - fromVals.ground.r) * t;
        groundMaterial.color.g = fromVals.ground.g + (toVals.ground.g - fromVals.ground.g) * t;
        groundMaterial.color.b = fromVals.ground.b + (toVals.ground.b - fromVals.ground.b) * t;

        cloudMaterial.color.r = fromVals.cloud.r + (toVals.cloud.r - fromVals.cloud.r) * t;
        cloudMaterial.color.g = fromVals.cloud.g + (toVals.cloud.g - fromVals.cloud.g) * t;
        cloudMaterial.color.b = fromVals.cloud.b + (toVals.cloud.b - fromVals.cloud.b) * t;
        cloudMaterial.opacity = fromVals.cloudOp + (toVals.cloudOp - fromVals.cloudOp) * t;

        const fromRainOp = fromVals.pType === "rain" ? 0.8 : 0;
        const toRainOp = toVals.pType === "rain" ? 0.8 : 0;
        rainMat.opacity = fromRainOp + (toRainOp - fromRainOp) * t;

        const fromSnowOp = fromVals.pType === "snow" ? 0.95 : 0;
        const toSnowOp = toVals.pType === "snow" ? 0.95 : 0;
        snowMat.opacity = fromSnowOp + (toSnowOp - fromSnowOp) * t;

        if (t > 0.15) {
          if (toVals.pType === "rain") rainLines.visible = true;
          if (toVals.pType === "snow") snowPoints.visible = true;
          if (toVals.pType === "rain") splashPoints.visible = true;
        }
        if (t > 0.5) {
          sunGroup.visible = toVals.sunVis;
        }
        if (t > 0.85) {
          if (fromVals.pType === "rain" && toVals.pType !== "rain") rainLines.visible = false;
          if (fromVals.pType === "snow" && toVals.pType !== "snow") snowPoints.visible = false;
          if (fromVals.pType === "rain" && toVals.pType !== "rain") splashPoints.visible = false;
        }

        if (progress >= 1) {
          transitioning = false;
          currentWeather = targetWeather;

          const finalConfig = WEATHER_CONFIGS[currentWeather];
          bgColor.setHex(finalConfig.bgColor);
          ambientLight.intensity = finalConfig.ambientIntensity;
          dirLight.intensity = finalConfig.dirIntensity;
          groundMaterial.color.setHex(finalConfig.groundColor);
          cloudMaterial.color.setHex(finalConfig.cloudColor);
          cloudMaterial.opacity = finalConfig.cloudOpacity;
          sunGroup.visible = finalConfig.sunVisible;

          rainLines.visible = finalConfig.particleType === "rain";
          snowPoints.visible = finalConfig.particleType === "snow";
          splashPoints.visible = finalConfig.particleType === "rain";
          rainMat.opacity = finalConfig.particleType === "rain" ? 0.8 : 0;
          snowMat.opacity = finalConfig.particleType === "snow" ? 0.95 : 0;

          fromVals.bg.setHex(finalConfig.bgColor);
          fromVals.ambient = finalConfig.ambientIntensity;
          fromVals.dir = finalConfig.dirIntensity;
          fromVals.ground.setHex(finalConfig.groundColor);
          fromVals.cloud.setHex(finalConfig.cloudColor);
          fromVals.cloudOp = finalConfig.cloudOpacity;
          fromVals.sunVis = finalConfig.sunVisible;
          fromVals.pType = finalConfig.particleType;
          fromVals.pCount = finalConfig.particleCount;
          fromVals.pSpeed = finalConfig.particleSpeed;
        }
      }

      const activeConfig = WEATHER_CONFIGS[currentWeather];
      const displayType =
        transitioning && progress > 0.5 ? toVals.pType : activeConfig.particleType;
      const blendT = transitioning ? easeInOut(progress) : 1;
      const displayCount =
        displayType === "rain"
          ? fromVals.pCount * (1 - blendT) + toVals.pCount * blendT
          : displayType === "snow"
          ? fromVals.pCount * (1 - blendT) + toVals.pCount * blendT
          : 0;
      const displaySpeed =
        fromVals.pSpeed * (1 - blendT) + toVals.pSpeed * blendT;

      if (displayType === "rain") {
        const arr = rainLineGeom.attributes.position.array as Float32Array;
        const n = Math.floor(Math.max(0, displayCount));
        for (let i = 0; i < n; i++) {
          const idx = i * 6;
          const yT = particlePos[i * 3 + 1];
          arr[idx] = particlePos[i * 3];
          arr[idx + 1] = yT;
          arr[idx + 2] = particlePos[i * 3 + 2];
          arr[idx + 3] = particlePos[i * 3];
          arr[idx + 4] = yT - 1.2 - particleVel[i] * 1.5;
          arr[idx + 5] = particlePos[i * 3 + 2];
          particlePos[i * 3 + 1] -= displaySpeed + particleVel[i] * 2;
          if (particlePos[i * 3 + 1] < -4.95) {
            triggerSplash(particlePos[i * 3], particlePos[i * 3 + 2]);
            particlePos[i * 3 + 1] = 50;
            particlePos[i * 3] = (Math.random() - 0.5) * 80;
            particlePos[i * 3 + 2] = (Math.random() - 0.5) * 80;
          }
        }
        rainLineGeom.attributes.position.needsUpdate = true;
        rainLineGeom.setDrawRange(0, Math.max(0, n * 2));
      }

      if (displayType === "snow") {
        const arr = snowGeom.attributes.position.array as Float32Array;
        const n = Math.floor(Math.max(0, displayCount));
        for (let i = 0; i < n; i++) {
          arr[i * 3] = particlePos[i * 3];
          arr[i * 3 + 1] = particlePos[i * 3 + 1];
          arr[i * 3 + 2] = particlePos[i * 3 + 2];
          particlePos[i * 3 + 1] -= displaySpeed + particleVel[i] * 0.15;
          particlePos[i * 3] += Math.sin(time * 0.5 + particleDrift[i]) * 0.03;
          particleRot[i] += particleRotSpeed[i];
          particlePos[i * 3 + 1] = arr[i * 3 + 1];
          particlePos[i * 3] = arr[i * 3];
          if (particlePos[i * 3 + 1] < -5) {
            particlePos[i * 3 + 1] = 50;
            particlePos[i * 3] = (Math.random() - 0.5) * 80;
            particlePos[i * 3 + 2] = (Math.random() - 0.5) * 80;
          }
        }
        snowGeom.attributes.position.needsUpdate = true;
        snowGeom.setDrawRange(0, Math.max(0, n));
      }

      for (let i = 0; i < MAX_SPLASHES; i++) {
        if (splashLife[i] > 0) {
          splashLife[i] -= 0.035;
          if (splashLife[i] <= 0) {
            splashLife[i] = 0;
            splashPos[i * 3 + 1] = -100;
            splashPool.push(i);
          }
        }
      }
      splashGeom.attributes.position.needsUpdate = true;
      const splashOp = displayType === "rain" ? 0.7 : 0;
      splashMat.opacity = splashOp;

      cloudGroup.children.forEach((c, i) => {
        c.position.x += 0.01 + i * 0.001;
        if (c.position.x > 30) c.position.x = -30;
      });

      if (sunGroup.visible) {
        sunGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
      }

      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!alive || !container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      snowflakeTex.dispose();
      splashTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      delete (window as unknown as { __setWeather?: (w: WeatherType) => void }).__setWeather;
    };
  }, []);

  useEffect(() => {
    const fn = (window as unknown as { __setWeather?: (w: WeatherType) => void }).__setWeather;
    if (fn) fn(weatherType);
  }, [weatherType]);

  return <div ref={containerRef} className="w-full h-full" />;
}
