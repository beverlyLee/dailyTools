import { GREENHOUSE_CONFIG, DEVICE_CONFIG } from './config.js';

class EnvironmentSimulator {
  constructor() {
    this.state = {
      temperature: 22,
      humidity: 65,
      light: 5000,
      co2: 700,
      timestamp: Date.now(),
    };
    
    this.devices = {};
    Object.keys(DEVICE_CONFIG).forEach(key => {
      this.devices[key] = { enabled: false, status: 'idle' };
    });
    
    this.history = [];
    this.alarmLogs = [];
    this.hourlyHistory = [];
    this.simulatedHour = 6;
    this.dayLength = 24;
    this.forcedTemperature = null;
    this.forceTempRemaining = 0;
  }

  getDiurnalFactor() {
    const hour = this.simulatedHour;
    const sunrise = 6;
    const sunset = 18;
    const dayLength = sunset - sunrise;
    
    if (hour < sunrise || hour > sunset) {
      return 0;
    }
    
    const progress = (hour - sunrise) / dayLength;
    const midday = 0.5;
    const distanceFromMidday = Math.abs(progress - midday);
    const factor = 1 - (distanceFromMidday / midday);
    return factor * factor;
  }

  addNoise(value, range) {
    const noise = (Math.random() - 0.5) * range;
    return value + noise;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  applyDeviceEffects(currentState) {
    const state = { ...currentState };
    
    Object.entries(this.devices).forEach(([deviceKey, device]) => {
      if (device.enabled && DEVICE_CONFIG[deviceKey]) {
        const effect = DEVICE_CONFIG[deviceKey].effect;
        Object.entries(effect).forEach(([param, value]) => {
          if (param === 'light') {
            state[param] = Math.max(0, state[param] + value);
          } else if (param === 'co2') {
            state[param] = Math.max(300, state[param] + value);
          } else if (param === 'humidity') {
            state[param] = this.clamp(state[param] + value, 0, 100);
          } else {
            state[param] += value;
          }
        });
      }
    });
    
    return state;
  }

  tick() {
    const diurnalFactor = this.getDiurnalFactor();
    const cfg = GREENHOUSE_CONFIG;
    
    const baseTemp = cfg.temperature.min + (cfg.temperature.max - cfg.temperature.min) * 0.4;
    const tempVariation = (cfg.temperature.max - cfg.temperature.min) * 0.4 * diurnalFactor;
    let temperature = baseTemp + tempVariation;
    
    const baseLight = cfg.light.max * diurnalFactor;
    let light = baseLight;
    
    let humidity = cfg.humidity.max - (cfg.humidity.max - cfg.humidity.min) * 0.3 * diurnalFactor;
    humidity = this.addNoise(humidity, 4);
    
    let co2 = cfg.co2.idealMin + (cfg.co2.idealMax - cfg.co2.idealMin) * 0.3;
    if (diurnalFactor > 0.3) {
      co2 -= 150 * diurnalFactor;
    } else {
      co2 += 100 * (1 - diurnalFactor * 2);
    }
    co2 = this.addNoise(co2, 30);
    
    temperature = this.addNoise(temperature, 0.5);
    light = this.addNoise(light, 200);
    
    this.state.temperature = this.clamp(temperature, cfg.temperature.min, cfg.temperature.max);
    this.state.humidity = this.clamp(humidity, cfg.humidity.min, cfg.humidity.max);
    this.state.light = this.clamp(light, cfg.light.min, cfg.light.max);
    this.state.co2 = this.clamp(co2, cfg.co2.min, cfg.co2.max);
    this.state.timestamp = Date.now();
    
    const effectedState = this.applyDeviceEffects(this.state);
    this.state = { ...effectedState, timestamp: Date.now() };
    
    this.state.temperature = this.clamp(this.state.temperature, cfg.temperature.min - 2, cfg.temperature.max + 2);
    this.state.humidity = this.clamp(this.state.humidity, cfg.humidity.min - 2, cfg.humidity.max + 2);
    this.state.light = this.clamp(this.state.light, cfg.light.min, cfg.light.max + 2000);
    this.state.co2 = this.clamp(this.state.co2, cfg.co2.min - 50, cfg.co2.max + 200);
    
    if (this.forcedTemperature !== null && this.forceTempRemaining > 0) {
      this.state.temperature = this.forcedTemperature;
      this.forceTempRemaining -= 3;
      if (this.forceTempRemaining <= 0) {
        this.forcedTemperature = null;
        this.forceTempRemaining = 0;
      }
    }
    
    this.checkAlarms();
    this.addHistoryPoint();
    
    this.simulatedHour += 3 / 60;
    if (this.simulatedHour >= 24) {
      this.simulatedHour = 0;
    }
    
    return { ...this.state };
  }

  checkAlarms() {
    const cfg = GREENHOUSE_CONFIG;
    const state = this.state;
    
    const alarms = [];
    
    if (state.temperature > cfg.temperature.warningHigh) {
      alarms.push({
        type: 'temperature_high',
        level: 'warning',
        message: `温度过高: ${state.temperature.toFixed(1)}℃`,
        value: state.temperature,
        threshold: cfg.temperature.warningHigh,
      });
    }
    if (state.temperature < cfg.temperature.warningLow) {
      alarms.push({
        type: 'temperature_low',
        level: 'warning',
        message: `温度过低: ${state.temperature.toFixed(1)}℃`,
        value: state.temperature,
        threshold: cfg.temperature.warningLow,
      });
    }
    
    if (state.humidity > cfg.humidity.warningHigh) {
      alarms.push({
        type: 'humidity_high',
        level: 'warning',
        message: `湿度过高: ${state.humidity.toFixed(1)}%`,
        value: state.humidity,
        threshold: cfg.humidity.warningHigh,
      });
    }
    if (state.humidity < cfg.humidity.warningLow) {
      alarms.push({
        type: 'humidity_low',
        level: 'warning',
        message: `湿度过低: ${state.humidity.toFixed(1)}%`,
        value: state.humidity,
        threshold: cfg.humidity.warningLow,
      });
    }
    
    if (state.light > cfg.light.warningHigh) {
      alarms.push({
        type: 'light_high',
        level: 'info',
        message: `光照过强: ${state.light.toFixed(0)}lux`,
        value: state.light,
        threshold: cfg.light.warningHigh,
      });
    }
    if (state.light < cfg.light.warningLow && this.simulatedHour > 8 && this.simulatedHour < 16) {
      alarms.push({
        type: 'light_low',
        level: 'info',
        message: `光照不足: ${state.light.toFixed(0)}lux`,
        value: state.light,
        threshold: cfg.light.warningLow,
      });
    }
    
    if (state.co2 > cfg.co2.warningHigh) {
      alarms.push({
        type: 'co2_high',
        level: 'warning',
        message: `CO2浓度过高: ${state.co2.toFixed(0)}ppm`,
        value: state.co2,
        threshold: cfg.co2.warningHigh,
      });
    }
    if (state.co2 < cfg.co2.warningLow) {
      alarms.push({
        type: 'co2_low',
        level: 'info',
        message: `CO2浓度过低: ${state.co2.toFixed(0)}ppm`,
        value: state.co2,
        threshold: cfg.co2.warningLow,
      });
    }
    
    alarms.forEach(alarm => {
      const recentAlarm = this.alarmLogs.find(
        log => log.type === alarm.type && 
               Date.now() - log.timestamp < 60000
      );
      if (!recentAlarm) {
        const logEntry = {
          ...alarm,
          id: Date.now() + Math.random(),
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: new Date().toLocaleDateString('zh-CN'),
        };
        this.alarmLogs.unshift(logEntry);
        if (this.alarmLogs.length > 500) {
          this.alarmLogs = this.alarmLogs.slice(0, 500);
        }
      }
    });
    
    return alarms;
  }

  addHistoryPoint() {
    const point = {
      temperature: this.state.temperature,
      humidity: this.state.humidity,
      light: this.state.light,
      co2: this.state.co2,
      timestamp: Date.now(),
    };
    
    this.history.push(point);
    if (this.history.length > 600) {
      this.history = this.history.slice(-600);
    }
    
    return point;
  }

  get24HourHistory() {
    const hours = 24;
    const points = [];
    const now = Date.now();
    
    for (let i = hours * 60; i >= 0; i -= 3) {
      const hourOffset = i / 60;
      const simulatedHour = (this.simulatedHour - hourOffset + 24) % 24;
      const diurnalFactor = this.getDiurnalFactorAt(simulatedHour);
      const cfg = GREENHOUSE_CONFIG;
      
      const baseTemp = cfg.temperature.min + (cfg.temperature.max - cfg.temperature.min) * 0.4;
      const tempVariation = (cfg.temperature.max - cfg.temperature.min) * 0.4 * diurnalFactor;
      let temperature = baseTemp + tempVariation + (Math.random() - 0.5) * 2;
      
      const baseLight = cfg.light.max * diurnalFactor;
      let light = baseLight + (Math.random() - 0.5) * 500;
      
      let humidity = cfg.humidity.max - (cfg.humidity.max - cfg.humidity.min) * 0.3 * diurnalFactor;
      humidity += (Math.random() - 0.5) * 6;
      
      let co2 = cfg.co2.idealMin + (cfg.co2.idealMax - cfg.co2.idealMin) * 0.3;
      if (diurnalFactor > 0.3) {
        co2 -= 150 * diurnalFactor;
      }
      co2 += (Math.random() - 0.5) * 50;
      
      points.push({
        time: i,
        temperature: this.clamp(temperature, cfg.temperature.min, cfg.temperature.max),
        humidity: this.clamp(humidity, cfg.humidity.min, cfg.humidity.max),
        light: this.clamp(light, cfg.light.min, cfg.light.max),
        co2: this.clamp(co2, cfg.co2.min, cfg.co2.max),
        timestamp: now - i * 60 * 1000,
      });
    }
    
    return points;
  }

  getDiurnalFactorAt(hour) {
    const sunrise = 6;
    const sunset = 18;
    const dayLength = sunset - sunrise;
    
    if (hour < sunrise || hour > sunset) {
      return 0;
    }
    
    const progress = (hour - sunrise) / dayLength;
    const midday = 0.5;
    const distanceFromMidday = Math.abs(progress - midday);
    const factor = 1 - (distanceFromMidday / midday);
    return factor * factor;
  }

  toggleDevice(deviceKey) {
    if (!this.devices[deviceKey]) {
      return { success: false, error: '未知设备' };
    }
    
    const device = this.devices[deviceKey];
    device.enabled = !device.enabled;
    device.status = device.enabled ? 'running' : 'idle';
    
    return {
      success: true,
      device: deviceKey,
      enabled: device.enabled,
      status: device.status,
    };
  }

  getDevices() {
    return Object.entries(this.devices).map(([key, device]) => ({
      key,
      name: DEVICE_CONFIG[key]?.name || key,
      enabled: device.enabled,
      status: device.status,
    }));
  }

  getAlarmLogs(date = null) {
    if (!date) {
      return this.alarmLogs;
    }
    return this.alarmLogs.filter(log => log.date === date);
  }

  getState() {
    return { ...this.state };
  }

  setTemperature(value, durationSeconds = 30) {
    this.forcedTemperature = this.clamp(
      value,
      GREENHOUSE_CONFIG.temperature.min - 5,
      GREENHOUSE_CONFIG.temperature.max + 5
    );
    this.forceTempRemaining = durationSeconds;
    this.state.temperature = this.forcedTemperature;
    this.checkAlarms();
    return this.state.temperature;
  }
}

export default EnvironmentSimulator;
