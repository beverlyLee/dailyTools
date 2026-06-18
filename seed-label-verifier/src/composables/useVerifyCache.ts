import { ref } from 'vue';
import type { VerifyResponse, LabelCheckResponse, SeedInfo } from '../../shared/types';

interface CachedResult {
  qrContent: string;
  verifyResult: VerifyResponse;
  labelCheckResult?: LabelCheckResponse;
  seedInfo?: Partial<SeedInfo>;
  timestamp: number;
}

const CACHE_KEY = 'seed_verify_cache';
const CACHE_TTL = 5 * 60 * 1000;

const currentResult = ref<CachedResult | null>(null);

function loadCache(): CachedResult | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedResult;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed;
      }
      localStorage.removeItem(CACHE_KEY);
    }
  } catch (e) {
    console.error('Load cache error:', e);
  }
  return null;
}

function saveCache(result: CachedResult) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    currentResult.value = result;
  } catch (e) {
    console.error('Save cache error:', e);
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    currentResult.value = null;
  } catch (e) {
    console.error('Clear cache error:', e);
  }
}

export function useVerifyCache() {
  const init = () => {
    if (!currentResult.value) {
      currentResult.value = loadCache();
    }
  };

  const getCachedResult = (qrContent: string): CachedResult | null => {
    init();
    if (currentResult.value && currentResult.value.qrContent === qrContent.trim()) {
      if (Date.now() - currentResult.value.timestamp < CACHE_TTL) {
        return currentResult.value;
      }
      clearCache();
    }
    return null;
  };

  const setCachedResult = (
    qrContent: string,
    verifyResult: VerifyResponse,
    labelCheckResult?: LabelCheckResponse,
    seedInfo?: Partial<SeedInfo>
  ) => {
    const result: CachedResult = {
      qrContent: qrContent.trim(),
      verifyResult,
      labelCheckResult,
      seedInfo,
      timestamp: Date.now()
    };
    saveCache(result);
  };

  return {
    currentResult,
    getCachedResult,
    setCachedResult,
    clearCache
  };
}
