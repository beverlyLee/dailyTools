import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useEnvironmentStore } from './environment';

export const useDeviceStore = defineStore('device', () => {
  const devices = ref([
    { key: 'coolingPad', name: '湿帘风机', enabled: false, status: 'idle', icon: '💨' },
    { key: 'heater', name: '加热器', enabled: false, status: 'idle', icon: '🔥' },
    { key: 'sprinkler', name: '喷淋系统', enabled: false, status: 'idle', icon: '💧' },
    { key: 'shadeNet', name: '遮阳网', enabled: false, status: 'idle', icon: '⛱️' },
    { key: 'ledLight', name: 'LED补光灯', enabled: false, status: 'idle', icon: '💡' },
    { key: 'co2Generator', name: 'CO2发生器', enabled: false, status: 'idle', icon: '🫧' },
    { key: 'ventilator', name: '通风窗', enabled: false, status: 'idle', icon: '🪟' },
  ]);
  
  const activeCount = computed(() => {
    return devices.value.filter(d => d.enabled).length;
  });
  
  function setDevices(deviceList) {
    deviceList.forEach(d => {
      const device = devices.value.find(dev => dev.key === d.key);
      if (device) {
        device.enabled = d.enabled;
        device.status = d.status;
      }
    });
  }
  
  function toggleDevice(deviceKey) {
    const envStore = useEnvironmentStore();
    envStore.sendMessage({ type: 'toggle_device', deviceKey });
    
    const device = devices.value.find(d => d.key === deviceKey);
    if (device) {
      device.enabled = !device.enabled;
      device.status = device.enabled ? 'running' : 'idle';
    }
  }
  
  async function fetchDevices() {
    try {
      const res = await fetch('/api/devices', { method: 'POST' });
      const data = await res.json();
      if (data.devices) {
        setDevices(data.devices);
      }
    } catch (e) {
      console.error('获取设备状态失败:', e);
    }
  }
  
  return {
    devices,
    activeCount,
    setDevices,
    toggleDevice,
    fetchDevices,
  };
});
