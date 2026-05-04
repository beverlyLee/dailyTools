const BACKEND_URL = 'http://localhost:5001';

chrome.runtime.onInstalled.addListener(() => {
  console.log('智能周报生成器已安装');
  chrome.storage.local.set({
    config: {
      backendUrl: BACKEND_URL,
      openaiModel: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7
    }
  });
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'SCRAPE_CHAT_DATA':
      handleScrapeChatData(request, sender, sendResponse);
      return true;
    case 'GENERATE_REPORT':
      handleGenerateReport(request, sender, sendResponse);
      return true;
    case 'FETCH_GIT_COMMITS':
      handleFetchGitCommits(request, sender, sendResponse);
      return true;
    case 'SUBMIT_FEEDBACK':
      handleSubmitFeedback(request, sender, sendResponse);
      return true;
    case 'GET_CONFIG':
      handleGetConfig(sendResponse);
      return true;
    case 'SAVE_CONFIG':
      handleSaveConfig(request, sendResponse);
      return true;
    default:
      sendResponse({ error: '未知请求类型' });
      return false;
  }
});

async function handleScrapeChatData(request, sender, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return window.__scraper__ ? window.__scraper__.scrape() : null;
      }
    });
    
    if (results[0].result) {
      sendResponse({ success: true, data: results[0].result });
    } else {
      sendResponse({ success: false, error: '未找到适配的内容脚本' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGenerateReport(request, sender, sendResponse) {
  try {
    const config = await chrome.storage.local.get('config');
    const response = await fetch(`${config.config.backendUrl}/api/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: request.context,
        format: request.format || 'markdown',
        includeSections: request.includeSections || ['work_done', 'issues', 'plans']
      })
    });
    const result = await response.json();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleFetchGitCommits(request, sender, sendResponse) {
  try {
    const config = await chrome.storage.local.get('config');
    const response = await fetch(`${config.config.backendUrl}/api/git-commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: request.repoPath,
        since: request.since,
        author: request.author
      })
    });
    const result = await response.json();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSubmitFeedback(request, sender, sendResponse) {
  try {
    const config = await chrome.storage.local.get('config');
    const response = await fetch(`${config.config.backendUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: request.reportId,
        originalReport: request.originalReport,
        modifiedReport: request.modifiedReport,
        feedback: request.feedback
      })
    });
    const result = await response.json();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetConfig(sendResponse) {
  try {
    const config = await chrome.storage.local.get('config');
    sendResponse({ success: true, config: config.config || {} });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveConfig(request, sendResponse) {
  try {
    await chrome.storage.local.set({ config: request.config });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
