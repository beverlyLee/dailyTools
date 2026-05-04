import './style.css';
import { WhiteboardApp } from './lib/WhiteboardApp';
import type { Color, BrushType, StrokeStyle } from './types';

let whiteboard: WhiteboardApp | null = null;
let statusIndicator: HTMLElement | null = null;

interface ToolbarConfig {
  colors: Color[];
  lineWidths: number[];
  brushTypes: { type: BrushType; label: string; icon: string }[];
  strokeStyles: { style: StrokeStyle; label: string; icon: string }[];
}

const DEFAULT_CONFIG: ToolbarConfig = {
  colors: [
    { r: 0, g: 0, b: 0, a: 1 },
    { r: 239, g: 68, b: 68, a: 1 },
    { r: 34, g: 197, b: 94, a: 1 },
    { r: 59, g: 130, b: 246, a: 1 },
    { r: 168, g: 85, b: 247, a: 1 },
    { r: 249, g: 115, b: 22, a: 1 }
  ],
  lineWidths: [2, 4, 6, 10, 16],
  brushTypes: [
    { type: 'pencil', label: 'Pencil', icon: '✏' },
    { type: 'pen', label: 'Pen', icon: '🖊' },
    { type: 'marker', label: 'Marker', icon: '🖌' },
    { type: 'eraser', label: 'Eraser', icon: '⌫' }
  ],
  strokeStyles: [
    { style: 'solid', label: 'Solid', icon: '──' },
    { style: 'dashed', label: 'Dashed', icon: '- - -' },
    { style: 'dotted', label: 'Dotted', icon: '· · ·' }
  ]
};

function initializeApp(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || generateRoomId();

  updateUrl(roomId);

  whiteboard = new WhiteboardApp({
    canvasId: 'whiteboard',
    roomId: roomId,
    serverUrl: getServerUrl(),
    autoConnect: true,
    autoSave: true
  });

  initializeToolbar();
  initializeStatusIndicator();
  initializeZoomControls();
  initializeRoomInfo(roomId);
  initializeImageUpload();
  initializePasteImage();

  whiteboard.initialize().catch(handleInitError);
}

function generateRoomId(): string {
  return 'room_' + Math.random().toString(36).substring(2, 10);
}

function updateUrl(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.history.replaceState({}, '', url.toString());
}

function getServerUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port;

  if (port === '5173') {
    return `${protocol}//localhost:8080/ws`;
  }

  if (port) {
    return `${protocol}//${host}:${port}/ws`;
  }

  return `${protocol}//${host}/ws`;
}

function initializeToolbar(): void {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar || !whiteboard) return;

  const brushContainer = document.createElement('div');
  brushContainer.className = 'brush-picker';

  DEFAULT_CONFIG.brushTypes.forEach((brush, index) => {
    const brushBtn = document.createElement('button');
    brushBtn.className = 'brush-btn' + (index === 0 ? ' active' : '');
    brushBtn.innerHTML = `<span class="brush-icon">${brush.icon}</span>`;
    brushBtn.title = brush.label;
    brushBtn.dataset.brushType = brush.type;
    brushBtn.addEventListener('click', () => selectBrushType(brushBtn, brush.type));
    brushContainer.appendChild(brushBtn);
  });

  toolbar.appendChild(brushContainer);

  const divider0 = document.createElement('div');
  divider0.className = 'toolbar-divider';
  toolbar.appendChild(divider0);

  const strokeStyleContainer = document.createElement('div');
  strokeStyleContainer.className = 'stroke-style-picker';

  DEFAULT_CONFIG.strokeStyles.forEach((style, index) => {
    const styleBtn = document.createElement('button');
    styleBtn.className = 'stroke-style-btn' + (index === 0 ? ' active' : '');
    styleBtn.innerHTML = `<span class="stroke-sample ${style.style}"></span>`;
    styleBtn.title = style.label;
    styleBtn.dataset.strokeStyle = style.style;
    styleBtn.addEventListener('click', () => selectStrokeStyle(styleBtn, style.style));
    strokeStyleContainer.appendChild(styleBtn);
  });

  toolbar.appendChild(strokeStyleContainer);

  const divider1 = document.createElement('div');
  divider1.className = 'toolbar-divider';
  toolbar.appendChild(divider1);

  const colorContainer = document.createElement('div');
  colorContainer.className = 'color-picker';

  DEFAULT_CONFIG.colors.forEach((color, index) => {
    const colorBtn = document.createElement('button');
    colorBtn.className = 'color-btn' + (index === 0 ? ' active' : '');
    colorBtn.style.backgroundColor = colorToHex(color);
    colorBtn.dataset.color = JSON.stringify(color);
    colorBtn.addEventListener('click', () => selectColor(colorBtn, color));
    colorContainer.appendChild(colorBtn);
  });

  toolbar.appendChild(colorContainer);

  const divider2 = document.createElement('div');
  divider2.className = 'toolbar-divider';
  toolbar.appendChild(divider2);

  const widthContainer = document.createElement('div');
  widthContainer.className = 'width-picker';

  DEFAULT_CONFIG.lineWidths.forEach((width, index) => {
    const widthBtn = document.createElement('button');
    widthBtn.className = 'width-btn' + (index === 1 ? ' active' : '');
    widthBtn.textContent = width.toString();
    widthBtn.dataset.width = width.toString();
    widthBtn.addEventListener('click', () => selectWidth(widthBtn, width));
    widthContainer.appendChild(widthBtn);
  });

  toolbar.appendChild(widthContainer);

  const divider3 = document.createElement('div');
  divider3.className = 'toolbar-divider';
  toolbar.appendChild(divider3);

  const imageBtn = document.createElement('button');
  imageBtn.className = 'tool-btn';
  imageBtn.innerHTML = '<span class="tool-icon">🖼</span>';
  imageBtn.title = 'Insert Image';
  imageBtn.id = 'insert-image-btn';
  toolbar.appendChild(imageBtn);

  const divider4 = document.createElement('div');
  divider4.className = 'toolbar-divider';
  toolbar.appendChild(divider4);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'tool-btn danger';
  clearBtn.innerHTML = '<span class="tool-icon">🗑</span>';
  clearBtn.title = 'Clear Canvas';
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear the canvas? This cannot be undone.')) {
      whiteboard?.clearCanvas();
    }
  });
  toolbar.appendChild(clearBtn);
}

function selectBrushType(button: HTMLButtonElement, brushType: BrushType): void {
  document.querySelectorAll('.brush-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  whiteboard?.setBrushType(brushType);
}

function selectStrokeStyle(button: HTMLButtonElement, style: StrokeStyle): void {
  document.querySelectorAll('.stroke-style-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  whiteboard?.setStrokeStyle(style);
}

function selectColor(button: HTMLButtonElement, color: Color): void {
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  whiteboard?.setColor(color);
}

function selectWidth(button: HTMLButtonElement, width: number): void {
  document.querySelectorAll('.width-btn').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  whiteboard?.setLineWidth(width);
}

function colorToHex(color: Color): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function initializeStatusIndicator(): void {
  statusIndicator = document.getElementById('status-indicator');
  if (!statusIndicator) return;

  window.addEventListener('whiteboard-status', (e: Event) => {
    const customEvent = e as CustomEvent;
    updateStatus(customEvent.detail.status, customEvent.detail.message);
  });

  updateStatus('connecting');
}

function updateStatus(status: string, message?: string): void {
  if (!statusIndicator) return;

  statusIndicator.className = `status-${status}`;

  let statusText = '';
  switch (status) {
    case 'connected':
      statusText = '● Online';
      statusIndicator.style.color = '#22c55e';
      break;
    case 'disconnected':
      statusText = '○ Offline';
      statusIndicator.style.color = '#6b7280';
      break;
    case 'connecting':
      statusText = '◐ Connecting...';
      statusIndicator.style.color = '#f59e0b';
      break;
    case 'error':
      statusText = '✗ Error';
      statusIndicator.style.color = '#ef4444';
      break;
    default:
      statusText = status;
  }

  statusIndicator.textContent = statusText;
  if (message) {
    statusIndicator.title = message;
  }
}

function initializeZoomControls(): void {
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomReset = document.getElementById('zoom-reset');
  const zoomLevel = document.getElementById('zoom-level');

  zoomIn?.addEventListener('click', () => {
    whiteboard?.zoomIn();
    updateZoomDisplay();
  });

  zoomOut?.addEventListener('click', () => {
    whiteboard?.zoomOut();
    updateZoomDisplay();
  });

  zoomReset?.addEventListener('click', () => {
    whiteboard?.resetViewport();
    updateZoomDisplay();
  });

  function updateZoomDisplay(): void {
    if (zoomLevel && whiteboard) {
      const zoom = Math.round(whiteboard.getViewportZoom() * 100);
      zoomLevel.textContent = `${zoom}%`;
    }
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setTimeout(updateZoomDisplay, 50);
    }
  }, { passive: false });
}

function initializeRoomInfo(roomId: string): void {
  const roomCode = document.getElementById('room-code');
  const shareBtn = document.getElementById('share-btn');
  const copyBtn = document.getElementById('copy-btn');

  if (roomCode) {
    roomCode.textContent = roomId;
  }

  copyBtn?.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('success');
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('success');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  });

  shareBtn?.addEventListener('click', async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Collaborative Whiteboard',
          text: `Join my whiteboard room: ${roomId}`,
          url: url
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      copyBtn?.click();
    }
  });
}

function initializeImageUpload(): void {
  const imageBtn = document.getElementById('insert-image-btn');
  if (!imageBtn) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.id = 'image-file-input';
  document.body.appendChild(fileInput);

  imageBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !whiteboard) return;

    const canvas = whiteboard.getCanvas();
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    try {
      await whiteboard.insertImageFromFile(file, centerX, centerY);
    } catch (err) {
      console.error('Failed to insert image:', err);
    }

    fileInput.value = '';
  });
}

function initializePasteImage(): void {
  document.addEventListener('paste', async (e) => {
    if (!whiteboard) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        const canvas = whiteboard.getCanvas();
        if (!canvas) continue;

        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        try {
          await whiteboard.insertImageFromFile(file, centerX, centerY);
        } catch (err) {
          console.error('Failed to paste image:', err);
        }

        break;
      }
    }
  });
}

function handleInitError(error: Error): void {
  console.error('Failed to initialize whiteboard:', error);
  updateStatus('error', error.message);
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('beforeunload', () => {
  whiteboard?.destroy();
});
