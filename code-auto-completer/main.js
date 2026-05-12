document.addEventListener('DOMContentLoaded', function() {
    console.log('[Main] DOM 已加载');
    
    const statusIndicator = document.getElementById('status-indicator');
    const problemsPanel = document.getElementById('problems-panel');
    const outputPanel = document.getElementById('output-panel');

    require.config({ 
        paths: { 
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
        }
    });

    const initialCode = `// 代码自动补全与纠错插件示例
// 尝试输入以下内容测试功能：
// 1. 输入 "docum" 查看自动补全提示
// 2. 输入 "for(i=0;i<10;i++)" 查看缺少花括号警告
// 3. 输入 "document." 查看方法提示

class MyClass {
    constructor(name) {
        this.name = name;
    }
    
    greet() {
        console.log('Hello, ' + this.name);
    }
}

function greet(name) {
    console.log('Hello, ' + name);
}

const element = document.getElementById('my-element');
const obj = new MyClass('test');
greet('World');
`;

    function updateStatus(state, message) {
        if (statusIndicator) {
            statusIndicator.textContent = message;
            statusIndicator.className = `status-indicator ${state}`;
        }
        console.log('[Main] Status:', state, '-', message);
    }

    function updateProblemsPanel(issues) {
        if (!problemsPanel) return;
        
        if (issues.length === 0) {
            problemsPanel.innerHTML = '<div class="empty-message">未检测到问题</div>';
            return;
        }

        const sortedIssues = issues.sort((a, b) => {
            if (a.severity === 'error' && b.severity !== 'error') return -1;
            if (a.severity !== 'error' && b.severity === 'error') return 1;
            return a.line - b.line;
        });

        const issuesHTML = sortedIssues.map(issue => `
            <div class="issue-item ${issue.severity}">
                <div class="issue-icon">
                    ${issue.severity === 'error' ? '×' : '!'}
                </div>
                <div class="issue-content">
                    <div class="issue-message">${issue.message}</div>
                    <div class="issue-location">第 ${issue.line} 行, 第 ${issue.column || 1} 列</div>
                </div>
            </div>
        `).join('');

        problemsPanel.innerHTML = issuesHTML;
    }

    function setupTabSwitching() {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.panel-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const targetPane = document.getElementById(`${targetTab}-panel`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    function initEditor() {
        console.log('[Main] 开始初始化 Monaco Editor');
        
        require(['vs/editor/editor.main'], function(monaco) {
            console.log('[Main] Monaco Editor 核心模块已加载');
            updateStatus('loading', '加载编辑器中...');

            try {
                console.log('[Main] 配置 JavaScript 语言服务');
                
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                    target: monaco.languages.typescript.ScriptTarget.ES2020,
                    allowNonTsExtensions: true,
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    module: monaco.languages.typescript.ModuleKind.CommonJS,
                    noEmit: true,
                    esModuleInterop: true,
                    jsx: monaco.languages.typescript.JsxEmit.None,
                    allowJs: true,
                    checkJs: true,
                    strict: false,
                    noImplicitAny: false,
                    noImplicitThis: false,
                    alwaysStrict: false,
                    strictNullChecks: false,
                    strictFunctionTypes: false,
                    skipLibCheck: true,
                    typeRoots: []
                });

                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: false,
                    noSyntaxValidation: false,
                    noSuggestionDiagnostics: true,
                    diagnosticCodesToIgnore: []
                });

                console.log('[Main] 创建编辑器实例');
                
                const editorContainer = document.getElementById('editor');
                if (!editorContainer) {
                    throw new Error('找不到编辑器容器元素 #editor');
                }

                const editor = monaco.editor.create(editorContainer, {
                    value: '',
                    language: 'javascript',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: {
                        enabled: true,
                        scale: 0.8
                    },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, Ubuntu Mono, Consolas, monospace',
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    quickSuggestionsDelay: 100,
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    wordBasedSuggestions: true,
                    parameterHints: {
                        enabled: true
                    },
                    formatOnPaste: true,
                    formatOnType: false,
                    autoIndent: 'advanced',
                    folding: true,
                    foldingStrategy: 'auto',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    readOnly: false,
                    dragAndDrop: true,
                    links: true,
                    colorDecorators: true,
                    renderWhitespace: 'selection',
                    renderIndentGuides: true,
                    bracketPairColorization: {
                        enabled: true
                    },
                    lightbulb: {
                        enabled: true
                    }
                });

                console.log('[Main] 编辑器实例创建成功');

                const model = editor.getModel();
                console.log('[Main] 编辑器模型语言:', model.getLanguageId());

                if (model.getLanguageId() !== 'javascript') {
                    console.log('[Main] 重新设置模型语言为 JavaScript');
                    monaco.editor.setModelLanguage(model, 'javascript');
                }

                console.log('[Main] 清空编辑器内容');
                editor.setValue('');

                console.log('[Main] 设置初始代码');
                editor.setValue(initialCode);

                const syntaxAnalyzer = new SyntaxAnalyzer();
                const completionProvider = new CompletionProvider();
                const lintChecker = new LintChecker();

                syntaxAnalyzer.init(editor, {
                    onCursorChange: (position, context) => {
                        console.log('[SyntaxAnalyzer] 光标: 行', position.lineNumber, '列', position.column, '- 上下文:', context.contextType);
                    },
                    onContentChange: (code) => {
                    }
                });

                console.log('[Main] 初始化自动补全服务（同步模式）');
                try {
                    completionProvider.init(editor, monaco, syntaxAnalyzer, null);
                    console.log('[Main] 自动补全服务初始化成功');
                } catch (e) {
                    console.error('[Main] 自动补全服务初始化失败:', e);
                }

                console.log('[Main] 初始化代码检查服务（同步模式）');
                try {
                    lintChecker.init(editor, monaco, null, {
                        onIssuesChange: (issues) => {
                            console.log('[LintChecker] 检测到', issues.length, '个问题');
                            updateProblemsPanel(issues);
                            updateStatus(
                                issues.length > 0 ? 'warning' : 'ready',
                                issues.length > 0 ? `检测到 ${issues.length} 个问题` : '就绪'
                            );
                        }
                    });
                    console.log('[Main] 代码检查服务初始化成功');
                } catch (e) {
                    console.error('[Main] 代码检查服务初始化失败:', e);
                }

                setupTabSwitching();

                window.addEventListener('resize', () => {
                    editor.layout();
                });

                setTimeout(() => {
                    console.log('[Main] 编辑器布局调整');
                    editor.layout();
                    
                    console.log('[Main] 强制执行代码检查');
                    lintChecker.forceLint();
                    
                    console.log('[Main] 编辑器获取焦点');
                    editor.focus();
                    
                    updateStatus('ready', '就绪');
                    console.log('[Main] 编辑器初始化完成');
                }, 300);

            } catch (error) {
                console.error('[Main] 编辑器初始化失败:', error);
                updateStatus('error', '初始化失败: ' + error.message);
            }
        });
    }

    try {
        console.log('[Main] 开始加载 Monaco Editor');
        initEditor();
    } catch (error) {
        console.error('[Main] 启动失败:', error);
        updateStatus('error', '启动失败: ' + error.message);
    }
});
