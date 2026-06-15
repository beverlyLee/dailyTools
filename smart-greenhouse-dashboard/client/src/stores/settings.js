import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('dark');
  const soundEnabled = ref(true);
  const autoRefresh = ref(true);
  
  function initTheme() {
    const savedTheme = localStorage.getItem('greenhouse-theme');
    if (savedTheme) {
      theme.value = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme.value = 'light';
    }
    applyTheme();
  }
  
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value);
    localStorage.setItem('greenhouse-theme', theme.value);
  }
  
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    applyTheme();
  }
  
  function setTheme(newTheme) {
    theme.value = newTheme;
    applyTheme();
  }
  
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
    localStorage.setItem('greenhouse-sound', soundEnabled.value);
  }
  
  function playAlertSound() {
    if (!soundEnabled.value) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('声音播放失败');
    }
  }
  
  function initSettings() {
    initTheme();
    const savedSound = localStorage.getItem('greenhouse-sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
  }
  
  return {
    theme,
    soundEnabled,
    autoRefresh,
    initTheme,
    applyTheme,
    toggleTheme,
    setTheme,
    toggleSound,
    playAlertSound,
    initSettings,
  };
});
