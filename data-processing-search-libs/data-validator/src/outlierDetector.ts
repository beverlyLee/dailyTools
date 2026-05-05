import { OutlierMethod, OutlierInfo, ColumnStats } from './types';

export class OutlierDetector {
  static calculateStats(values: number[]): ColumnStats {
    const validValues = values.filter(v => typeof v === 'number' && Number.isFinite(v));
    
    if (validValues.length === 0) {
      return {
        mean: 0,
        median: 0,
        std: 0,
        min: 0,
        max: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        missingCount: values.length,
        totalCount: values.length
      };
    }

    const sorted = [...validValues].sort((a, b) => a - b);
    const n = sorted.length;
    
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    const min = sorted[0];
    const max = sorted[n - 1];
    
    const getQuartile = (arr: number[], q: number): number => {
      const pos = (arr.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      
      if (base + 1 < arr.length) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      }
      return arr[base];
    };
    
    const median = getQuartile(sorted, 0.5);
    const q1 = getQuartile(sorted, 0.25);
    const q3 = getQuartile(sorted, 0.75);
    const iqr = q3 - q1;

    return {
      mean,
      median,
      std,
      min,
      max,
      q1,
      q3,
      iqr,
      missingCount: values.length - validValues.length,
      totalCount: values.length
    };
  }

  static detectIQR(values: number[], threshold: number = 1.5): OutlierInfo[] {
    const stats = this.calculateStats(values);
    const lowerBound = stats.q1 - threshold * stats.iqr;
    const upperBound = stats.q3 + threshold * stats.iqr;

    return values.map((value, index) => {
      const isOutlier = Number.isFinite(value) && (value < lowerBound || value > upperBound);
      return {
        field: '',
        value,
        index,
        method: 'iqr' as OutlierMethod,
        isOutlier
      };
    });
  }

  static detectZScore(values: number[], threshold: number = 3): OutlierInfo[] {
    const stats = this.calculateStats(values);

    return values.map((value, index) => {
      if (!Number.isFinite(value) || stats.std === 0) {
        return {
          field: '',
          value,
          index,
          method: 'zscore' as OutlierMethod,
          isOutlier: false
        };
      }

      const zScore = Math.abs((value - stats.mean) / stats.std);
      return {
        field: '',
        value,
        index,
        method: 'zscore' as OutlierMethod,
        isOutlier: zScore > threshold
      };
    });
  }

  static detect(values: number[], method: OutlierMethod = 'iqr', options?: { threshold?: number }): OutlierInfo[] {
    const threshold = options?.threshold ?? (method === 'zscore' ? 3 : 1.5);
    
    if (method === 'zscore') {
      return this.detectZScore(values, threshold);
    }
    return this.detectIQR(values, threshold);
  }

  static removeOutliers(values: number[], method: OutlierMethod = 'iqr', options?: { threshold?: number }): { cleaned: number[]; outliers: OutlierInfo[] } {
    const outliers = this.detect(values, method, options);
    const cleaned = values.filter((_, index) => !outliers[index].isOutlier);
    
    return {
      cleaned,
      outliers
    };
  }

  static replaceOutliers(
    values: number[],
    method: OutlierMethod = 'iqr',
    replaceWith: 'mean' | 'median' | 'min' | 'max' | number = 'median',
    options?: { threshold?: number }
  ): { cleaned: number[]; outliers: OutlierInfo[] } {
    const outliers = this.detect(values, method, options);
    const stats = this.calculateStats(values);
    
    const replaceValue = typeof replaceWith === 'number' ? replaceWith :
      replaceWith === 'mean' ? stats.mean :
      replaceWith === 'min' ? stats.min :
      replaceWith === 'max' ? stats.max :
      stats.median;

    const cleaned = values.map((value, index) => {
      if (outliers[index].isOutlier) {
        return replaceValue;
      }
      return value;
    });

    return {
      cleaned,
      outliers
    };
  }
}
