"use client";

import { useState, useEffect } from "react";
import type { SettingsConfig } from "@/types";

const STORAGE_KEY = "meeting_minutes_settings";

const defaultConfig: SettingsConfig = {
  apiKey: "",
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  model: "doubao-seed-1-8-250328",
};

export function useSettings() {
  const [config, setConfig] = useState<SettingsConfig>(defaultConfig);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error("加载设置失败:", e);
    }
    setLoaded(true);
  }, []);

  const saveConfig = (newConfig: Partial<SettingsConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const clearConfig = () => {
    setConfig(defaultConfig);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    config,
    loaded,
    saveConfig,
    clearConfig,
  };
}
