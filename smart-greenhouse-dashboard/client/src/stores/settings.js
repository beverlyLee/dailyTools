import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

let sharedAudioContext = null;
let audioContextResumed = false;

function ensureAudioContext() {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }
  if (sharedAudioContext && !audioContextResumed) {
    sharedAudioContext.resume().then(() => {
      audioContextResumed = true;
    }).catch(() => {});
  }
  return sharedAudioContext;
}

function setupAudioResumeListener() {
  const handler = () => {
    ensureAudioContext();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
    document.removeEventListener('touchstart', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('keydown', handler);
  document.addEventListener('touchstart', handler);
}

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
      const audioContext = ensureAudioContext();
      if (!audioContext) return;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.debug('声音播放失败:', e.message);
    }
  }
  
  function initSettings() {
    initTheme();
    const savedSound = localStorage.getItem('greenhouse-sound');
    if (savedSound !== null) {
      soundEnabled.value = savedSound === 'true';
    }
    setupAudioResumeListener();
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
