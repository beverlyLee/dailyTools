let testTextEditor;
let currentMatches = [];
let debounceTimer;
let patterns = [];
let editingPatternId = null;

document.addEventListener('DOMContentLoaded', () => {
  initMonacoEditor();
  initEventListeners();
  loadPatterns();
});

function initMonacoEditor() {
  require(['vs/editor/editor.main'], function() {
    const editorContainer = document.getElementById('test-text-editor');
    
    monaco.languages.register({ id: 'plaintext' });
    
    testTextEditor = monaco.editor.create(editorContainer, {
      value: '在这里输入测试文本...\n\n例如：\n联系邮箱：test@example.com\n手机号：13812345678\n网站：https://www.example.com\n日期：2024-01-15',
      language: 'plaintext',
      theme: 'vs-dark',
      minimap: { enabled: false },
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, monospace',
      wordWrap: 'on',
      automaticLayout: true
    });

    testTextEditor.onDidChangeModelContent(() => {
      debounceMatch();
    });

    window.addEventListener('resize', () => {
      testTextEditor.layout();
    });
  });
}

function initEventListeners() {
  const regexInput = document.getElementById('regex-input');
  regexInput.addEventListener('input', () => {
    updateFlagsDisplay();
    debounceMatch();
  });

  const flagCheckboxes = ['flag-g', 'flag-i', 'flag-m', 'flag-s'];
  flagCheckboxes.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      updateFlagsDisplay();
      debounceMatch();
    });
  });

  document.getElementById('toggle-library').addEventListener('click', () => {
    document.getElementById('library-panel').classList.toggle('open');
  });

  document.getElementById('close-library').addEventListener('click', () => {
    document.getElementById('library-panel').classList.remove('open');
  });

  document.getElementById('save-to-library').addEventListener('click', () => {
    openAddPatternModal();
  });

  document.getElementById('add-new-pattern').addEventListener('click', () => {
    openAddPatternModal();
  });

  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  document.getElementById('save-pattern').addEventListener('click', savePattern);

  document.getElementById('library-search').addEventListener('input', filterPatterns);
  document.getElementById('library-category').addEventListener('change', filterPatterns);

  document.getElementById('enable-replace').addEventListener('change', toggleReplaceSection);
  document.getElementById('replace-input').addEventListener('input', debounceMatch);
}

function updateFlagsDisplay() {
  let flags = '';
  if (document.getElementById('flag-g').checked) flags += 'g';
  if (document.getElementById('flag-i').checked) flags += 'i';
  if (document.getElementById('flag-m').checked) flags += 'm';
  if (document.getElementById('flag-s').checked) flags += 's';
  
  document.getElementById('regex-flags-display').textContent = flags || '';
}

function getFlags() {
  let flags = '';
  if (document.getElementById('flag-g').checked) flags += 'g';
  if (document.getElementById('flag-i').checked) flags += 'i';
  if (document.getElementById('flag-m').checked) flags += 'm';
  if (document.getElementById('flag-s').checked) flags += 's';
  return flags;
}

function debounceMatch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    performMatch();
  }, 150);
}

function performMatch() {
  const pattern = document.getElementById('regex-input').value;
  const flags = getFlags();
  const testText = testTextEditor.getValue();

  clearHighlights();
  currentMatches = [];

  if (!pattern) {
    updateMatchInfo(0);
    updateExplanation('');
    updateReplaceResult('');
    return;
  }

  try {
    const regex = new RegExp(pattern, flags);
    const matches = [];
    let match;

    if (flags.includes('g')) {
      while ((match = regex.exec(testText)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1)
        });
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      match = regex.exec(testText);
      if (match) {
        matches.push({
          text: match[0],
          index: match.index,
          groups: match.slice(1)
        });
      }
    }

    currentMatches = matches;
    highlightMatches(matches);
    updateMatchInfo(matches.length);
    updateExplanation(pattern);

    if (document.getElementById('enable-replace').checked) {
      const replaceText = document.getElementById('replace-input').value;
      const result = testText.replace(regex, replaceText);
      updateReplaceResult(result);
    }
  } catch (error) {
    updateMatchInfo(-1, error.message);
    updateExplanation('');
  }
}

function highlightMatches(matches) {
  const decorations = matches.map((match, index) => {
    const startPos = testTextEditor.getModel().getPositionAt(match.index);
    const endPos = testTextEditor.getModel().getPositionAt(match.index + match.text.length);
    
    return {
      range: new monaco.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      ),
      options: {
        inlineClassName: 'match-highlight',
        className: 'match-highlight-block'
      }
    };
  });

  monaco.editor.defineTheme('regex-theme', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.matchHighlight': '#FFD70080',
      'editor.matchHighlightBorder': '#FFD700'
    }
  });

  testTextEditor.createDecorationsCollection(decorations);
}

function clearHighlights() {
  testTextEditor.createDecorationsCollection([]);
}

function updateMatchInfo(count, error = null) {
  const matchCountEl = document.getElementById('match-count');
  const matchDetailsEl = document.getElementById('match-details');

  if (error) {
    matchCountEl.textContent = '正则表达式错误';
    matchCountEl.style.color = '#f14c4c';
    matchDetailsEl.textContent = error;
  } else if (count === 0) {
    matchCountEl.textContent = '匹配: 0';
    matchCountEl.style.color = '#858585';
    matchDetailsEl.textContent = '';
  } else {
    matchCountEl.textContent = `匹配: ${count}`;
    matchCountEl.style.color = '#4ec9b0';
    matchDetailsEl.textContent = currentMatches.length > 0 
      ? `第一个匹配: "${currentMatches[0].text}"` 
      : '';
  }
}

function updateExplanation(pattern) {
  const explanationEl = document.getElementById('explanation-content');
  
  if (!pattern) {
    explanationEl.innerHTML = '<p class="placeholder">输入正则表达式后，这里将显示通俗易懂的解释...</p>';
    return;
  }

  const explanation = explainRegex(pattern);
  
  if (explanation.length === 0) {
    explanationEl.innerHTML = '<p class="placeholder">无法解析此正则表达式...</p>';
    return;
  }

  let html = '';
  explanation.forEach(item => {
    html += `
      <div class="explanation-item">
        <span class="explanation-token">${escapeHtml(item.token)}</span>
        <span class="explanation-text">${item.explanation}</span>
      </div>
    `;
  });
  
  explanationEl.innerHTML = html;
}

function explainRegex(pattern) {
  const explanations = [];
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];
    const nextChar = pattern[i + 1];

    if (char === '\\' && nextChar) {
      const escapeSeq = char + nextChar;
      const explanation = getEscapeSequenceExplanation(nextChar);
      if (explanation) {
        explanations.push({ token: escapeSeq, explanation });
      } else {
        explanations.push({ token: escapeSeq, explanation: `字面字符 "${nextChar}"` });
      }
      i += 2;
      continue;
    }

    if (char === '.') {
      explanations.push({ token: '.', explanation: '匹配除换行符以外的任意单个字符' });
      i++;
      continue;
    }

    if (char === '*') {
      explanations.push({ token: '*', explanation: '匹配前面的字符 0 次或多次' });
      i++;
      continue;
    }

    if (char === '+') {
      explanations.push({ token: '+', explanation: '匹配前面的字符 1 次或多次' });
      i++;
      continue;
    }

    if (char === '?') {
      if (nextChar && ['*', '+', '?', '{'].includes(nextChar)) {
        explanations.push({ token: '?', explanation: '使前面的量词变为非贪婪模式' });
      } else {
        explanations.push({ token: '?', explanation: '匹配前面的字符 0 次或 1 次' });
      }
      i++;
      continue;
    }

    if (char === '^') {
      explanations.push({ token: '^', explanation: '匹配字符串的开头' });
      i++;
      continue;
    }

    if (char === '$') {
      explanations.push({ token: '$', explanation: '匹配字符串的结尾' });
      i++;
      continue;
    }

    if (char === '|') {
      explanations.push({ token: '|', explanation: '或操作，匹配左边或右边的表达式' });
      i++;
      continue;
    }

    if (char === '(') {
      if (nextChar === '?') {
        if (pattern[i + 2] === ':') {
          explanations.push({ token: '(?:', explanation: '非捕获分组，用于分组但不捕获匹配内容' });
          i += 3;
          continue;
        } else if (pattern[i + 2] === '=') {
          explanations.push({ token: '(?=', explanation: '正向先行断言，匹配后面跟随指定内容的位置' });
          i += 3;
          continue;
        } else if (pattern[i + 2] === '!') {
          explanations.push({ token: '(?!', explanation: '负向先行断言，匹配后面不跟随指定内容的位置' });
          i += 3;
          continue;
        } else if (pattern[i + 2] === '<') {
          if (pattern[i + 3] === '=') {
            explanations.push({ token: '(?<=', explanation: '正向后行断言，匹配前面是指定内容的位置' });
            i += 4;
            continue;
          } else if (pattern[i + 3] === '!') {
            explanations.push({ token: '(?<!', explanation: '负向后行断言，匹配前面不是指定内容的位置' });
            i += 4;
            continue;
          }
        }
      }
      explanations.push({ token: '(', explanation: '开始一个捕获分组' });
      i++;
      continue;
    }

    if (char === ')') {
      explanations.push({ token: ')', explanation: '结束分组' });
      i++;
      continue;
    }

    if (char === '[') {
      let endBracket = i + 1;
      while (endBracket < pattern.length && pattern[endBracket] !== ']') {
        if (pattern[endBracket] === '\\') endBracket++;
        endBracket++;
      }
      const charClass = pattern.substring(i, endBracket + 1);
      explanations.push({ 
        token: charClass, 
        explanation: `字符类，匹配方括号中的任意一个字符` 
      });
      i = endBracket + 1;
      continue;
    }

    if (char === '{') {
      let endBrace = i + 1;
      while (endBrace < pattern.length && pattern[endBrace] !== '}') {
        endBrace++;
      }
      const quantifier = pattern.substring(i, endBrace + 1);
      
      const match = quantifier.match(/\{(\d+)(?:,(\d*))?\}/);
      if (match) {
        const min = match[1];
        const max = match[2];
        if (max === undefined) {
          explanations.push({ token: quantifier, explanation: `精确匹配前面的字符 ${min} 次` });
        } else if (max === '') {
          explanations.push({ token: quantifier, explanation: `匹配前面的字符至少 ${min} 次` });
        } else {
          explanations.push({ token: quantifier, explanation: `匹配前面的字符 ${min} 到 ${max} 次` });
        }
      } else {
        explanations.push({ token: quantifier, explanation: '量词，指定匹配次数' });
      }
      i = endBrace + 1;
      continue;
    }

    explanations.push({ token: char, explanation: `字面字符 "${char}"` });
    i++;
  }

  return explanations;
}

function getEscapeSequenceExplanation(char) {
  const escapeMap = {
    'd': '匹配任意数字 [0-9]',
    'D': '匹配任意非数字 [^0-9]',
    'w': '匹配任意单词字符 [a-zA-Z0-9_]',
    'W': '匹配任意非单词字符 [^a-zA-Z0-9_]',
    's': '匹配任意空白字符 (空格、制表符、换行符等)',
    'S': '匹配任意非空白字符',
    'b': '匹配单词边界',
    'B': '匹配非单词边界',
    'n': '匹配换行符',
    't': '匹配制表符 (Tab)',
    'r': '匹配回车符',
    'f': '匹配换页符',
    'v': '匹配垂直制表符',
    '0': '匹配空字符',
    'c': '控制字符 (后跟字母)',
    'x': '十六进制字符 (后跟两位数字)',
    'u': 'Unicode 字符 (后跟四位数字)'
  };
  return escapeMap[char] || null;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleReplaceSection() {
  const enabled = document.getElementById('enable-replace').checked;
  const replaceInputs = document.querySelector('.replace-inputs');
  replaceInputs.style.display = enabled ? 'flex' : 'none';
  
  if (enabled) {
    debounceMatch();
  }
}

function updateReplaceResult(result) {
  const resultEl = document.querySelector('#replace-result-preview code');
  resultEl.textContent = result;
}

async function loadPatterns() {
  try {
    patterns = await window.electronAPI.getAllPatterns();
    renderPatterns(patterns);
    updateCategoryFilter();
  } catch (error) {
    console.error('Failed to load patterns:', error);
    document.getElementById('library-list').innerHTML = 
      '<div class="loading">加载失败，请检查数据库连接</div>';
  }
}

function updateCategoryFilter() {
  const categories = new Set(['all']);
  patterns.forEach(p => {
    if (p.category) categories.add(p.category);
  });
  
  const select = document.getElementById('library-category');
  select.innerHTML = '';
  
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat === 'all' ? '所有分类' : cat;
    select.appendChild(option);
  });
}

function renderPatterns(patternsToRender) {
  const listEl = document.getElementById('library-list');
  
  if (patternsToRender.length === 0) {
    listEl.innerHTML = '<div class="loading">暂无保存的正则表达式</div>';
    return;
  }

  let html = '';
  patternsToRender.forEach(pattern => {
    html += `
      <div class="pattern-item" data-id="${pattern.id}">
        <div class="pattern-name">${escapeHtml(pattern.name)}</div>
        <div class="pattern-pattern">/${escapeHtml(pattern.pattern)}/${pattern.flags || ''}</div>
        <div class="pattern-category">${escapeHtml(pattern.category || '常规')}</div>
        <div class="pattern-actions">
          <button class="btn btn-secondary btn-use-pattern" data-id="${pattern.id}">使用</button>
          <button class="btn btn-secondary btn-edit-pattern" data-id="${pattern.id}">编辑</button>
          <button class="btn btn-secondary btn-delete-pattern" data-id="${pattern.id}">删除</button>
        </div>
      </div>
    `;
  });
  
  listEl.innerHTML = html;

  listEl.querySelectorAll('.btn-use-pattern').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      usePattern(id);
    });
  });

  listEl.querySelectorAll('.btn-edit-pattern').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      editPattern(id);
    });
  });

  listEl.querySelectorAll('.btn-delete-pattern').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      deletePattern(id);
    });
  });
}

function filterPatterns() {
  const searchTerm = document.getElementById('library-search').value.toLowerCase();
  const category = document.getElementById('library-category').value;

  const filtered = patterns.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm) ||
      p.pattern.toLowerCase().includes(searchTerm) ||
      (p.description && p.description.toLowerCase().includes(searchTerm));
    
    const matchesCategory = category === 'all' || p.category === category;
    
    return matchesSearch && matchesCategory;
  });

  renderPatterns(filtered);
}

function usePattern(id) {
  const pattern = patterns.find(p => p.id === id);
  if (!pattern) return;

  document.getElementById('regex-input').value = pattern.pattern;

  document.getElementById('flag-g').checked = pattern.flags?.includes('g') || false;
  document.getElementById('flag-i').checked = pattern.flags?.includes('i') || false;
  document.getElementById('flag-m').checked = pattern.flags?.includes('m') || false;
  document.getElementById('flag-s').checked = pattern.flags?.includes('s') || false;

  updateFlagsDisplay();
  debounceMatch();

  document.getElementById('library-panel').classList.remove('open');
}

function openAddPatternModal() {
  editingPatternId = null;
  document.getElementById('modal-title').textContent = '添加正则表达式';
  
  document.getElementById('pattern-name').value = '';
  document.getElementById('pattern-pattern').value = document.getElementById('regex-input').value;
  document.getElementById('pattern-flags').value = getFlags();
  document.getElementById('pattern-category').value = 'general';
  document.getElementById('pattern-description').value = '';

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function editPattern(id) {
  const pattern = patterns.find(p => p.id === id);
  if (!pattern) return;

  editingPatternId = id;
  document.getElementById('modal-title').textContent = '编辑正则表达式';
  
  document.getElementById('pattern-name').value = pattern.name;
  document.getElementById('pattern-pattern').value = pattern.pattern;
  document.getElementById('pattern-flags').value = pattern.flags || '';
  document.getElementById('pattern-category').value = pattern.category || 'general';
  document.getElementById('pattern-description').value = pattern.description || '';

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingPatternId = null;
}

async function savePattern() {
  const name = document.getElementById('pattern-name').value.trim();
  const pattern = document.getElementById('pattern-pattern').value.trim();
  const flags = document.getElementById('pattern-flags').value.trim();
  const category = document.getElementById('pattern-category').value;
  const description = document.getElementById('pattern-description').value.trim();

  if (!name || !pattern) {
    alert('名称和正则表达式不能为空');
    return;
  }

  try {
    if (editingPatternId) {
      await window.electronAPI.updatePattern({
        id: editingPatternId,
        name,
        pattern,
        flags,
        category,
        description
      });
    } else {
      await window.electronAPI.addPattern({
        name,
        pattern,
        flags,
        category,
        description
      });
    }
    
    closeModal();
    loadPatterns();
  } catch (error) {
    console.error('Failed to save pattern:', error);
    alert('保存失败，请重试');
  }
}

async function deletePattern(id) {
  if (!confirm('确定要删除这个正则表达式吗？')) return;

  try {
    await window.electronAPI.deletePattern(id);
    loadPatterns();
  } catch (error) {
    console.error('Failed to delete pattern:', error);
    alert('删除失败，请重试');
  }
}
