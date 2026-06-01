import "./style.css";
import * as THREE from "three";
import { AudioAnalyser } from "./audio/Analyser";
import { ParticleField } from "./particles/ParticleField";

const app = document.getElementById("app")!;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a1a, 1);

const canvasContainer = document.createElement("div");
canvasContainer.id = "canvas-container";
canvasContainer.appendChild(renderer.domElement);
document.body.appendChild(canvasContainer);

const particleField = new ParticleField();
scene.add(particleField.getObject());

const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
scene.add(ambientLight);

const audioAnalyser = new AudioAnalyser();

let isPlaying = false;
let clock = new THREE.Clock();

function createUI(): void {
  app.innerHTML = `
    <div id="ui-overlay">
      <div id="title-section">
        <h1>Audio Sculpture</h1>
        <p>Import an MP3 to transform sound into 3D particles</p>
      </div>
      <div id="controls">
        <label for="file-input" class="file-label">
          <span>Choose MP3</span>
          <input type="file" id="file-input" accept="audio/mp3,audio/*" />
        </label>
        <span id="file-name">No file selected</span>
        <button id="play-btn" disabled>Play</button>
        <button id="stop-btn" disabled>Stop</button>
      </div>
      <div id="info-panel">
        <div class="meter"><span class="label">Bass</span><div class="bar"><div id="bass-bar" class="fill"></div></div></div>
        <div class="meter"><span class="label">Mid</span><div class="bar"><div id="mid-bar" class="fill"></div></div></div>
        <div class="meter"><span class="label">Treble</span><div class="bar"><div id="treble-bar" class="fill"></div></div></div>
      </div>
    </div>
  `;

  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  const fileName = document.getElementById("file-name")!;
  const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
  const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileName.textContent = file.name;
    playBtn.disabled = false;
    await audioAnalyser.loadFile(file);
  });

  playBtn.addEventListener("click", () => {
    if (!isPlaying) {
      audioAnalyser.play();
      isPlaying = true;
      playBtn.disabled = true;
      stopBtn.disabled = false;
    }
  });

  stopBtn.addEventListener("click", () => {
    audioAnalyser.stop();
    isPlaying = false;
    playBtn.disabled = false;
    stopBtn.disabled = true;
  });
}

function updateMeters(audioData: { bass: number; mid: number; treble: number }): void {
  const bassBar = document.getElementById("bass-bar");
  const midBar = document.getElementById("mid-bar");
  const trebleBar = document.getElementById("treble-bar");
  if (bassBar) bassBar.style.width = `${audioData.bass * 100}%`;
  if (midBar) midBar.style.width = `${audioData.mid * 100}%`;
  if (trebleBar) trebleBar.style.width = `${audioData.treble * 100}%`;
}

function animate(): void {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  const audioData = audioAnalyser.getData();
  if (audioAnalyser.isPlaying) {
    updateMeters(audioData);
  }

  particleField.update(audioData, time);

  camera.position.x = Math.sin(time * 0.15) * 3;
  camera.position.y = 5 + Math.sin(time * 0.1) * 2;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

createUI();
animate();
