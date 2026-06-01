import * as THREE from 'three';

export interface PixelSample {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface VerificationResult {
  timestamp: number;
  frameCount: number;
  avgBrightness: number;
  maxBrightness: number;
  nonBlackPixelRatio: number;
  dominantChannel: 'r' | 'g' | 'b' | 'none';
  centerSample: PixelSample;
  edgeSamples: PixelSample[];
  colorVariance: number;
  passed: boolean;
  details: string[];
  frenetDot: number;
  avgFrenetDot: number;
  doubleBufferStable: boolean;
}

export class RenderVerifier {
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null;
  private sampleBuffer: Uint8Array;
  private sampleWidth: number;
  private sampleHeight: number;
  private frameCount: number;
  private lastVerifyTime: number;
  private verifyInterval: number;
  private results: VerificationResult[];
  private onResultCallback: ((result: VerificationResult) => void) | null;
  private prevAvgBrightness: number | null;
  private pendingRetry: boolean;

  private static readonly SAMPLE_SIZE = 64;
  private static readonly BRIGHTNESS_DELTA_THRESHOLD = 0.5;

  constructor(renderer: THREE.WebGLRenderer, verifyIntervalMs: number = 3000) {
    this.gl = renderer.getContext();
    this.sampleWidth = RenderVerifier.SAMPLE_SIZE;
    this.sampleHeight = RenderVerifier.SAMPLE_SIZE;
    this.sampleBuffer = new Uint8Array(this.sampleWidth * this.sampleHeight * 4);
    this.frameCount = 0;
    this.lastVerifyTime = -Infinity;
    this.verifyInterval = verifyIntervalMs;
    this.results = [];
    this.onResultCallback = null;
    this.prevAvgBrightness = null;
    this.pendingRetry = false;
  }

  public onResult(callback: (result: VerificationResult) => void): void {
    this.onResultCallback = callback;
  }

  public verify(renderer: THREE.WebGLRenderer, time: number, frenetDot: number, avgFrenetDot: number): VerificationResult | null {
    this.frameCount++;

    if (time - this.lastVerifyTime < this.verifyInterval / 1000) {
      return null;
    }
    this.lastVerifyTime = time;

    const rendererSize = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const fullWidth = Math.floor(rendererSize.width * pixelRatio);
    const fullHeight = Math.floor(rendererSize.height * pixelRatio);

    const details: string[] = [];

    if (!this.gl) {
      details.push('FAIL: WebGL context not available');
      const failResult = this.buildResult(0, 0, 0, 'none',
        this.px(0, 0, 0, 0, 0, 255), [], 0, false, details, frenetDot, avgFrenetDot, false);
      this.results.push(failResult);
      if (this.onResultCallback) this.onResultCallback(failResult);
      return failResult;
    }

    const sx = Math.floor((fullWidth - this.sampleWidth) / 2);
    const sy = Math.floor((fullHeight - this.sampleHeight) / 2);

    this.gl.readPixels(
      sx, sy,
      this.sampleWidth, this.sampleHeight,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.sampleBuffer
    );

    const glError = this.gl.getError();
    if (glError !== this.gl.NO_ERROR) {
      details.push(`FAIL: WebGL error after readPixels: ${glError}`);
      const failResult = this.buildResult(0, 0, 0, 'none',
        this.px(0, 0, 0, 0, 0, 255), [], 0, false, details, frenetDot, avgFrenetDot, false);
      this.results.push(failResult);
      if (this.onResultCallback) this.onResultCallback(failResult);
      return failResult;
    }

    const analysis = this.analyzeSampleBuffer();

    let doubleBufferStable = true;
    if (this.prevAvgBrightness !== null) {
      const delta = Math.abs(analysis.avgBrightness - this.prevAvgBrightness);
      if (delta > RenderVerifier.BRIGHTNESS_DELTA_THRESHOLD) {
        doubleBufferStable = false;
        details.push(`Double-buffer: brightness delta ${delta.toFixed(4)} > ${RenderVerifier.BRIGHTNESS_DELTA_THRESHOLD}, flagging unstable`);
        if (!this.pendingRetry) {
          this.pendingRetry = true;
          this.lastVerifyTime = time - this.verifyInterval / 1000 + 0.5;
          this.prevAvgBrightness = analysis.avgBrightness;
          return null;
        }
      }
    }
    this.pendingRetry = false;
    this.prevAvgBrightness = analysis.avgBrightness;

    const centerFullX = Math.floor(fullWidth / 2) - sx;
    const centerFullY = Math.floor(fullHeight / 2) - sy;
    const centerSample = this.samplePixel(
      Math.max(0, Math.min(centerFullX, this.sampleWidth - 1)),
      Math.max(0, Math.min(centerFullY, this.sampleHeight - 1))
    );

    const edgeSamples: PixelSample[] = [
      this.samplePixel(Math.floor(this.sampleWidth * 0.25), Math.floor(this.sampleHeight * 0.5)),
      this.samplePixel(Math.floor(this.sampleWidth * 0.75), Math.floor(this.sampleHeight * 0.5)),
      this.samplePixel(Math.floor(this.sampleWidth * 0.5), Math.floor(this.sampleHeight * 0.25)),
      this.samplePixel(Math.floor(this.sampleWidth * 0.5), Math.floor(this.sampleHeight * 0.75)),
    ];

    details.push(`avgBrightness: ${analysis.avgBrightness.toFixed(4)} (threshold > 0.01)`);
    details.push(`maxBrightness: ${analysis.maxBrightness.toFixed(4)}`);
    details.push(`nonBlackPixelRatio: ${(analysis.nonBlackPixelRatio * 100).toFixed(1)}% (threshold > 5%)`);
    details.push(`dominantChannel: ${analysis.dominantChannel}`);
    details.push(`center pixel: R=${centerSample.r} G=${centerSample.g} B=${centerSample.b}`);
    details.push(`colorVariance: ${analysis.colorVariance.toFixed(4)} (threshold > 0.01)`);
    details.push(`frenetDot: ${frenetDot.toFixed(4)} (ideal ~1.0)`);
    details.push(`avgFrenetDot(${100}): ${avgFrenetDot.toFixed(4)} (threshold > 0.99)`);

    const passed = analysis.avgBrightness > 0.01
      && analysis.nonBlackPixelRatio > 0.05
      && analysis.colorVariance > 0.01;

    if (passed) {
      details.push('PASS: Rendering verified');
    } else {
      if (analysis.avgBrightness <= 0.01) details.push('FAIL: Scene too dark');
      if (analysis.nonBlackPixelRatio <= 0.05) details.push('FAIL: Too few non-black pixels');
      if (analysis.colorVariance <= 0.01) details.push('FAIL: Insufficient color variance');
    }

    if (frenetDot < 0.99) {
      details.push(`WARN: frenetDot ${frenetDot.toFixed(4)} < 0.99, camera-tangent alignment off`);
    }
    if (avgFrenetDot < 0.99) {
      details.push(`WARN: avgFrenetDot ${avgFrenetDot.toFixed(4)} < 0.99, sustained alignment off`);
    }

    const result = this.buildResult(
      analysis.avgBrightness, analysis.maxBrightness, analysis.nonBlackPixelRatio,
      analysis.dominantChannel, centerSample, edgeSamples,
      analysis.colorVariance, passed, details, frenetDot, avgFrenetDot, doubleBufferStable
    );

    this.results.push(result);
    if (this.onResultCallback) this.onResultCallback(result);
    return result;
  }

  private analyzeSampleBuffer(): {
    avgBrightness: number;
    maxBrightness: number;
    nonBlackPixelRatio: number;
    dominantChannel: 'r' | 'g' | 'b' | 'none';
    colorVariance: number;
  } {
    const totalPixels = this.sampleWidth * this.sampleHeight;
    let totalBrightness = 0;
    let maxBrightness = 0;
    let nonBlackPixels = 0;
    let totalR = 0, totalG = 0, totalB = 0;

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4;
      const r = this.sampleBuffer[offset];
      const g = this.sampleBuffer[offset + 1];
      const b = this.sampleBuffer[offset + 2];
      const brightness = (r + g + b) / (3 * 255);
      totalBrightness += brightness;
      maxBrightness = Math.max(maxBrightness, brightness);
      totalR += r;
      totalG += g;
      totalB += b;
      if (r > 5 || g > 5 || b > 5) {
        nonBlackPixels++;
      }
    }

    const avgBrightness = totalBrightness / totalPixels;
    const nonBlackPixelRatio = nonBlackPixels / totalPixels;

    const avgR = totalR / totalPixels;
    const avgG = totalG / totalPixels;
    const avgB = totalB / totalPixels;
    let dominantChannel: 'r' | 'g' | 'b' | 'none' = 'none';
    if (avgR > avgG && avgR > avgB && avgR > 1) dominantChannel = 'r';
    else if (avgG > avgR && avgG > avgB && avgG > 1) dominantChannel = 'g';
    else if (avgB > avgR && avgB > avgG && avgB > 1) dominantChannel = 'b';

    let varianceSum = 0;
    const step = Math.max(1, Math.floor(totalPixels / 100));
    let sampleCount = 0;
    for (let i = 0; i < totalPixels; i += step) {
      const offset = i * 4;
      const r = this.sampleBuffer[offset] / 255;
      const g = this.sampleBuffer[offset + 1] / 255;
      const b = this.sampleBuffer[offset + 2] / 255;
      const diff = Math.abs(r - avgBrightness) + Math.abs(g - avgBrightness) + Math.abs(b - avgBrightness);
      varianceSum += diff;
      sampleCount++;
    }
    const colorVariance = sampleCount > 0 ? varianceSum / sampleCount : 0;

    return { avgBrightness, maxBrightness, nonBlackPixelRatio, dominantChannel, colorVariance };
  }

  private samplePixel(x: number, y: number): PixelSample {
    if (x < 0 || y < 0 || x >= this.sampleWidth || y >= this.sampleHeight) {
      return this.px(x, y, 0, 0, 0, 0);
    }
    const offset = (y * this.sampleWidth + x) * 4;
    return this.px(
      x, y,
      this.sampleBuffer[offset],
      this.sampleBuffer[offset + 1],
      this.sampleBuffer[offset + 2],
      this.sampleBuffer[offset + 3]
    );
  }

  private px(x: number, y: number, r: number, g: number, b: number, a: number): PixelSample {
    return { x, y, r, g, b, a };
  }

  private buildResult(
    avgBrightness: number,
    maxBrightness: number,
    nonBlackPixelRatio: number,
    dominantChannel: 'r' | 'g' | 'b' | 'none',
    centerSample: PixelSample,
    edgeSamples: PixelSample[],
    colorVariance: number,
    passed: boolean,
    details: string[],
    frenetDot: number,
    avgFrenetDot: number,
    doubleBufferStable: boolean
  ): VerificationResult {
    return {
      timestamp: performance.now(),
      frameCount: this.frameCount,
      avgBrightness,
      maxBrightness,
      nonBlackPixelRatio,
      dominantChannel,
      centerSample,
      edgeSamples,
      colorVariance,
      passed,
      details,
      frenetDot,
      avgFrenetDot,
      doubleBufferStable
    };
  }

  public getResults(): VerificationResult[] {
    return this.results;
  }

  public getLatestResult(): VerificationResult | null {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }
}
