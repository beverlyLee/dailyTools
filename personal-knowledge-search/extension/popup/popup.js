(function() {
  'use strict';

  const capturePageBtn = document.getElementById('capture-page-btn');
  const captureScreenshotBtn = document.getElementById('capture-screenshot-btn');
  const captureSelectionBtn = document.getElementById('capture-selection-btn');
  const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  
  const settingsPanel = document.getElementById('settings-panel');
  const settingsArrow = document.getElementById('settings-arrow');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const successText = document.getElementById('success-text');
  const errorText = document.getElementById('error-text');
  
  const apiUrlInput = document.getElementById('api-url');
  const defaultTagsInput = document.getElementById('default-tags');
  
  const selectionSection = document.getElementById('selection-section');
  const selectionPreview = document.getElementById('selection-preview');
  
  const statsSection = document.getElementById('stats-section');
  const statDocuments = document.getElementById('stat-documents');
  const statVectors = document.getElementById('stat-vectors');
  const statCards = document.getElementById('stat-cards');

  let settingsOpen = false;

  async function init() {
    await loadSettings();
    await checkSelection();
    await loadStats();
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get-settings' }, (response) => {
        if (response && response.success && response.settings) {
          if (response.settings.apiUrl) {
            apiUrlInput.value = response.settings.apiUrl;
          }
          if (response.settings.tags) {
            defaultTagsInput.value = response.settings.tags.join(', ');
          }
        }
        resolve();
      });
    });
  }

  async function checkSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { action: 'get-selection' }, (response) => {
        if (response && response.success && response.text) {
          selectionPreview.textContent = response.text.length > 200 
            ? response.text.slice(0, 200) + '...' 
            : response.text;
          selectionSection.classList.remove('hidden');
        }
      });
    } catch (error) {
      console.log('No selection available');
    }
  }

  async function loadStats() {
    try {
      chrome.runtime.sendMessage({ action: 'get-stats' }, (response) => {
        if (response && response.success && response.stats) {
          const stats = response.stats;
          statDocuments.textContent = stats.documents?.count || 0;
          statVectors.textContent = stats.vectors?.count || 0;
          
          const cardsDue = (stats.cards?.new || 0) + 
                          (stats.cards?.learning || 0) + 
                          (stats.cards?.review || 0);
          statCards.textContent = cardsDue;
          
          statsSection.classList.remove('hidden');
        }
      });
    } catch (error) {
      console.log('Could not load stats:', error);
    }
  }

  function showLoading(text) {
    loadingText.textContent = text || 'Processing...';
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoading() {
    loadingOverlay.classList.add('hidden');
  }

  function showSuccess(message) {
    successText.textContent = message;
    successMessage.classList.remove('hidden');
    setTimeout(() => {
      successMessage.classList.add('hidden');
    }, 3000);
  }

  function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
      errorMessage.classList.add('hidden');
    }, 3000);
  }

  capturePageBtn.addEventListener('click', async () => {
    showLoading('Capturing page...');
    
    chrome.runtime.sendMessage({ action: 'capture-page' }, (response) => {
      hideLoading();
      if (response && response.success) {
        showSuccess('Page captured successfully!');
        loadStats();
      } else {
        showError(response?.error || 'Failed to capture page');
      }
    });
  });

  captureScreenshotBtn.addEventListener('click', async () => {
    showLoading('Capturing screenshot...');
    
    chrome.runtime.sendMessage({ action: 'capture-screenshot' }, (response) => {
      hideLoading();
      if (response && response.success) {
        showSuccess('Screenshot captured successfully!');
        loadStats();
      } else {
        showError(response?.error || 'Failed to capture screenshot');
      }
    });
  });

  captureSelectionBtn.addEventListener('click', async () => {
    showLoading('Capturing selection...');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { action: 'get-selection' }, async (response) => {
        if (response && response.success && response.text) {
          const settings = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'get-settings' }, (r) => {
              resolve(r?.settings || {});
            });
          });

          const apiUrl = settings.apiUrl || 'http://localhost:8000/api/v1';
          
          const pageInfo = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: 'extract-content' }, (r) => {
              resolve(r?.content || { title: document.title, url: tab.url });
            });
          });

          const tags = ['selection'];
          if (settings.tags && settings.tags.length > 0) {
            tags.push(...settings.tags);
          }

          const data = {
            title: `Selection: ${(pageInfo.title || 'Page').slice(0, 50)}...`,
            content: response.text,
            url: pageInfo.url || tab.url,
            document_type: 'note',
            tags: tags
          };

          try {
            const res = await fetch(`${apiUrl}/documents/capture`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });

            hideLoading();
            if (res.ok) {
              showSuccess('Selection captured successfully!');
              loadStats();
            } else {
              const error = await res.json().catch(() => ({}));
              showError(error.detail || 'Failed to capture selection');
            }
          } catch (error) {
            hideLoading();
            showError('Connection failed. Is the backend running?');
          }
        } else {
          hideLoading();
          showError('No text selected');
        }
      });
    } catch (error) {
      hideLoading();
      showError('Failed to capture selection');
    }
  });

  toggleSettingsBtn.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    if (settingsOpen) {
      settingsPanel.classList.remove('hidden');
      settingsArrow.style.transform = 'rotate(180deg)';
    } else {
      settingsPanel.classList.add('hidden');
      settingsArrow.style.transform = 'rotate(0deg)';
    }
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      apiUrl: apiUrlInput.value.trim() || 'http://localhost:8000/api/v1',
      tags: defaultTagsInput.value.split(',').map(t => t.trim()).filter(t => t)
    };

    chrome.runtime.sendMessage({ action: 'save-settings', settings }, (response) => {
      if (response && response.success) {
        showSuccess('Settings saved!');
        loadStats();
      } else {
        showError('Failed to save settings');
      }
    });
  });

  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
    window.close();
  });

  document.addEventListener('DOMContentLoaded', init);
})();
