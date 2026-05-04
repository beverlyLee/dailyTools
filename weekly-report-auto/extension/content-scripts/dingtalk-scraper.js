(function() {
  'use strict';

  class DingTalkScraper {
    constructor() {
      this.isObserving = false;
      this.observer = null;
    }

    scrape() {
      const messages = this.extractMessages();
      const conversationInfo = this.extractConversationInfo();
      
      return {
        source: 'dingtalk',
        scrapedAt: new Date().toISOString(),
        conversationInfo,
        messages,
        count: messages.length
      };
    }

    extractConversationInfo() {
      const titleElement = document.querySelector(
        '.conversation-title, ' +
        '[class*="conversation-title"], ' +
        '[class*="chat-title"], ' +
        '[class*="header-title"]'
      );
      
      const memberElements = document.querySelectorAll(
        '[class*="member-avatar"], ' +
        '[class*="group-member"], ' +
        '[class*="chat-member"]'
      );
      
      return {
        conversationTitle: titleElement ? titleElement.textContent.trim() : null,
        memberCount: memberElements.length || null,
        conversationType: this.detectConversationType()
      };
    }

    detectConversationType() {
      const pageUrl = window.location.href;
      if (pageUrl.includes('group') || pageUrl.includes('chatroom')) {
        return 'group';
      }
      if (pageUrl.includes('single') || pageUrl.includes('user')) {
        return 'single';
      }
      
      const memberElements = document.querySelectorAll('[class*="member"], [class*="avatar"]');
      if (memberElements.length > 2) {
        return 'group';
      }
      return 'unknown';
    }

    extractMessages() {
      const messages = [];
      
      const selectors = [
        '.chat-message-item',
        '[class*="chat-message-item"]',
        '[class*="message-item"]',
        '[class*="msg-item"]',
        '.conversation-item'
      ];

      let messageElements = [];
      for (const selector of selectors) {
        messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) break;
      }

      if (messageElements.length === 0) {
        messageElements = this.guessMessageElements();
      }

      messageElements.forEach((element, index) => {
        const message = this.parseMessageElement(element, index);
        if (message && message.content) {
          messages.push(message);
        }
      });

      return messages;
    }

    guessMessageElements() {
      const candidates = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.display === 'flex' || computedStyle.display === 'block') {
          const hasAvatar = element.querySelector('[class*="avatar"], img[src*="avatar"], img[src*="head"]');
          const hasText = element.textContent.trim().length > 5;
          
          if (hasAvatar && hasText) {
            candidates.push(element);
          }
        }
      });
      
      return candidates;
    }

    parseMessageElement(element, index) {
      const sender = this.extractSender(element);
      const content = this.extractContent(element);
      const timestamp = this.extractTimestamp(element);
      const isSelf = this.checkIfSelf(element);
      const messageType = this.detectMessageType(element);

      if (!content && messageType === 'text') {
        return null;
      }

      return {
        id: this.generateMessageId(element, index),
        source: 'dingtalk',
        sender,
        content,
        timestamp: timestamp || this.estimateTimestamp(index),
        isSelf,
        messageType,
        rawHtml: element.outerHTML.substring(0, 500),
        scrapedAt: new Date().toISOString()
      };
    }

    extractSender(element) {
      const senderSelectors = [
        '[class*="sender-name"]',
        '[class*="nickname"]',
        '[class*="user-name"]',
        '[class*="sender"]',
        '.message-sender'
      ];

      for (const selector of senderSelectors) {
        const senderEl = element.querySelector(selector);
        if (senderEl && senderEl.textContent.trim()) {
          return senderEl.textContent.trim();
        }
      }

      const ariaLabel = element.getAttribute('aria-label') || '';
      const labelMatch = ariaLabel.match(/^(.+?)[：:]/);
      if (labelMatch) {
        return labelMatch[1];
      }

      const dataAttrs = ['data-sender', 'data-name', 'data-username'];
      for (const attr of dataAttrs) {
        const value = element.getAttribute(attr);
        if (value) return value;
      }

      return null;
    }

    extractContent(element) {
      const contentSelectors = [
        '[class*="message-content"]',
        '[class*="msg-content"]',
        '[class*="text-content"]',
        '[class*="bubble-content"]',
        '.message-text',
        '[class*="bubble"]'
      ];

      for (const selector of contentSelectors) {
        const contentEl = element.querySelector(selector);
        if (contentEl) {
          const text = contentEl.textContent.trim();
          if (text && text.length > 0) {
            return text;
          }
        }
      }

      const clone = element.cloneNode(true);
      const excludeSelectors = [
        '[class*="avatar"]',
        '[class*="time"]',
        '[class*="sender"]',
        'img[src*="avatar"]',
        'img[src*="head"]'
      ];
      excludeSelectors.forEach(sel => {
        clone.querySelectorAll(sel).forEach(el => el.remove());
      });

      return clone.textContent.trim() || null;
    }

    extractTimestamp(element) {
      const timeSelectors = [
        '[class*="message-time"]',
        '[class*="msg-time"]',
        '[class*="timestamp"]',
        '[class*="time"]',
        '.message-time'
      ];

      for (const selector of timeSelectors) {
        const timeEl = element.querySelector(selector);
        if (timeEl) {
          const timeText = timeEl.textContent.trim();
          if (timeText && this.isTimeString(timeText)) {
            return this.parseTimeString(timeText);
          }
        }
      }

      return null;
    }

    isTimeString(str) {
      return /\d{1,2}:\d{2}/.test(str) || 
             /\d{1,2}:\d{2}:\d{2}/.test(str) ||
             /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str);
    }

    parseTimeString(timeStr) {
      const now = new Date();
      
      const dateTimeMatch = timeStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*(\d{1,2}):(\d{2})?/);
      if (dateTimeMatch) {
        const [, year, month, day, hour, minute] = dateTimeMatch;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute) || 0
        ).toISOString();
      }

      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        const [, hour, minute, second] = timeMatch;
        const date = new Date(now);
        date.setHours(parseInt(hour), parseInt(minute), parseInt(second) || 0);
        
        if (date > now) {
          date.setDate(date.getDate() - 1);
        }
        return date.toISOString();
      }

      const todayMatch = timeStr.match(/今天\s*(\d{1,2}):(\d{2})/);
      if (todayMatch) {
        const [, hour, minute] = todayMatch;
        const date = new Date(now);
        date.setHours(parseInt(hour), parseInt(minute));
        return date.toISOString();
      }

      const yesterdayMatch = timeStr.match(/昨天\s*(\d{1,2}):(\d{2})/);
      if (yesterdayMatch) {
        const [, hour, minute] = yesterdayMatch;
        const date = new Date(now);
        date.setDate(date.getDate() - 1);
        date.setHours(parseInt(hour), parseInt(minute));
        return date.toISOString();
      }

      return now.toISOString();
    }

    estimateTimestamp(index) {
      const now = new Date();
      const baseTime = new Date(now);
      baseTime.setMinutes(baseTime.getMinutes() - index * 5);
      return baseTime.toISOString();
    }

    checkIfSelf(element) {
      const classList = element.className.toLowerCase();
      if (classList.includes('self') || 
          classList.includes('me') || 
          classList.includes('my') ||
          classList.includes('right')) {
        return true;
      }

      const parent = element.parentElement;
      if (parent) {
        const parentClass = parent.className.toLowerCase();
        if (parentClass.includes('self') || parentClass.includes('right')) {
          return true;
        }
      }

      return false;
    }

    detectMessageType(element) {
      const hasImage = element.querySelector('img:not([class*="avatar"])');
      if (hasImage && !element.textContent.trim()) {
        return 'image';
      }

      const hasFile = element.querySelector(
        '[class*="file"], ' +
        '[class*="attachment"], ' +
        '[class*="download"]'
      );
      if (hasFile) {
        return 'file';
      }

      const hasLink = element.querySelector('a[href]');
      if (hasLink && !element.textContent.trim()) {
        return 'link';
      }

      return 'text';
    }

    generateMessageId(element, index) {
      const timestamp = Date.now();
      return `dingtalk_${timestamp}_${index}`;
    }

    startObserving(callback) {
      if (this.isObserving) return;
      
      this.isObserving = true;
      
      const chatContainer = this.findChatContainer();
      if (!chatContainer) {
        console.warn('未找到聊天容器，无法开始监听');
        return;
      }

      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const message = this.parseMessageElement(node, 0);
                if (message && message.content) {
                  callback(message);
                }
              }
            });
          }
        });
      });

      this.observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    }

    stopObserving() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.isObserving = false;
    }

    findChatContainer() {
      const possibleContainers = [
        '[class*="chat-container"]',
        '[class*="message-list"]',
        '[class*="chat-list"]',
        '[class*="conversation-list"]',
        '[class*="chat-messages"]'
      ];

      for (const selector of possibleContainers) {
        const container = document.querySelector(selector);
        if (container) {
          return container;
        }
      }

      return null;
    }
  }

  const scraper = new DingTalkScraper();
  window.__scraper__ = scraper;

  console.log('钉钉数据采集脚本已加载');
})();
