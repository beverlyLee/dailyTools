import { LightTrail, ColorPreset } from './canvas/LightTrail';

const app = document.getElementById('app');
if (app) {
  const lightTrail = new LightTrail(app);

  const presets = lightTrail.getPresets();

  const colorGrid = document.getElementById('colorGrid') as HTMLDivElement;
  if (colorGrid) {
    presets.forEach((preset: ColorPreset, index: number) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn';
      btn.title = preset.name;

      const [r, g, b] = preset.color;
      const displayR = Math.min(255, Math.round((r / 2.5) * 255));
      const displayG = Math.min(255, Math.round((g / 2.5) * 255));
      const displayB = Math.min(255, Math.round((b / 2.5) * 255));
      btn.style.backgroundColor = `rgb(${displayR}, ${displayG}, ${displayB})`;
      btn.style.color = `rgb(${displayR}, ${displayG}, ${displayB})`;

      btn.addEventListener('click', () => {
        lightTrail.setColorByIndex(index);
        document.querySelectorAll('.color-btn').forEach((b) => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });

      colorGrid.appendChild(btn);
    });

    const firstBtn = colorGrid.querySelector('.color-btn') as HTMLElement;
    if (firstBtn) {
      firstBtn.classList.add('active');
    }
  }

  const customColor = document.getElementById('customColor') as HTMLInputElement;
  if (customColor) {
    customColor.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      const r = parseInt(value.slice(1, 3), 16) / 255 * 2.5;
      const g = parseInt(value.slice(3, 5), 16) / 255 * 2.5;
      const b = parseInt(value.slice(5, 7), 16) / 255 * 2.5;
      lightTrail.setColor(r, g, b);

      document.querySelectorAll('.color-btn').forEach((btn) => {
        btn.classList.remove('active');
      });
    });
  }

  const depthSlider = document.getElementById('depthSlider') as HTMLInputElement;
  const depthValue = document.getElementById('depthValue') as HTMLDivElement;
  if (depthSlider) {
    depthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      lightTrail.setDepth(value);
      if (depthValue) {
        depthValue.textContent = value.toFixed(1);
      }
    });
  }

  const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      lightTrail.undo();
    });
  }

  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      lightTrail.clear();
    });
  }
}
