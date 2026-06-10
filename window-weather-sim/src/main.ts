import { WeatherScene } from './WeatherScene';
import type { WindowType } from './types';

function initApp(): void {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  const scene = new WeatherScene(canvas);
  scene.start();

  const windowTypeSelect = document.getElementById('windowTypeSelect') as HTMLSelectElement;
  const rainSlider = document.getElementById('rainSlider') as HTMLInputElement;
  const windSlider = document.getElementById('windSlider') as HTMLInputElement;
  const rainValue = document.getElementById('rainValue') as HTMLSpanElement;
  const windValue = document.getElementById('windValue') as HTMLSpanElement;
  const drainToggle = document.getElementById('drainToggle') as HTMLInputElement;
  const curtainToggle = document.getElementById('curtainToggle') as HTMLInputElement;
  const stormBtn = document.getElementById('stormBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  const windowTypeEl = document.getElementById('windowType') as HTMLSpanElement;
  const rainIntensityEl = document.getElementById('rainIntensity') as HTMLSpanElement;
  const windSpeedEl = document.getElementById('windSpeed') as HTMLSpanElement;
  const waterTightnessEl = document.getElementById('waterTightness') as HTMLSpanElement;
  const airTightnessEl = document.getElementById('airTightness') as HTMLSpanElement;
  const waterAmountEl = document.getElementById('waterAmount') as HTMLSpanElement;
  const waterMeterEl = document.getElementById('waterMeter') as HTMLDivElement;

  function updateRainLabel(value: number): string {
    if (value < 10) return '无雨';
    if (value < 30) return '小雨';
    if (value < 50) return '中雨';
    if (value < 70) return '大雨';
    if (value < 90) return '暴雨';
    return '大暴雨';
  }

  function updateWindLabel(value: number): string {
    if (value < 10) return '0级';
    if (value < 20) return '2级';
    if (value < 35) return '3级';
    if (value < 50) return '4级';
    if (value < 65) return '5级';
    if (value < 80) return '6级';
    if (value < 90) return '7级';
    return '8级以上';
  }

  function updateStatusClass(element: HTMLElement, status: 'good' | 'warning' | 'danger'): void {
    element.classList.remove('good', 'warning', 'danger');
    element.classList.add(status);
  }

  function updateStatusLabels(): void {
    const waterStatus = scene.getWaterTightnessStatus();
    const airStatus = scene.getAirTightnessStatus();
    const waterAmount = scene.getWaterAmount();
    const maxWater = scene.getMaxWaterAmount();

    const statusLabels: Record<string, string> = {
      good: '良好',
      warning: '警告',
      danger: '严重'
    };

    waterTightnessEl.textContent = statusLabels[waterStatus];
    updateStatusClass(waterTightnessEl, waterStatus);

    airTightnessEl.textContent = statusLabels[airStatus];
    updateStatusClass(airTightnessEl, airStatus);

    waterAmountEl.textContent = `${waterAmount.toFixed(1)} ml`;
    
    const waterPercent = Math.min(100, (waterAmount / maxWater) * 100);
    waterMeterEl.style.width = `${waterPercent}%`;

    requestAnimationFrame(updateStatusLabels);
  }

  windowTypeSelect.addEventListener('change', () => {
    const type = windowTypeSelect.value as WindowType;
    scene.setWindowType(type);
    windowTypeEl.textContent = type === 'sliding' ? '推拉窗' : '平开窗';
  });

  rainSlider.addEventListener('input', () => {
    const value = parseInt(rainSlider.value);
    scene.setRainIntensity(value / 100);
    rainValue.textContent = `${value}%`;
    rainIntensityEl.textContent = updateRainLabel(value);
  });

  windSlider.addEventListener('input', () => {
    const value = parseInt(windSlider.value);
    scene.setWindSpeed(value / 100);
    windValue.textContent = `${value}%`;
    windSpeedEl.textContent = updateWindLabel(value);
  });

  drainToggle.addEventListener('change', () => {
    scene.setDrainVisible(drainToggle.checked);
  });

  curtainToggle.addEventListener('change', () => {
    scene.setCurtainVisible(curtainToggle.checked);
  });

  stormBtn.addEventListener('click', () => {
    const isStorm = rainSlider.value === '100' && windSlider.value === '100';
    
    if (isStorm) {
      rainSlider.value = '50';
      windSlider.value = '50';
      stormBtn.textContent = '🌪️ 台风模式';
    } else {
      rainSlider.value = '100';
      windSlider.value = '100';
      stormBtn.textContent = '☀️ 正常模式';
    }

    scene.setRainIntensity(parseInt(rainSlider.value) / 100);
    scene.setWindSpeed(parseInt(windSlider.value) / 100);
    rainValue.textContent = `${rainSlider.value}%`;
    windValue.textContent = `${windSlider.value}%`;
    rainIntensityEl.textContent = updateRainLabel(parseInt(rainSlider.value));
    windSpeedEl.textContent = updateWindLabel(parseInt(windSlider.value));
  });

  resetBtn.addEventListener('click', () => {
    scene.reset();
    
    windowTypeSelect.value = 'sliding';
    windowTypeEl.textContent = '推拉窗';
    
    rainSlider.value = '0';
    rainValue.textContent = '0%';
    rainIntensityEl.textContent = updateRainLabel(0);
    
    windSlider.value = '0';
    windValue.textContent = '0%';
    windSpeedEl.textContent = updateWindLabel(0);
    
    drainToggle.checked = true;
    curtainToggle.checked = true;
    
    stormBtn.textContent = '🌪️ 台风模式';
    
    scene.setRainIntensity(0);
    scene.setWindSpeed(0);
    scene.setDrainVisible(true);
    scene.setCurtainVisible(true);
  });

  const initRainValue = parseInt(rainSlider.value);
  const initWindValue = parseInt(windSlider.value);
  scene.setRainIntensity(initRainValue / 100);
  scene.setWindSpeed(initWindValue / 100);
  rainValue.textContent = `${initRainValue}%`;
  windValue.textContent = `${initWindValue}%`;
  rainIntensityEl.textContent = updateRainLabel(initRainValue);
  windSpeedEl.textContent = updateWindLabel(initWindValue);
  windowTypeEl.textContent = windowTypeSelect.value === 'sliding' ? '推拉窗' : '平开窗';

  updateStatusLabels();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
