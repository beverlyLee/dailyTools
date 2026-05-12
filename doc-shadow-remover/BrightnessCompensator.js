import { ShadowMask } from './ShadowMask.js';

export class BrightnessCompensator {
    constructor(options = {}) {
        this.brightnessBoost = options.brightnessBoost || 40;
        this.shadowMask = new ShadowMask({
            sensitivity: options.sensitivity || 50
        });
    }

    rgbToHsv(r, g, b) {
        return this.shadowMask.rgbToHsv(r, g, b);
    }

    hsvToRgb(h, s, v) {
        return this.shadowMask.hsvToRgb(h, s, v);
    }

    calculateNonShadowBackground(valueChannel, width, height, shadowMask) {
        let nonShadowSum = 0;
        let nonShadowCount = 0;

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const idx = i * width + j;
                if (shadowMask.mask[idx] < 0.1) {
                    const v = valueChannel[idx];
                    nonShadowSum += v;
                    nonShadowCount++;
                }
            }
        }

        if (nonShadowCount > 0) {
            return nonShadowSum / nonShadowCount;
        }

        return 0.85;
    }

    applyBrightnessCompensation(imageData) {
        const { data, width, height } = imageData;
        
        const shadowMaskData = this.shadowMask.generateShadowMask(imageData);
        const { mask } = shadowMaskData;

        const valueChannel = this.shadowMask.extractValueChannel(imageData);

        const targetBrightness = this.calculateNonShadowBackground(
            valueChannel, width, height, shadowMaskData
        );

        const outputImageData = new ImageData(
            new Uint8ClampedArray(data),
            width,
            height
        );
        const outputData = outputImageData.data;

        const boostFactor = this.brightnessBoost / 100;

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const pixelIdx = (i * width + j);
                const dataIdx = pixelIdx * 4;

                const maskValue = mask[pixelIdx];

                if (maskValue < 0.02) {
                    continue;
                }

                const r = data[dataIdx];
                const g = data[dataIdx + 1];
                const b = data[dataIdx + 2];

                const { h, s, v } = this.rgbToHsv(r, g, b);

                const brightnessGap = targetBrightness - v;
                if (brightnessGap <= 0) {
                    continue;
                }

                const adaptiveBoost = brightnessGap * (0.7 + boostFactor * 0.5) * maskValue;

                let newV = v + adaptiveBoost;
                newV = Math.min(targetBrightness + 0.03, Math.max(0, newV));

                const saturationAdjust = 1 - maskValue * 0.15;
                const newS = Math.min(1, Math.max(0, s * saturationAdjust));

                const newRgb = this.hsvToRgb(h, newS, newV);

                outputData[dataIdx] = newRgb.r;
                outputData[dataIdx + 1] = newRgb.g;
                outputData[dataIdx + 2] = newRgb.b;
            }
        }

        return {
            imageData: outputImageData,
            shadowMask: shadowMaskData
        };
    }

    setSensitivity(sensitivity) {
        this.shadowMask.sensitivity = sensitivity;
    }

    setBrightnessBoost(boost) {
        this.brightnessBoost = boost;
    }
}
