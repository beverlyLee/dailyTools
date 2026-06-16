const GREENHOUSE_CONFIG = {
  temperature: {
    min: 12,
    max: 38,
    idealMin: 22,
    idealMax: 32,
    warningHigh: 32,
    warningLow: 15,
    dangerHigh: 35,
    dangerLow: 12,
  },
  humidity: {
    min: 30,
    max: 95,
    idealMin: 50,
    idealMax: 75,
    warningHigh: 85,
    warningLow: 40,
    dangerHigh: 95,
    dangerLow: 35,
  },
  light: {
    min: 0,
    max: 10000,
    idealMin: 3000,
    idealMax: 8000,
    warningHigh: 9000,
    warningLow: 1000,
    dangerHigh: 9500,
    dangerLow: 0,
    unit: 'lux',
  },
  co2: {
    min: 300,
    max: 2000,
    idealMin: 600,
    idealMax: 1000,
    warningHigh: 1500,
    warningLow: 400,
    dangerHigh: 1800,
    dangerLow: 350,
    unit: 'ppm',
  },
};

const DEVICE_CONFIG = {
  coolingPad: { name: '湿帘风机', effect: { temperature: -3, humidity: 8 } },
  heater: { name: '加热器', effect: { temperature: 4, humidity: -5 } },
  sprinkler: { name: '喷淋系统', effect: { temperature: -2, humidity: 12 } },
  shadeNet: { name: '遮阳网', effect: { light: -4000, temperature: -2 } },
  ledLight: { name: 'LED补光灯', effect: { light: 3000, temperature: 1 } },
  co2Generator: { name: 'CO2发生器', effect: { co2: 400 } },
  ventilator: { name: '通风窗', effect: { humidity: -10, co2: -200, temperature: -1 } },
};

export { GREENHOUSE_CONFIG, DEVICE_CONFIG };
