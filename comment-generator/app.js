import { AstParser } from './AstParser.js';
import { Contextualizer } from './Contextualizer.js';
import { DocGenerator } from './DocGenerator.js';

class CommentGeneratorApp {
    constructor() {
        this.editor = null;
        this.parser = null;
        this.contextualizer = new Contextualizer();
        this.language = 'javascript';
        this.style = 'jsdoc';
        
        this.init();
    }

    async init() {
        await this.initMonacoEditor();
        this.bindEvents();
        this.loadSampleCode();
    }

    async initMonacoEditor() {
        return new Promise((resolve) => {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
            
            require(['vs/editor/editor.main'], () => {
                this.editor = monaco.editor.create(document.getElementById('editor'), {
                    value: '',
                    language: 'javascript',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 4,
                    insertSpaces: true
                });
                
                resolve();
            });
        });
    }

    bindEvents() {
        const languageSelect = document.getElementById('language-select');
        const styleSelect = document.getElementById('comment-style');
        const generateBtn = document.getElementById('generate-btn');

        languageSelect.addEventListener('change', (e) => {
            this.language = e.target.value;
            if (this.editor) {
                monaco.editor.setModelLanguage(this.editor.getModel(), this.language);
            }
            this.updateStyleOptions();
            this.loadSampleCode();
        });

        styleSelect.addEventListener('change', (e) => {
            this.style = e.target.value;
        });

        generateBtn.addEventListener('click', () => {
            this.generateComments();
        });
    }

    updateStyleOptions() {
        const styleSelect = document.getElementById('comment-style');
        const options = styleSelect.options;
        
        if (this.language === 'python') {
            options[0].style.display = 'none';
            options[1].style.display = 'block';
            options[2].style.display = 'block';
            if (this.style === 'jsdoc') {
                this.style = 'google';
                styleSelect.value = 'google';
            }
        } else {
            options[0].style.display = 'block';
            options[1].style.display = 'none';
            options[2].style.display = 'none';
            if (this.style !== 'jsdoc') {
                this.style = 'jsdoc';
                styleSelect.value = 'jsdoc';
            }
        }
    }

    loadSampleCode() {
        if (!this.editor) return;
        
        const samples = {
            javascript: `// 选中下方的代码，点击"生成注释"按钮

function parseEmailList(inputString) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    const emails = [];
    
    if (!inputString || typeof inputString !== 'string') {
        return emails;
    }
    
    const lines = inputString.split(/[,;\\n]+/);
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (emailPattern.test(trimmed)) {
            emails.push(trimmed);
        }
    }
    
    return emails;
}

const validateURL = (url) => {
    const pattern = /^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/;
    return pattern.test(url);
};

async function fetchUserData(userId, options = {}) {
    const baseURL = 'https://api.example.com/users';
    const timeout = options.timeout || 5000;
    
    try {
        const response = await fetch(\`\${baseURL}/\${userId}\`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(timeout)
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        throw error;
    }
}`,

            typescript: `interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
}

function parseEmailList(inputString: string): string[] {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    const emails: string[] = [];
    
    if (!inputString || typeof inputString !== 'string') {
        return emails;
    }
    
    const lines = inputString.split(/[,;\\n]+/);
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (emailPattern.test(trimmed)) {
            emails.push(trimmed);
        }
    }
    
    return emails;
}

const validateURL = (url: string): boolean => {
    const pattern = /^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$/;
    return pattern.test(url);
};

async function fetchUserData(userId: number, options: { timeout?: number } = {}): Promise<User> {
    const baseURL = 'https://api.example.com/users';
    const timeout = options.timeout || 5000;
    
    try {
        const response = await fetch(\`\${baseURL}/\${userId}\`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(timeout)
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        throw error;
    }
}`,

            python: `import re
import requests
from typing import List, Dict, Optional, Union

def parse_email_list(input_string: str) -> List[str]:
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    emails = []
    
    if not input_string or not isinstance(input_string, str):
        return emails
    
    lines = re.split(r'[,;\\n]+', input_string)
    
    for line in lines:
        trimmed = line.strip()
        if re.match(email_pattern, trimmed):
            emails.append(trimmed)
    
    return emails

def validate_url(url: str) -> bool:
    pattern = r'^https?://(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$'
    return bool(re.match(pattern, url))

def fetch_user_data(user_id: int, timeout: int = 5000) -> Dict:
    base_url = 'https://api.example.com/users'
    
    try:
        response = requests.get(
            f'{base_url}/{user_id}',
            headers={'Content-Type': 'application/json'},
            timeout=timeout / 1000
        )
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Failed to fetch user data: {e}')
        raise

class UserManager:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.users = []
    
    def add_user(self, user: Dict) -> bool:
        if self._validate_user(user):
            self.users.append(user)
            return True
        return False
    
    def _validate_user(self, user: Dict) -> bool:
        return 'id' in user and 'email' in user
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        for user in self.users:
            if user.get('id') == user_id:
                return user
        return None`
        };
        
        this.editor.setValue(samples[this.language] || samples.javascript);
        this.updateStatus('就绪 - 选择代码后点击"生成注释"按钮');
    }

    async generateComments() {
        if (!this.editor) {
            this.updateStatus('编辑器未就绪');
            return;
        }

        this.showLoading(true);
        this.updateStatus('正在分析代码...');

        try {
            const selection = this.editor.getSelection();
            let codeToParse = '';
            let selectedRange = null;

            if (selection && !selection.isEmpty()) {
                const model = this.editor.getModel();
                codeToParse = model.getValueInRange(selection);
                selectedRange = selection;
                this.updateStatus('分析选中的代码...');
            } else {
                codeToParse = this.editor.getValue();
                this.updateStatus('分析全部代码...');
            }

            if (!codeToParse.trim()) {
                this.updateStatus('请输入或选择代码');
                this.showLoading(false);
                return;
            }

            await this.delay(200);

            this.parser = new AstParser(this.language);
            const ast = this.parser.parse(codeToParse);

            this.updateStatus('解析代码结构...');
            await this.delay(200);

            const docGenerator = new DocGenerator(this.language, this.style);
            const outputDiv = document.getElementById('output');
            let allComments = [];
            let outputHtml = '';

            if (ast.nodes.length === 0) {
                outputHtml = '<div style="color: #f48771;">未识别到可注释的代码结构（函数、类或正则表达式）</div>';
                this.updateStatus('未识别到可注释的结构');
            } else {
                for (const node of ast.nodes) {
                    this.updateStatus(`分析 ${node.type}: ${node.name || node.pattern || '...'}`);
                    
                    const context = this.contextualizer.analyze(node);
                    const comment = docGenerator.generate(node, context);
                    
                    allComments.push({
                        node,
                        context,
                        comment
                    });
                    
                    outputHtml += this.formatCommentOutput(node, context, comment);
                    await this.delay(100);
                }

                this.updateStatus(`完成！已为 ${ast.nodes.length} 个代码结构生成注释`);
            }

            outputDiv.innerHTML = outputHtml;

            if (selectedRange && allComments.length > 0) {
                this.updateStatus('提示：可以将生成的注释复制到代码中');
            }

        } catch (error) {
            console.error('Error generating comments:', error);
            this.updateStatus(`错误: ${error.message}`);
            document.getElementById('output').innerHTML = 
                `<div style="color: #f48771;">生成注释时出错: ${error.message}</div>`;
        } finally {
            this.showLoading(false);
        }
    }

    formatCommentOutput(node, context, comment) {
        const typeColors = {
            'function': '#4ec9b0',
            'class': '#c586c0',
            'regex': '#dcdcaa'
        };

        const typeLabels = {
            'function': '函数',
            'class': '类',
            'regex': '正则表达式'
        };

        const color = typeColors[node.type] || '#d4d4d4';
        const label = typeLabels[node.type] || node.type;

        let html = `<div style="margin-bottom: 24px; padding: 16px; background: #252526; border-radius: 6px; border: 1px solid #333;">`;
        
        html += `<div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">`;
        html += `<span style="color: ${color}; font-weight: 600;">${label}: ${node.name || (node.pattern ? '/' + node.pattern + '/' + (node.flags || '') : '...')}</span>`;
        html += `<span style="color: #858585; font-size: 12px;">复杂度: ${context.complexity}</span>`;
        html += `</div>`;

        if (context.purpose) {
            html += `<div style="margin-bottom: 12px; color: #9cdcfe; font-size: 13px;">${context.purpose}</div>`;
        }

        if (context.keywords && context.keywords.length > 0) {
            html += `<div style="margin-bottom: 12px;">`;
            for (const keyword of context.keywords.slice(0, 5)) {
                html += `<span style="display: inline-block; padding: 2px 8px; margin-right: 6px; background: #3c3c3c; border-radius: 4px; font-size: 11px; color: #ce9178;">${keyword}</span>`;
            }
            html += `</div>`;
        }

        html += `<div style="background: #1e1e1e; padding: 12px; border-radius: 4px; border: 1px solid #333;">`;
        html += `<pre style="margin: 0; white-space: pre-wrap; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.5; color: #6a9955;">${this.escapeHtml(comment)}</pre>`;
        html += `</div>`;

        html += `<div style="margin-top: 8px;">`;
        html += `<button onclick="navigator.clipboard.writeText(\`${this.escapeForTemplate(comment)}\`).then(() => { alert('已复制到剪贴板'); })" 
            style="padding: 4px 12px; background: #0e639c; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
            复制注释
        </button>`;
        html += `</div>`;

        html += `</div>`;

        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeForTemplate(text) {
        return text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    }

    updateStatus(text) {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = text;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const btn = document.getElementById('generate-btn');
        
        if (loading) {
            loading.classList.toggle('active', show);
        }
        if (btn) {
            btn.disabled = show;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CommentGeneratorApp();
});