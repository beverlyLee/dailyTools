const API_BASE = 'http://localhost:8000/api/v1';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Capture Page to Second Brain',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'capture-selection',
    title: 'Capture Selection to Second Brain',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'capture-screenshot',
    title: 'Capture Screenshot to Second Brain',
    contexts: ['page']
  });

  chrome.storage.local.set({
    apiUrl: API_BASE,
    autoTag: true,
    tags: []
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  try {
    switch (info.menuItemId) {
      case 'capture-page':
        await capturePage(tab);
        break;
      case 'capture-selection':
        await captureSelection(tab, info.selectionText);
        break;
      case 'capture-screenshot':
        await captureScreenshot(tab);
        break;
    }
  } catch (error) {
    console.error('Capture failed:', error);
    showNotification('Capture Failed', error.message || 'Unknown error occurred');
  }
});

async function capturePage(tab) {
  const [tabInfo] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      content: document.body.innerText,
      url: window.location.href
    })
  });

  const data = {
    title: tabInfo.result.title || tab.title,
    content: tabInfo.result.content,
    url: tabInfo.result.url || tab.url,
    document_type: 'web_page',
    tags: []
  };

  await sendToBackend(data);
  showNotification('Page Captured', 'Page saved to your knowledge base');
}

async function captureSelection(tab, selectionText) {
  const [tabInfo] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      url: window.location.href
    })
  });

  const data = {
    title: `Selection: ${tabInfo.result.title.slice(0, 50)}...`,
    content: selectionText,
    url: tabInfo.result.url || tab.url,
    document_type: 'note',
    tags: ['selection']
  };

  await sendToBackend(data);
  showNotification('Selection Captured', 'Selected text saved to your knowledge base');
}

async function captureScreenshot(tab) {
  const screenshotData = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png'
  });

  const [tabInfo] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      content: document.body.innerText,
      url: window.location.href
    })
  });

  const data = {
    title: tabInfo.result.title || tab.title,
    content: tabInfo.result.content,
    url: tabInfo.result.url || tab.url,
    document_type: 'web_page',
    tags: ['screenshot'],
    screenshot: screenshotData,
    screenshot_filename: `screenshot_${Date.now()}.png`
  };

  await sendToBackend(data);
  showNotification('Screenshot Captured', 'Screenshot saved to your knowledge base');
}

async function sendToBackend(data) {
  const settings = await chrome.storage.local.get(['apiUrl']);
  const apiUrl = settings.apiUrl || API_BASE;

  const response = await fetch(`${apiUrl}/documents/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        await capturePage(tabs[0]);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  if (request.action === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        await captureScreenshot(tabs[0]);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  if (request.action === 'get-stats') {
    (async () => {
      try {
        const settings = await chrome.storage.local.get(['apiUrl']);
        const apiUrl = settings.apiUrl || API_BASE;
        
        const response = await fetch(`${apiUrl}/stats`);
        if (response.ok) {
          const stats = await response.json();
          sendResponse({ success: true, stats });
        } else {
          sendResponse({ success: false, error: 'Failed to fetch stats' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'save-settings') {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'get-settings') {
    chrome.storage.local.get(null, (settings) => {
      sendResponse({ success: true, settings });
    });
    return true;
  }
});
