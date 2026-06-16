import axios from 'axios';
import dayjs from 'dayjs';
import NodeCache from 'node-cache';
import type {
  WeatherResponse,
  HourlyForecast,
  DailyForecast,
} from '../../shared/types.js';

const weatherCache = new NodeCache({ stdTTL: 1800 });

interface CityClimateProfile {
  name: string;
  baseTemp: [number, number];
  humidityRange: [number, number];
  precipitationPattern: 'north_dry' | 'north_plain' | 'northwest_arid' | 'yellow_river';
}

const cityClimate: Record<string, CityClimateProfile> = {
  北京: { name: '北京', baseTemp: [20, 32], humidityRange: [35, 70], precipitationPattern: 'north_plain' },
  郑州: { name: '郑州', baseTemp: [22, 34], humidityRange: [40, 75], precipitationPattern: 'yellow_river' },
  济南: { name: '济南', baseTemp: [21, 33], humidityRange: [40, 72], precipitationPattern: 'north_plain' },
  石家庄: { name: '石家庄', baseTemp: [20, 33], humidityRange: [38, 70], precipitationPattern: 'north_plain' },
  天津: { name: '天津', baseTemp: [20, 31], humidityRange: [45, 75], precipitationPattern: 'north_plain' },
  西安: { name: '西安', baseTemp: [21, 33], humidityRange: [40, 72], precipitationPattern: 'yellow_river' },
  太原: { name: '太原', baseTemp: [18, 31], humidityRange: [35, 65], precipitationPattern: 'north_dry' },
  兰州: { name: '兰州', baseTemp: [16, 28], humidityRange: [28, 60], precipitationPattern: 'northwest_arid' },
  银川: { name: '银川', baseTemp: [17, 30], humidityRange: [30, 62], precipitationPattern: 'northwest_arid' },
  呼和浩特: { name: '呼和浩特', baseTemp: [15, 28], humidityRange: [30, 60], precipitationPattern: 'northwest_arid' },
  乌鲁木齐: { name: '乌鲁木齐', baseTemp: [18, 31], humidityRange: [25, 55], precipitationPattern: 'northwest_arid' },
  哈尔滨: { name: '哈尔滨', baseTemp: [16, 26], humidityRange: [45, 75], precipitationPattern: 'north_dry' },
  长春: { name: '长春', baseTemp: [17, 28], humidityRange: [45, 75], precipitationPattern: 'north_dry' },
  沈阳: { name: '沈阳', baseTemp: [18, 29], humidityRange: [45, 75], precipitationPattern: 'north_dry' },
  青岛: { name: '青岛', baseTemp: [18, 28], humidityRange: [55, 85], precipitationPattern: 'north_plain' },
  徐州: { name: '徐州', baseTemp: [21, 32], humidityRange: [50, 80], precipitationPattern: 'yellow_river' },
};

function getClimate(city: string): CityClimateProfile {
  return cityClimate[city] ?? cityClimate['北京'];
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function calcEvaporationET0(
  temp: number,
  humidity: number,
  windSpeed: number,
  hour: number,
): number {
  const solarRadiation = hour >= 6 && hour <= 18
    ? (1 - Math.abs(hour - 12) / 6) * 0.7 + 0.3
    : 0.1;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = (humidity / 100) * es;
  const delta = (4098 * es) / Math.pow(temp + 237.3, 2);
  const gamma = 0.0665;
  const Rn = solarRadiation * 12;
  const u2 = windSpeed * 0.35;
  const et0 =
    (0.408 * delta * Rn + gamma * (900 / (temp + 273)) * u2 * (es - ea)) /
    (delta + gamma * (1 + 0.34 * u2));
  return Math.max(0, Math.round(et0 * 100) / 100);
}

function getWeatherPhenomenon(precipProb: number, temp: number): string {
  if (precipProb >= 80) return '中雨';
  if (precipProb >= 60) return '小雨';
  if (precipProb >= 40) return '多云转阴';
  if (temp > 32) return '晴转晴';
  return '晴';
}

function normalizeHour(value: number): string {
  return value.toString().padStart(2, '0');
}

export function generateMockWeather(city: string, forceRain = false): WeatherResponse {
  const climate = getClimate(city);
  const now = dayjs();
  const hourly: HourlyForecast[] = [];
  const daily: DailyForecast[] = [];

  let totalRain = 0;
  let maxPrecipProb = 0;
  let firstRainHour: number | null = null;
  let lastRainHour: number | null = null;

  for (let h = 0; h < 72; h++) {
    const hourIdx = now.add(h, 'hour');
    const hourOfDay = hourIdx.hour();
    const temp =
      climate.baseTemp[0] +
      (climate.baseTemp[1] - climate.baseTemp[0]) *
        Math.sin(((hourOfDay - 6) / 12) * Math.PI) +
      rand(-2, 2);

    const humidity =
      climate.humidityRange[0] +
      ((climate.humidityRange[1] - climate.humidityRange[0]) *
        (1 - Math.sin(((hourOfDay - 6) / 12) * Math.PI))) /
        2 +
      rand(-5, 5);

    let precipProb = 0;
    let precipitation = 0;

    const rainBlockStarts = forceRain ? [12, 36] : [25, 48];
    const isRainHour = rainBlockStarts.some((start) => h >= start && h <= start + 5);

    if (isRainHour) {
      precipProb = forceRain ? rand(65, 95) : rand(20, 70);
      if (precipProb > 55) {
        precipitation = forceRain ? rand(2, 7) : rand(0.5, 4);
      }
    } else {
      precipProb = rand(0, 25);
      if (precipProb > 18) precipitation = rand(0, 0.5);
    }

    if (precipitation > 0) {
      totalRain += precipitation;
      if (firstRainHour === null) firstRainHour = h;
      lastRainHour = h;
    }
    if (precipProb > maxPrecipProb) maxPrecipProb = precipProb;

    const windSpeed = rand(1.2, 5.5);
    const evaporation = calcEvaporationET0(temp, humidity, windSpeed, hourOfDay) / 24;

    hourly.push({
      time: `${hourIdx.format('YYYY-MM-DD')} ${normalizeHour(hourOfDay)}:00`,
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity),
      precipitationProb: Math.round(precipProb),
      precipitation: Math.round(precipitation * 10) / 10,
      evaporation: Math.round(evaporation * 100) / 100,
      weather: getWeatherPhenomenon(precipProb, temp),
      windSpeed: Math.round(windSpeed * 10) / 10,
    });
  }

  for (let d = 0; d < 7; d++) {
    const day = now.add(d, 'day');
    const dayHours = hourly.filter((_, i) => i >= d * 24 && i < d * 24 + 24);
    const temps = dayHours.map((h) => h.temperature);
    const tempMax = Math.max(...temps);
    const tempMin = Math.min(...temps);
    const precip = dayHours.reduce((s, h) => s + h.precipitation, 0);
    const probMax = Math.max(...dayHours.map((h) => h.precipitationProb));
    const dayH = dayHours.filter((_, i) => i >= 6 && i < 18);
    const nightH = dayHours.filter((_, i) => i < 6 || i >= 18);
    const dayProbMax = dayH.length ? Math.max(...dayH.map((h) => h.precipitationProb)) : 0;
    const nightProbMax = nightH.length ? Math.max(...nightH.map((h) => h.precipitationProb)) : 0;

    daily.push({
      date: day.format('YYYY-MM-DD'),
      dayWeather: getWeatherPhenomenon(dayProbMax, tempMax),
      nightWeather: getWeatherPhenomenon(nightProbMax, tempMin),
      tempMax: Math.round(tempMax * 10) / 10,
      tempMin: Math.round(tempMin * 10) / 10,
      precipitationProb: Math.round(probMax),
      precipitation: Math.round(precip * 10) / 10,
    });
  }

  const hasEffectiveRain = totalRain > 10 && maxPrecipProb > 60;
  let suggestedDelayDays = 0;
  let nextRainDate: string | undefined;

  if (firstRainHour !== null) {
    nextRainDate = now.add(firstRainHour, 'hour').format('YYYY-MM-DD');
    if (lastRainHour !== null) {
      const rainEnd = now.add(lastRainHour + 1, 'hour');
      suggestedDelayDays = Math.max(
        0,
        Math.ceil((rainEnd.valueOf() - now.valueOf()) / (1000 * 60 * 60 * 24)),
      );
      suggestedDelayDays = Math.min(3, Math.round(suggestedDelayDays));
    }
  }

  return {
    city,
    current: {
      temperature: hourly[0].temperature,
      humidity: hourly[0].humidity,
      weather: hourly[0].weather,
      updateTime: now.format('YYYY-MM-DD HH:mm:ss'),
      windSpeed: hourly[0].windSpeed,
    },
    hourly,
    daily,
    hasEffectiveRain,
    suggestedDelayDays,
    nextRainDate,
    totalExpectedRain: Math.round(totalRain * 10) / 10,
  };
}

async function fetchAmapWeather(city: string): Promise<WeatherResponse> {
  const key = process.env.AMAP_KEY;
  if (!key) throw new Error('AMAP_KEY not configured');

  const cityMap: Record<string, string> = {
    北京: '110000',
    天津: '120000',
    石家庄: '130100',
    太原: '140100',
    呼和浩特: '150100',
    沈阳: '210100',
    长春: '220100',
    哈尔滨: '230100',
    上海: '310000',
    南京: '320100',
    杭州: '330100',
    合肥: '340100',
    福州: '350100',
    南昌: '360100',
    济南: '370100',
    郑州: '410100',
    武汉: '420100',
    长沙: '430100',
    广州: '440100',
    南宁: '450100',
    海口: '460100',
    重庆: '500000',
    成都: '510100',
    贵阳: '520100',
    昆明: '530100',
    拉萨: '540100',
    西安: '610100',
    兰州: '620100',
    西宁: '630100',
    银川: '640100',
    乌鲁木齐: '650100',
    青岛: '370200',
    徐州: '320300',
  };

  const adcode = cityMap[city] ?? '110000';

  const { data: liveResp } = await axios.get(
    `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${key}&extensions=base`,
    { timeout: 5000 },
  );

  const { data: forecastResp } = await axios.get(
    `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${key}&extensions=all`,
    { timeout: 5000 },
  );

  if (liveResp.status !== '1' || forecastResp.status !== '1') {
    throw new Error('AMAP API error');
  }

  const live = liveResp.lives?.[0];
  const casts = forecastResp.forecasts?.[0]?.casts ?? [];

  const mock = generateMockWeather(city);

  const daily: DailyForecast[] = casts.map((cast: any) => ({
    date: cast.date,
    dayWeather: cast.dayweather,
    nightWeather: cast.nightweather,
    tempMax: Number(cast.daytemp),
    tempMin: Number(cast.nighttemp),
    precipitationProb: 20,
    precipitation: 0,
  }));

  const rawWindPower = live?.windpower ?? '2';
  const windPowerNum = Number(String(rawWindPower).replace(/[^\d.]/g, '')) || 2;

  return {
    city,
    current: {
      temperature: Number(live?.temperature ?? 25),
      humidity: Number(live?.humidity ?? 50),
      weather: live?.weather ?? '晴',
      updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      windSpeed: windPowerNum,
    },
    hourly: mock.hourly,
    daily: daily.length ? daily : mock.daily,
    hasEffectiveRain: mock.hasEffectiveRain,
    suggestedDelayDays: mock.suggestedDelayDays,
    nextRainDate: mock.nextRainDate,
    totalExpectedRain: mock.totalExpectedRain,
  };
}

export async function getWeather(city: string, forceRain = false): Promise<WeatherResponse> {
  const cacheKey = `weather:${city}:${forceRain ? 'rain' : 'normal'}`;
  const cached = weatherCache.get<WeatherResponse>(cacheKey);
  if (cached) return cached;

  try {
    if (forceRain || !process.env.AMAP_KEY) {
      const result = generateMockWeather(city, forceRain);
      weatherCache.set(cacheKey, result);
      return result;
    }
    const result = await fetchAmapWeather(city);
    weatherCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[weatherService] fetch real weather failed, fallback to mock:', (err as Error).message);
    const fallback = generateMockWeather(city, forceRain);
    weatherCache.set(cacheKey, fallback);
    return fallback;
  }
}
