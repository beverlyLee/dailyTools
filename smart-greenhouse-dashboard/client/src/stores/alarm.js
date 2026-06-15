import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAlarmStore = defineStore('alarm', () => {
  const alarms = ref([]);
  const filterDate = ref('');
  const filterLevel = ref('');
  
  const filteredAlarms = computed(() => {
    let result = [...alarms.value];
    
    if (filterDate.value) {
      result = result.filter(a => a.date === filterDate.value);
    }
    
    if (filterLevel.value) {
      result = result.filter(a => a.level === filterLevel.value);
    }
    
    return result;
  });
  
  const warningCount = computed(() => {
    return alarms.value.filter(a => a.level === 'warning').length;
  });
  
  const infoCount = computed(() => {
    return alarms.value.filter(a => a.level === 'info').length;
  });
  
  const todayCount = computed(() => {
    const today = new Date().toLocaleDateString('zh-CN');
    return alarms.value.filter(a => a.date === today).length;
  });
  
  function setAlarms(alarmList) {
    alarms.value = alarmList;
  }
  
  function addAlarm(alarm) {
    if (!alarms.value.find(a => a.id === alarm.id)) {
      alarms.value.unshift(alarm);
    }
  }
  
  function setFilterDate(date) {
    filterDate.value = date;
  }
  
  function setFilterLevel(level) {
    filterLevel.value = level;
  }
  
  async function fetchAlarms(date = '') {
    try {
      let url = '/api/alarms';
      if (date) {
        url += `?date=${encodeURIComponent(date)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.alarms) {
        alarms.value = data.alarms;
      }
    } catch (e) {
      console.error('获取告警日志失败:', e);
    }
  }
  
  function exportAlarms(date = '') {
    let url = '/api/alarms/export';
    if (date) {
      url += `?date=${encodeURIComponent(date)}`;
    }
    window.open(url, '_blank');
  }
  
  return {
    alarms,
    filterDate,
    filterLevel,
    filteredAlarms,
    warningCount,
    infoCount,
    todayCount,
    setAlarms,
    addAlarm,
    setFilterDate,
    setFilterLevel,
    fetchAlarms,
    exportAlarms,
  };
});
