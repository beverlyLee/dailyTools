import * as THREE from 'three';

interface Ingredient {
  name: string;
  nameCN: string;
  color: THREE.Color;
  color2: THREE.Color;
  smokeColor: THREE.Color;
  bubbleIntensity: number;
  smokeIntensity: number;
  waveHeight: number;
  boilIntensity: number;
  glowIntensity: number;
  waveSpeed: number;
}

export const INGREDIENTS: Record<string, Ingredient> = {
  DEFAULT: {
    name: 'Dragon Blood',
    nameCN: '龙之血',
    color: new THREE.Color(0x8b0000),
    color2: new THREE.Color(0xff4444),
    smokeColor: new THREE.Color(0xff3333),
    bubbleIntensity: 1,
    smokeIntensity: 0.25,
    waveHeight: 0.1,
    boilIntensity: 0.15,
    glowIntensity: 0.7,
    waveSpeed: 0.6
  },
  F: {
    name: 'Fire Essence',
    nameCN: '火焰精华',
    color: new THREE.Color(0xff4500),
    color2: new THREE.Color(0xffcc00),
    smokeColor: new THREE.Color(0xff8800),
    bubbleIntensity: 5,
    smokeIntensity: 0.75,
    waveHeight: 0.28,
    boilIntensity: 0.75,
    glowIntensity: 1.6,
    waveSpeed: 1.6
  },
  W: {
    name: 'Crystal Tears',
    nameCN: '水晶之泪',
    color: new THREE.Color(0x0066cc),
    color2: new THREE.Color(0x00ffff),
    smokeColor: new THREE.Color(0x66ddff),
    bubbleIntensity: 2,
    smokeIntensity: 0.4,
    waveHeight: 0.14,
    boilIntensity: 0.25,
    glowIntensity: 1.0,
    waveSpeed: 0.9
  },
  P: {
    name: 'Poison Powder',
    nameCN: '剧毒粉末',
    color: new THREE.Color(0x228b22),
    color2: new THREE.Color(0x9932cc),
    smokeColor: new THREE.Color(0x66dd44),
    bubbleIntensity: 3.5,
    smokeIntensity: 0.6,
    waveHeight: 0.2,
    boilIntensity: 0.5,
    glowIntensity: 1.3,
    waveSpeed: 1.2
  },
  L: {
    name: 'Lightning Essence',
    nameCN: '闪电精华',
    color: new THREE.Color(0xffcc00),
    color2: new THREE.Color(0xffffff),
    smokeColor: new THREE.Color(0xffff66),
    bubbleIntensity: 8,
    smokeIntensity: 0.95,
    waveHeight: 0.45,
    boilIntensity: 1.0,
    glowIntensity: 2.2,
    waveSpeed: 2.8
  }
};

export interface IngredientDropCallback {
  (key: string, ingredient: Ingredient): void;
}

export class IngredientDrop {
  onIngredientDrop: IngredientDropCallback | null = null;
  private currentKey: string = 'DEFAULT';
  private handleKeyDown: (e: KeyboardEvent) => void;
  private colorDot: HTMLElement | null = null;
  private ingredientName: HTMLElement | null = null;
  private floatingTexts: HTMLDivElement[] = [];

  constructor() {
    this.colorDot = document.getElementById('colorDot');
    this.ingredientName = document.getElementById('ingredientName');
    
    this.handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      if (key === 'R') {
        this.dropIngredient('DEFAULT');
        return;
      }
      
      if (INGREDIENTS[key]) {
        this.dropIngredient(key);
      }
    };
    
    window.addEventListener('keydown', this.handleKeyDown);
    this.updateUI('DEFAULT');
  }

  private dropIngredient(key: string): void {
    const ingredient = INGREDIENTS[key];
    if (!ingredient) return;
    
    this.currentKey = key;
    this.updateUI(key);
    this.showFloatingText(ingredient.nameCN);
    this.createFallingParticle(ingredient.color);
    
    if (this.onIngredientDrop) {
      this.onIngredientDrop(key, ingredient);
    }
  }

  private updateUI(key: string): void {
    const ingredient = INGREDIENTS[key];
    if (!ingredient) return;
    
    const hexColor = '#' + ingredient.color.getHexString();
    
    if (this.colorDot) {
      this.colorDot.style.background = hexColor;
      this.colorDot.style.color = hexColor;
      this.colorDot.style.animation = 'none';
      this.colorDot.offsetHeight;
      this.colorDot.style.animation = 'pulse 0.5s ease-out';
    }
    
    if (this.ingredientName) {
      this.ingredientName.textContent = ingredient.nameCN;
      this.ingredientName.style.animation = 'none';
      this.ingredientName.offsetHeight;
      this.ingredientName.style.animation = 'fadeIn 0.3s ease-out';
    }
  }

  private showFloatingText(text: string): void {
    const floatingText = document.createElement('div');
    floatingText.textContent = `+ ${text}`;
    floatingText.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #c9a9ff;
      font-family: 'Georgia', serif;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 20px rgba(201, 169, 255, 0.8);
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      animation: floatUp 1.5s ease-out forwards;
    `;
    
    document.body.appendChild(floatingText);
    this.floatingTexts.push(floatingText);
    
    setTimeout(() => {
      floatingText.remove();
      const idx = this.floatingTexts.indexOf(floatingText);
      if (idx > -1) this.floatingTexts.splice(idx, 1);
    }, 1500);
  }

  private createFallingParticle(color: THREE.Color): void {
    const hexColor = '#' + color.getHexString();
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.style.cssText = `
          position: fixed;
          top: 0;
          left: ${45 + Math.random() * 10}%;
          width: ${8 + Math.random() * 8}px;
          height: ${8 + Math.random() * 8}px;
          background: ${hexColor};
          border-radius: 50%;
          pointer-events: none;
          z-index: 999;
          box-shadow: 0 0 15px ${hexColor};
          opacity: 0;
          animation: fallIn 1s ease-in forwards;
          animation-delay: ${i * 0.1}s;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
          particle.remove();
        }, 1200);
      }, i * 100);
    }
  }

  getCurrentIngredient(): Ingredient {
    return INGREDIENTS[this.currentKey];
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.floatingTexts.forEach(text => text.remove());
    this.floatingTexts = [];
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes floatUp {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, -60%) scale(1.2);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -150%) scale(1);
    }
  }
  
  @keyframes fallIn {
    0% {
      opacity: 0;
      transform: translateY(-100px) rotate(0deg);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(100vh) rotate(360deg);
    }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.5); }
    100% { transform: scale(1); }
  }
  
  @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
