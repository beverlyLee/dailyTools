const { ipcRenderer } = require('electron');
const { getLineBasedDiff, getDetailedLineDiff, mergeChange, mergeSingleChange, getCharDiffForLine } = require('./diff');

let leftEditor = null;
let rightEditor = null;
let monaco = null;
let currentDiffResult = null;
let currentDetailedDiff = null;
let leftDecorations = [];
let rightDecorations = [];
let leftGutterWidgets = [];
let rightGutterWidgets = [];
let leftFileName = null;
let rightFileName = null;
let leftFilePath = null;
let rightFilePath = null;

const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
  monaco = window.monaco;
  initEditors();
  initEventListeners();
});

function initEditors() {
  const leftContainer = document.getElementById('editor-left');
  const rightContainer = document.getElementById('editor-right');
  
  monaco.editor.defineTheme('diffTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorLineNumber.foreground': '#858585',
      'editorGutter.background': '#1e1e1e',
    }
  });
  
  monaco.editor.setTheme('diffTheme');
  
  const editorOptions = {
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    guides: {
      bracketPairs: true,
      indentation: true
    }
  };
  
  leftEditor = monaco.editor.create(leftContainer, {
    ...editorOptions,
    language: 'plaintext',
    value: '// 在此输入或打开左侧文本\n// 点击"比较差异"按钮开始比较'
  });
  
  rightEditor = monaco.editor.create(rightContainer, {
    ...editorOptions,
    language: 'plaintext',
    value: '// 在此输入或打开右侧文本\n// 点击"比较差异"按钮开始比较'
  });
  
  leftEditor.onDidChangeModelContent(() => {
    clearDiffHighlights();
    updateDiffStats();
  });
  
  rightEditor.onDidChangeModelContent(() => {
    clearDiffHighlights();
    updateDiffStats();
  });
  
  syncScroll();
}

function syncScroll() {
  let syncing = false;
  
  leftEditor.onDidScrollChange((e) => {
    if (syncing) return;
    syncing = true;
    rightEditor.setScrollPosition(e);
    syncing = false;
  });
  
  rightEditor.onDidScrollChange((e) => {
    if (syncing) return;
    syncing = true;
    leftEditor.setScrollPosition(e);
    syncing = false;
  });
}

function initEventListeners() {
  document.getElementById('btn-open-left').addEventListener('click', () => openFile('left'));
  document.getElementById('btn-open-right').addEventListener('click', () => openFile('right'));
  
  document.getElementById('btn-save-left').addEventListener('click', () => saveFile('left'));
  document.getElementById('btn-save-right').addEventListener('click', () => saveFile('right'));
  
  document.getElementById('btn-clear-left').addEventListener('click', () => clearEditor('left'));
  document.getElementById('btn-clear-right').addEventListener('click', () => clearEditor('right'));
  
  document.getElementById('btn-compare').addEventListener('click', compareFiles);
  
  document.getElementById('btn-save-history').addEventListener('click', saveToHistory);
  document.getElementById('btn-show-history').addEventListener('click', showHistory);
  document.getElementById('btn-close-history').addEventListener('click', hideHistory);
  
  document.getElementById('btn-merge-all-right').addEventListener('click', () => mergeAll('right'));
  document.getElementById('btn-merge-all-left').addEventListener('click', () => mergeAll('left'));
  
  document.getElementById('history-modal').addEventListener('click', (e) => {
    if (e.target.id === 'history-modal') {
      hideHistory();
    }
  });
}

async function openFile(side) {
  try {
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (result) {
      const editor = side === 'left' ? leftEditor : rightEditor;
      editor.setValue(result.content);
      
      if (side === 'left') {
        leftFileName = result.fileName;
        leftFilePath = result.filePath;
        document.getElementById('left-title').textContent = result.fileName;
      } else {
        rightFileName = result.fileName;
        rightFilePath = result.filePath;
        document.getElementById('right-title').textContent = result.fileName;
      }
      
      const lang = detectLanguage(result.fileName);
      monaco.editor.setModelLanguage(editor.getModel(), lang);
      
      clearDiffHighlights();
    }
  } catch (error) {
    console.error('打开文件失败:', error);
  }
}

async function saveFile(side) {
  try {
    const editor = side === 'left' ? leftEditor : rightEditor;
    const content = editor.getValue();
    const defaultPath = side === 'left' ? leftFilePath : rightFilePath;
    
    const result = await ipcRenderer.invoke('save-file-dialog', content, defaultPath);
    if (result) {
      if (side === 'left') {
        leftFileName = result.fileName;
        leftFilePath = result.filePath;
        document.getElementById('left-title').textContent = result.fileName;
      } else {
        rightFileName = result.fileName;
        rightFilePath = result.filePath;
        document.getElementById('right-title').textContent = result.fileName;
      }
      
      const lang = detectLanguage(result.fileName);
      monaco.editor.setModelLanguage(editor.getModel(), lang);
    }
  } catch (error) {
    console.error('保存文件失败:', error);
  }
}

function clearEditor(side) {
  const editor = side === 'left' ? leftEditor : rightEditor;
  editor.setValue('');
  
  if (side === 'left') {
    leftFileName = null;
    leftFilePath = null;
    document.getElementById('left-title').textContent = '左侧文本';
  } else {
    rightFileName = null;
    rightFilePath = null;
    document.getElementById('right-title').textContent = '右侧文本';
  }
  
  monaco.editor.setModelLanguage(editor.getModel(), 'plaintext');
  clearDiffHighlights();
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'json': 'json',
    'md': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sh': 'shell',
    'bat': 'bat',
    'sql': 'sql'
  };
  return langMap[ext] || 'plaintext';
}

function compareFiles() {
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  if (!leftText.trim() && !rightText.trim()) {
    alert('请先在两侧输入或打开文本文件');
    return;
  }
  
  clearDiffHighlights();
  
  currentDiffResult = getLineBasedDiff(leftText, rightText);
  currentDetailedDiff = getDetailedLineDiff(leftText, rightText);
  
  const diffs = dmp.diff_main(leftText, rightText);
  dmp.diff_cleanupSemantic(diffs);
  
  applyDiffHighlights(diffs);
  addMergeButtons();
  updateDiffStats();
  showMergeHint();
}

function applyDiffHighlights(diffs) {
  const leftModel = leftEditor.getModel();
  const rightModel = rightEditor.getModel();
  
  let leftLine = 1;
  let rightLine = 1;
  let leftColumn = 1;
  let rightColumn = 1;
  
  const newLeftDecorations = [];
  const newRightDecorations = [];
  
  for (const diff of diffs) {
    const type = diff[0];
    const text = diff[1];
    const lines = text.split('\n');
    
    if (type === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          rightLine++;
          leftColumn = 1;
          rightColumn = 1;
        }
        leftColumn += lines[i].length;
        rightColumn += lines[i].length;
      }
    } else if (type === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          leftColumn = 1;
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = leftLine;
          const endLine = leftLine;
          const startCol = leftColumn;
          const endCol = leftColumn + lines[i].length;
          
          newLeftDecorations.push({
            range: new monaco.Range(startLine, startCol, endLine, endCol > startCol ? endCol : startCol + 1),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'deletion-decoration',
              glyphMarginClassName: 'gutter-deletion',
              linesDecorationsClassName: 'line-number-deletion'
            }
          });
        }
        
        leftColumn += lines[i].length;
      }
    } else if (type === 1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          rightLine++;
          rightColumn = 1;
        }
        
        if (lines[i].length > 0 || i > 0) {
          const startLine = rightLine;
          const endLine = rightLine;
          const startCol = rightColumn;
          const endCol = rightColumn + lines[i].length;
          
          newRightDecorations.push({
            range: new monaco.Range(startLine, startCol, endLine, endCol > startCol ? endCol : startCol + 1),
            options: {
              isWholeLine: lines[i].length === 0 && i > 0,
              className: 'insertion-decoration',
              glyphMarginClassName: 'gutter-insertion',
              linesDecorationsClassName: 'line-number-insertion'
            }
          });
        }
        
        rightColumn += lines[i].length;
      }
    }
  }
  
  leftDecorations = leftEditor.deltaDecorations(leftDecorations, newLeftDecorations);
  rightDecorations = rightEditor.deltaDecorations(rightDecorations, newRightDecorations);
}

function clearDiffHighlights() {
  if (leftEditor) {
    leftDecorations = leftEditor.deltaDecorations(leftDecorations, []);
    for (const widget of leftGutterWidgets) {
      leftEditor.removeContentWidget(widget);
    }
    leftGutterWidgets = [];
  }
  if (rightEditor) {
    rightDecorations = rightEditor.deltaDecorations(rightDecorations, []);
    for (const widget of rightGutterWidgets) {
      rightEditor.removeContentWidget(widget);
    }
    rightGutterWidgets = [];
  }
  currentDiffResult = null;
  currentDetailedDiff = null;
  document.getElementById('diff-stats').textContent = '';
  hideMergeHint();
}

function updateDiffStats() {
  if (!currentDiffResult) {
    document.getElementById('diff-stats').textContent = '';
    return;
  }
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  const diffs = dmp.diff_main(leftText, rightText);
  dmp.diff_cleanupSemantic(diffs);
  
  let insertions = 0;
  let deletions = 0;
  
  for (const diff of diffs) {
    const type = diff[0];
    const text = diff[1];
    const lineCount = text.split('\n').length - 1 || (text.length > 0 ? 1 : 0);
    
    if (type === 1) {
      insertions += lineCount;
    } else if (type === -1) {
      deletions += lineCount;
    }
  }
  
  let statsText = '';
  if (insertions > 0) {
    statsText += `新增: ${insertions} 行 `;
  }
  if (deletions > 0) {
    statsText += `删除: ${deletions} 行`;
  }
  
  document.getElementById('diff-stats').textContent = statsText.trim() || '无差异';
}

function showMergeHint() {
  document.getElementById('merge-hint').classList.remove('hidden');
  setTimeout(() => {
    hideMergeHint();
  }, 3000);
}

function hideMergeHint() {
  document.getElementById('merge-hint').classList.add('hidden');
}

function addMergeButtons() {
  if (!currentDetailedDiff) return;
  
  const blocks = currentDetailedDiff.blocks;
  
  blocks.forEach((block, blockIndex) => {
    if (block.type === 'equal') return;
    
    if (block.leftLines.length > 0) {
      const startLine = block.leftLines[0].lineNumber;
      const widget = createMergeWidget('left', startLine, blockIndex, block.type);
      leftEditor.addContentWidget(widget);
      leftGutterWidgets.push(widget);
    }
    
    if (block.rightLines.length > 0) {
      const startLine = block.rightLines[0].lineNumber;
      const widget = createMergeWidget('right', startLine, blockIndex, block.type);
      rightEditor.addContentWidget(widget);
      rightGutterWidgets.push(widget);
    }
  });
}

function createMergeWidget(side, lineNumber, blockIndex, blockType) {
  const id = `merge-widget-${side}-${lineNumber}-${Date.now()}`;
  const domNode = document.createElement('div');
  domNode.className = 'merge-widget';
  domNode.style.marginTop = '2px';
  
  const buttonToRight = document.createElement('button');
  buttonToRight.className = 'merge-btn merge-btn-right';
  buttonToRight.title = side === 'left' ? '将此更改合并到右侧' : '将此更改应用到左侧';
  buttonToRight.innerHTML = '→';
  buttonToRight.onclick = (e) => {
    e.stopPropagation();
    mergeSingleBlock(blockIndex, 'right');
  };
  
  const buttonToLeft = document.createElement('button');
  buttonToLeft.className = 'merge-btn merge-btn-left';
  buttonToLeft.title = side === 'right' ? '将此更改合并到左侧' : '将此更改应用到右侧';
  buttonToLeft.innerHTML = '←';
  buttonToLeft.onclick = (e) => {
    e.stopPropagation();
    mergeSingleBlock(blockIndex, 'left');
  };
  
  if (side === 'left') {
    domNode.appendChild(buttonToRight);
  } else {
    domNode.appendChild(buttonToLeft);
  }
  
  return {
    getId: function() { return id; },
    getDomNode: function() { return domNode; },
    getPosition: function() {
      return {
        position: {
          lineNumber: lineNumber + 1,
          column: 1
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.TOP_LEFT]
      };
    }
  };
}

function mergeSingleBlock(blockIndex, direction) {
  if (!currentDetailedDiff) {
    alert('请先比较差异');
    return;
  }
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  const result = mergeSingleChange(direction, blockIndex, leftText, rightText);
  
  if (result.changed) {
    leftEditor.setValue(result.leftText);
    rightEditor.setValue(result.rightText);
    clearDiffHighlights();
    
    const newLeftText = leftEditor.getValue();
    const newRightText = rightEditor.getValue();
    
    currentDiffResult = getLineBasedDiff(newLeftText, newRightText);
    currentDetailedDiff = getDetailedLineDiff(newLeftText, newRightText);
    
    const diffs = dmp.diff_main(newLeftText, newRightText);
    dmp.diff_cleanupSemantic(diffs);
    
    applyDiffHighlights(diffs);
    addMergeButtons();
    updateDiffStats();
  }
}

function mergeAll(direction) {
  if (!currentDiffResult) {
    alert('请先比较差异');
    return;
  }
  
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  if (direction === 'right') {
    rightEditor.setValue(leftText);
  } else {
    leftEditor.setValue(rightText);
  }
  
  clearDiffHighlights();
}

async function saveToHistory() {
  const leftText = leftEditor.getValue();
  const rightText = rightEditor.getValue();
  
  if (!leftText.trim() && !rightText.trim()) {
    alert('没有内容可保存');
    return;
  }
  
  try {
    const id = await ipcRenderer.invoke('save-comparison', {
      leftFileName: leftFileName || '未命名-左侧',
      rightFileName: rightFileName || '未命名-右侧',
      leftContent: leftText,
      rightContent: rightText
    });
    
    if (id) {
      alert('已保存到历史记录');
    } else {
      alert('保存失败');
    }
  } catch (error) {
    console.error('保存历史失败:', error);
    alert('保存失败: ' + error.message);
  }
}

async function showHistory() {
  try {
    const comparisons = await ipcRenderer.invoke('get-comparisons');
    const historyList = document.getElementById('history-list');
    
    if (comparisons.length === 0) {
      historyList.innerHTML = '<div style="text-align: center; color: #858585; padding: 40px;">暂无历史记录</div>';
    } else {
      historyList.innerHTML = comparisons.map(item => `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-info">
            <div class="history-item-files">${item.left_file_name} ↔ ${item.right_file_name}</div>
            <div class="history-item-time">${new Date(item.created_at).toLocaleString('zh-CN')}</div>
          </div>
          <div class="history-item-actions">
            <button class="btn btn-sm" onclick="loadFromHistory(${item.id})">加载</button>
            <button class="btn btn-sm" onclick="deleteFromHistory(${item.id})">删除</button>
          </div>
        </div>
      `).join('');
    }
    
    document.getElementById('history-modal').classList.remove('hidden');
  } catch (error) {
    console.error('获取历史失败:', error);
    alert('获取历史记录失败');
  }
}

function hideHistory() {
  document.getElementById('history-modal').classList.add('hidden');
}

window.loadFromHistory = async function(id) {
  try {
    const comparisons = await ipcRenderer.invoke('get-comparisons');
    const item = comparisons.find(c => c.id === id);
    
    if (item) {
      leftEditor.setValue(item.left_content || '');
      rightEditor.setValue(item.right_content || '');
      
      leftFileName = item.left_file_name;
      rightFileName = item.right_file_name;
      
      document.getElementById('left-title').textContent = item.left_file_name;
      document.getElementById('right-title').textContent = item.right_file_name;
      
      const leftLang = detectLanguage(item.left_file_name);
      const rightLang = detectLanguage(item.right_file_name);
      monaco.editor.setModelLanguage(leftEditor.getModel(), leftLang);
      monaco.editor.setModelLanguage(rightEditor.getModel(), rightLang);
      
      hideHistory();
      clearDiffHighlights();
    }
  } catch (error) {
    console.error('加载历史失败:', error);
    alert('加载失败');
  }
};

window.deleteFromHistory = async function(id) {
  try {
    const confirmed = confirm('确定要删除这条历史记录吗？');
    if (confirmed) {
      await ipcRenderer.invoke('delete-comparison', id);
      showHistory();
    }
  } catch (error) {
    console.error('删除历史失败:', error);
    alert('删除失败');
  }
};
