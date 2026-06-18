export class ColdChainThermodynamicModel {
  constructor(options = {}) {
    this.ambientTemp = options.ambientTemp ?? 30;
    this.refrigerationPower = options.refrigerationPower ?? 800;
    this.volume = options.volume ?? 20;
    this.surfaceArea = options.surfaceArea ?? 28;
    this.heatTransferCoeff = options.heatTransferCoeff ?? 0.6;
    this.airDensity = 1.2;
    this.specificHeat = 1005;
    this.cargoMass = options.cargoMass ?? 80;
    this.cargoSpecificHeat = options.cargoSpecificHeat ?? 3500;
    this.currentTemp = options.initialTemp ?? -2;
    this.doorOpen = false;
    this.doorOpenFactor = 0;
    this.time = 0;
    this.temperatureHistory = [];
    this.alertHistory = [];
    this.threshold = options.threshold ?? 0;
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;
    this.simulationSpeed = options.simulationSpeed ?? 60;
  }

  setDoorOpen(open) {
    this.doorOpen = open;
  }

  setRefrigerationPower(power) {
    this.refrigerationPower = Math.max(0, Math.min(1500, power));
  }

  setAmbientTemp(temp) {
    this.ambientTemp = temp;
  }

  setThreshold(temp) {
    this.threshold = temp;
  }

  step(dtSeconds) {
    const effectiveHeatTransfer = this.heatTransferCoeff * (1 + this.doorOpenFactor * 15);
    const heatGainAmbient = effectiveHeatTransfer * this.surfaceArea * (this.ambientTemp - this.currentTemp);
    const heatRemoved = this.doorOpen ? this.refrigerationPower * 0.15 : this.refrigerationPower;
    const airMass = this.airDensity * this.volume;
    const totalThermalMass = airMass * this.specificHeat + this.cargoMass * this.cargoSpecificHeat;
    const netHeat = heatGainAmbient - heatRemoved;
    const deltaT = (netHeat * dtSeconds) / totalThermalMass;
    this.currentTemp += deltaT;

    if (this.doorOpen && this.doorOpenFactor < 1) {
      this.doorOpenFactor = Math.min(1, this.doorOpenFactor + dtSeconds / 60);
    } else if (!this.doorOpen && this.doorOpenFactor > 0) {
      this.doorOpenFactor = Math.max(0, this.doorOpenFactor - dtSeconds / 120);
    }

    this.time += dtSeconds;

    const record = {
      time: this.time,
      temperature: this.currentTemp,
      doorOpen: this.doorOpen,
      refrigerationPower: this.refrigerationPower,
      ambientTemp: this.ambientTemp,
      threshold: this.threshold,
      isAlert: this.currentTemp > this.threshold
    };

    this.temperatureHistory.push(record);

    if (this.temperatureHistory.length > 3600) {
      this.temperatureHistory.shift();
    }

    if (record.isAlert) {
      const lastAlert = this.alertHistory[this.alertHistory.length - 1];
      if (!lastAlert || !lastAlert.ongoing) {
        this.alertHistory.push({
          startTime: this.time,
          endTime: null,
          maxTemp: this.currentTemp,
          ongoing: true
        });
      } else {
        lastAlert.maxTemp = Math.max(lastAlert.maxTemp, this.currentTemp);
      }
    } else {
      const lastAlert = this.alertHistory[this.alertHistory.length - 1];
      if (lastAlert && lastAlert.ongoing) {
        lastAlert.endTime = this.time;
        lastAlert.ongoing = false;
      }
    }

    return record;
  }

  getTotalAlertDuration() {
    return this.alertHistory.reduce((total, alert) => {
      if (alert.ongoing) {
        const elapsed = this.time - alert.startTime;
        return total + (elapsed === 0 ? 60 : elapsed);
      }
      return total + (alert.endTime - alert.startTime);
    }, 0);
  }

  getReport() {
    const totalDuration = this.time;
    const alertDuration = this.getTotalAlertDuration();
    const alertCount = this.alertHistory.length;
    const maxTemp = this.temperatureHistory.length > 0
      ? Math.max(...this.temperatureHistory.map(r => r.temperature))
      : this.currentTemp;
    const minTemp = this.temperatureHistory.length > 0
      ? Math.min(...this.temperatureHistory.map(r => r.temperature))
      : this.currentTemp;
    const avgTemp = this.temperatureHistory.length > 0
      ? this.temperatureHistory.reduce((sum, r) => sum + r.temperature, 0) / this.temperatureHistory.length
      : this.currentTemp;

    return {
      totalDuration,
      alertDuration,
      alertDurationPercent: totalDuration > 0 ? (alertDuration / totalDuration) * 100 : 0,
      alertCount,
      maxTemp,
      minTemp,
      avgTemp,
      threshold: this.threshold,
      isQualified: alertDuration === 0,
      temperatureHistory: [...this.temperatureHistory],
      alertHistory: this.alertHistory.map(a => ({ ...a }))
    };
  }

  reset(options = {}) {
    this.currentTemp = options.initialTemp ?? -2;
    this.time = 0;
    this.temperatureHistory = [];
    this.alertHistory = [];
    this.doorOpen = false;
    this.doorOpenFactor = 0;
    if (options.ambientTemp !== undefined) this.ambientTemp = options.ambientTemp;
    if (options.refrigerationPower !== undefined) this.refrigerationPower = options.refrigerationPower;
    if (options.threshold !== undefined) this.threshold = options.threshold;
  }
}
