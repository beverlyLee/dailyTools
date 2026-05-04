import * as faceDetect from '../src/js/index.ts';

let isInitialized = false;
let isCameraActive = false;
let animationFrameId = null;
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const initBtn = document.getElementById('initBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const imageInput = document.getElementById('imageInput');

const minFaceSizeSlider = document.getElementById('minFaceSize');
const scaleFactorSlider = document.getElementById('scaleFactor');
const scoreThresholdSlider = document.getElementById('scoreThreshold');
const landmarkTypeSelect = document.getElementById('landmarkType');
const useWorkerSelect = document.getElementById('useWorker');

const minFaceSizeValue = document.getElementById('minFaceSizeValue');
const scaleFactorValue = document.getElementById('scaleFactorValue');
const scoreThresholdValue = document.getElementById('scoreThresholdValue');

const fpsValue = document.getElementById('fpsValue');
const faceCountValue = document.getElementById('faceCountValue');
const inferenceTimeValue = document.getElementById('inferenceTimeValue');

const logContainer = document.getElementById('logContainer');

function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = 'log-line';
  
  const classes = {
    info: 'log-info',
    success: 'log-success',
    error: 'log-error',
    warning: 'log-warning'
  };
  
  line.innerHTML = `<span class="log-time">[${time}]</span><span class="${classes[type] || ''}">${message}</span>`;
  
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function getOptions() {
  const landmarkType = parseInt(landmarkTypeSelect.value, 10);
  return {
    minFaceSize: parseInt(minFaceSizeSlider.value, 10),
    scaleFactor: parseFloat(scaleFactorSlider.value) / 100,
    scoreThreshold: parseFloat(scoreThresholdSlider.value) / 100,
    enableLandmarks: landmarkType === 0 ? null : landmarkType
  };
}

function updateSliderValues() {
  minFaceSizeValue.textContent = minFaceSizeSlider.value;
  scaleFactorValue.textContent = (parseFloat(scaleFactorSlider.value) / 100).toFixed(2);
  scoreThresholdValue.textContent = (parseFloat(scoreThresholdSlider.value) / 100).toFixed(2);
}

async function initDetector() {
  if (isInitialized) {
    log('检测器已经初始化', 'warning');
    return;
  }

  const useWorker = useWorkerSelect.value === 'true';
  const options = getOptions();

  try {
    log(`开始初始化检测器 (Worker: ${useWorker ? '是' : '否'})...`, 'info');
    
    if (useWorker) {
      log('使用 Web Worker 模式', 'info');
      const workerDetector = await faceDetect.createWorkerDetector(options);
      window.faceDetector = workerDetector;
    } else {
      log('使用主线程模式', 'info');
      await faceDetect.init(null, options);
      window.faceDetector = null;
    }
    
    isInitialized = true;
    initBtn.disabled = true;
    initBtn.textContent = '已初始化';
    log('检测器初始化成功!', 'success');
  } catch (error) {
    log(`初始化失败: ${error.message}`, 'error');
    console.error(error);
  }
}

async function startCamera() {
  if (!isInitialized) {
    log('请先初始化检测器', 'warning');
    return;
  }

  try {
    log('请求摄像头权限...', 'info');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    isCameraActive = true;
    startCameraBtn.disabled = true;
    stopCameraBtn.disabled = false;

    log(`摄像头已启动: ${videoWidth}x${videoHeight}`, 'success');
    startDetectionLoop();
  } catch (error) {
    log(`无法访问摄像头: ${error.message}`, 'error');
    console.error(error);
  }
}

function stopCamera() {
  if (!isCameraActive) return;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (video.srcObject) {
    const stream = video.srcObject;
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  isCameraActive = false;
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;

  log('摄像头已停止', 'info');
}

async function processFrame() {
  if (!isInitialized) return [];

  const useWorker = useWorkerSelect.value === 'true';
  
  try {
    if (useWorker && window.faceDetector) {
      return await window.faceDetector.detect(video, getOptions());
    } else {
      return await faceDetect.detect(video, getOptions());
    }
  } catch (error) {
    log(`检测错误: ${error.message}`, 'error');
    return [];
  }
}

async function detectAndDraw() {
  if (!isCameraActive) return;

  const startTime = performance.now();

  const results = await processFrame();

  const inferenceTime = performance.now() - startTime;
  inferenceTimeValue.textContent = inferenceTime.toFixed(1);
  faceCountValue.textContent = results.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  faceDetect.drawDetections(ctx, results, {
    boxColor: '#00ff00',
    landmarkColor: '#ff0000',
    showConfidence: true
  });

  frameCount++;
  const now = performance.now();
  if (now - lastFrameTime >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
    fpsValue.textContent = fps;
    frameCount = 0;
    lastFrameTime = now;
  }

  animationFrameId = requestAnimationFrame(detectAndDraw);
}

function startDetectionLoop() {
  lastFrameTime = performance.now();
  frameCount = 0;
  detectAndDraw();
}

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!isInitialized) {
    log('请先初始化检测器', 'warning');
    return;
  }

  stopCamera();

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx.drawImage(img, 0, 0);

        log(`开始检测图片: ${img.naturalWidth}x${img.naturalHeight}`, 'info');
        
        const useWorker = useWorkerSelect.value === 'true';
        const startTime = performance.now();
        
        let results;
        if (useWorker && window.faceDetector) {
          results = await window.faceDetector.detect(img, getOptions());
        } else {
          results = await faceDetect.detect(img, getOptions());
        }

        const inferenceTime = performance.now() - startTime;
        inferenceTimeValue.textContent = inferenceTime.toFixed(1);
        faceCountValue.textContent = results.length;

        faceDetect.drawDetections(ctx, results, {
          boxColor: '#00ff00',
          landmarkColor: '#ff0000',
          showConfidence: true
        });

        log(`检测完成: 找到 ${results.length} 个人脸, 耗时 ${inferenceTime.toFixed(1)}ms`, 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } catch (error) {
    log(`图片处理错误: ${error.message}`, 'error');
  }

  imageInput.value = '';
}

initBtn.addEventListener('click', initDetector);
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
imageInput.addEventListener('change', handleImageUpload);

minFaceSizeSlider.addEventListener('input', updateSliderValues);
scaleFactorSlider.addEventListener('input', updateSliderValues);
scoreThresholdSlider.addEventListener('input', updateSliderValues);

function handleOptionsChange() {
  if (isInitialized) {
    const options = getOptions();
    
    const useWorker = useWorkerSelect.value === 'true';
    if (useWorker && window.faceDetector) {
      window.faceDetector.setOptions(options);
    } else {
      faceDetect.setOptions(options);
    }
    
    log(`检测参数已更新: minFaceSize=${options.minFaceSize}, scaleFactor=${options.scaleFactor}, threshold=${options.scoreThreshold}`, 'info');
  }
}

minFaceSizeSlider.addEventListener('change', handleOptionsChange);
scaleFactorSlider.addEventListener('change', handleOptionsChange);
scoreThresholdSlider.addEventListener('change', handleOptionsChange);
landmarkTypeSelect.addEventListener('change', handleOptionsChange);

updateSliderValues();
log('Edge Face Detection 示例已加载。点击"初始化检测器"开始使用。', 'info');
