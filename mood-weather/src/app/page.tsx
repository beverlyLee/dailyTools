"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { WeatherType } from "@/components/scenes/WeatherScene";

const WeatherScene = dynamic(
  () => import("@/components/scenes/WeatherScene"),
  { ssr: false }
);

const moodToWeather: Record<string, WeatherType> = {
  "开心": "sunny",
  "快乐": "sunny",
  "高兴": "sunny",
  "兴奋": "sunny",
  "愉悦": "sunny",
  "阳光": "sunny",
  "灿烂": "sunny",
  "积极": "sunny",
  "乐观": "sunny",
  "希望": "sunny",
  "活力": "sunny",

  "悲伤": "rainy",
  "难过": "rainy",
  "痛苦": "rainy",
  "哭泣": "rainy",
  "忧郁": "rainy",
  "压抑": "rainy",
  "郁闷": "rainy",
  "失落": "rainy",
  "沮丧": "rainy",
  "绝望": "rainy",
  "心碎": "rainy",

  "冷静": "snowy",
  "平静": "snowy",
  "孤独": "snowy",
  "寂寞": "snowy",
  "冷漠": "snowy",
  "冰冷": "snowy",
  "冻结": "snowy",
  "沉默": "snowy",
  "安静": "snowy",
  "沉思": "snowy",
};

const weatherConfig: Record<
  WeatherType,
  { label: string; emoji: string; bgColor: string }
> = {
  sunny: { label: "晴天", emoji: "☀️", bgColor: "from-yellow-400 to-orange-400" },
  rainy: { label: "暴雨", emoji: "🌧️", bgColor: "from-gray-600 to-gray-800" },
  snowy: { label: "暴雪", emoji: "❄️", bgColor: "from-blue-200 to-blue-400" },
};

function matchMoodToWeather(input: string): WeatherType | null {
  const normalized = input.trim().toLowerCase();

  for (const [mood, weather] of Object.entries(moodToWeather)) {
    if (normalized.includes(mood.toLowerCase())) {
      return weather;
    }
  }

  const pinyinMap: Record<string, WeatherType> = {
    "kaixin": "sunny",
    "kuaile": "sunny",
    "gaoxing": "sunny",
    "beishang": "rainy",
    "nanguo": "rainy",
    "tongku": "rainy",
    "youshang": "rainy",
    "yayu": "rainy",
    "yumen": "rainy",
    "lengjing": "snowy",
    "pingjing": "snowy",
    "gudu": "snowy",
    "jimo": "snowy",
    "lengmo": "snowy",
  };

  for (const [pinyin, weather] of Object.entries(pinyinMap)) {
    if (normalized.includes(pinyin)) {
      return weather;
    }
  }

  return null;
}

export default function Home() {
  const [currentWeather, setCurrentWeather] = useState<WeatherType>("sunny");
  const [inputValue, setInputValue] = useState("");
  const [matchedMood, setMatchedMood] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleWeatherChange = useCallback((weather: WeatherType) => {
    setCurrentWeather(weather);
    setMatchedMood(null);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (value.length > 0) {
        const matched = matchMoodToWeather(value);
        if (matched) {
          setCurrentWeather(matched);
          setMatchedMood(value);
        }
      } else {
        setMatchedMood(null);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        const matched = matchMoodToWeather(inputValue);
        if (matched) {
          setCurrentWeather(matched);
          setMatchedMood(inputValue);
        }
      }
    },
    [inputValue]
  );

  const handleClearInput = useCallback(() => {
    setInputValue("");
    setMatchedMood(null);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <WeatherScene weatherType={currentWeather} />

      <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center pt-6 pointer-events-none">
        <div className="px-8 py-4 rounded-2xl backdrop-blur-md bg-black/30 text-white">
          <h1 className="text-3xl font-bold text-center">
            {weatherConfig[currentWeather].emoji}{" "}
            {weatherConfig[currentWeather].label}
          </h1>
          <p className="text-sm text-center mt-2 text-gray-200">
            {matchedMood
              ? `匹配情绪: "${matchedMood}"`
              : "输入情绪词汇，感受天气变化"}
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 top-28 z-10 flex justify-center pointer-events-auto">
        <div className="relative w-full max-w-md mx-4">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入情绪词汇，如: 开心、悲伤、冷静..."
            className="w-full px-6 py-4 pr-12 rounded-2xl backdrop-blur-md bg-black/40 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all text-lg"
          />
          {inputValue && (
            <button
              onClick={handleClearInput}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-xl"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-8 pointer-events-auto">
        <div className="flex flex-wrap justify-center gap-3 mb-4 px-4">
          <span className="text-white/70 text-sm w-full text-center mb-1">
            试试这些词:
          </span>
          {["开心", "悲伤", "冷静", "快乐", "忧郁", "孤独", "兴奋", "失落"].map(
            (mood) => (
              <button
                key={mood}
                onClick={() => {
                  const matched = matchMoodToWeather(mood);
                  if (matched) {
                    setInputValue(mood);
                    setCurrentWeather(matched);
                    setMatchedMood(mood);
                  }
                }}
                className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm hover:bg-white/30 transition-all hover:scale-105"
              >
                {mood}
              </button>
            )
          )}
        </div>

        <div className="flex gap-4 p-4 rounded-2xl backdrop-blur-md bg-black/30">
          {(Object.keys(weatherConfig) as WeatherType[]).map((weather) => (
            <button
              key={weather}
              onClick={() => handleWeatherChange(weather)}
              className={`
                px-6 py-3 rounded-xl font-semibold text-lg
                transition-all duration-300 ease-out
                ${currentWeather === weather
                  ? `bg-gradient-to-r ${weatherConfig[weather].bgColor} text-white shadow-lg scale-110`
                  : "bg-white/20 text-white hover:bg-white/30 hover:scale-105"
                }
                cursor-pointer
              `}
            >
              {weatherConfig[weather].emoji}{" "}
              {weatherConfig[weather].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
