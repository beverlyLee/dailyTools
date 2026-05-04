(function() {
  'use strict';

  let selectionText = '';

  document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    selectionText = selection.toString().trim();
  });

  function extractPageContent() {
    const title = document.title;
    const url = window.location.href;
    
    let mainContent = '';
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = element.innerText;
        if (mainContent.length > 100) break;
      }
    }

    if (!mainContent) {
      mainContent = document.body.innerText;
    }

    const paragraphs = document.querySelectorAll('p');
    let extractedText = '';
    paragraphs.forEach(p => {
      const text = p.innerText.trim();
      if (text.length > 20) {
        extractedText += text + '\n\n';
      }
    });

    return {
      title: title,
      url: url,
      content: extractedText || mainContent,
      description: extractMetaDescription(),
      keywords: extractMetaKeywords()
    };
  }

  function extractMetaDescription() {
    const meta = document.querySelector('meta[name="description"], meta[property="og:description"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function extractMetaKeywords() {
    const meta = document.querySelector('meta[name="keywords"]');
    if (meta) {
      return meta.getAttribute('content').split(',').map(k => k.trim()).filter(k => k);
    }
    return [];
  }

  function createHighlightOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'second-brain-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(99, 102, 241, 0.1);
      pointer-events: none;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  let overlay = null;

  function showCaptureIndicator() {
    if (!overlay) {
      overlay = createHighlightOverlay();
    }
    overlay.style.opacity = '1';
    setTimeout(() => {
      if (overlay) {
        overlay.style.opacity = '0';
      }
    }, 500);
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract-content') {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    }

    if (request.action === 'get-selection') {
      sendResponse({ success: true, text: selectionText });
    }

    if (request.action === 'show-indicator') {
      showCaptureIndicator();
      sendResponse({ success: true });
    }

    return true;
  });

  function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'capture-page' });
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'capture-screenshot' });
      }
    });
  }

  addKeyboardShortcuts();

  window.SecondBrain = {
    extractPageContent,
    getSelection: () => selectionText,
    showCaptureIndicator
  };

})();
