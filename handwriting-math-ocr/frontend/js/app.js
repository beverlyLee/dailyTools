class MathOCRApp {
    constructor() {
        this.canvas = null;
        this.api = new MathOCRAPI();
        this.renderer = new MathRenderer();
        this.storage = new LocalStorageManager();
        this.currentLatex = '';
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadHistory();
        this.checkBackendStatus();
    }
    
    setupCanvas() {
        const canvasElement = document.getElementById('drawing-canvas');
        if (canvasElement) {
            this.canvas = new DrawingCanvas(canvasElement);
        }
    }
    
    setupEventListeners() {
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClear());
        }
        
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.handleUndo());
        }
        
        const recognizeBtn = document.getElementById('recognize-btn');
        if (recognizeBtn) {
            recognizeBtn.addEventListener('click', () => this.handleRecognize());
        }
        
        const copyLatexBtn = document.getElementById('copy-latex-btn');
        if (copyLatexBtn) {
            copyLatexBtn.addEventListener('click', () => this.handleCopyLatex());
        }
    }
    
    handleClear() {
        if (this.canvas) {
            this.canvas.clear();
        }
    }
    
    handleUndo() {
        if (this.canvas) {
            this.canvas.undo();
        }
    }
    
    async handleRecognize() {
        if (!this.canvas || !this.canvas.hasStrokes()) {
            this.showMessage('请先在画板上书写公式', 'warning');
            return;
        }
        
        const recognizeBtn = document.getElementById('recognize-btn');
        const originalText = recognizeBtn.textContent;
        
        try {
            recognizeBtn.textContent = '识别中...';
            recognizeBtn.disabled = true;
            
            const strokes = this.canvas.getStrokesForRecognition();
            const result = await this.api.recognize(strokes);
            
            this.currentLatex = result.latex;
            
            this.displayLatex(result.latex);
            this.renderLatex(result.latex);
            
            const savedItem = this.storage.save({
                latex: result.latex,
                mathml: result.mathml,
                strokes: strokes
            });
            
            this.addHistoryItem(savedItem);
            
            this.showMessage('识别成功！', 'success');
            
        } catch (error) {
            console.error('识别失败:', error);
            this.showMessage(`识别失败: ${error.message}`, 'error');
        } finally {
            recognizeBtn.textContent = originalText;
            recognizeBtn.disabled = false;
        }
    }
    
    handleCopyLatex() {
        if (!this.currentLatex) {
            this.showMessage('没有可复制的LaTeX代码', 'warning');
            return;
        }
        
        navigator.clipboard.writeText(this.currentLatex).then(() => {
            this.showMessage('LaTeX代码已复制到剪贴板', 'success');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = this.currentLatex;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showMessage('LaTeX代码已复制到剪贴板', 'success');
        });
    }
    
    displayLatex(latex) {
        const outputElement = document.getElementById('latex-output');
        if (outputElement) {
            outputElement.textContent = latex || '未识别到公式';
        }
    }
    
    renderLatex(latex) {
        const previewElement = document.getElementById('math-preview');
        if (previewElement) {
            if (latex) {
                this.renderer.renderLatex(latex, previewElement);
            } else {
                this.renderer.clear(previewElement);
                previewElement.innerHTML = '<span style="color: #7f8c8d;">未识别到公式</span>';
            }
        }
    }
    
    loadHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const history = this.storage.getHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = '<div style="color: #7f8c8d; text-align: center; padding: 20px;">暂无历史记录</div>';
            return;
        }
        
        historyList.innerHTML = '';
        history.forEach(item => this.addHistoryItem(item, false));
    }
    
    addHistoryItem(item, prepend = true) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const emptyMessage = historyList.querySelector('[style*="color: #7f8c8d"]');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = item.id;
        
        historyItem.innerHTML = `
            <div class="latex-preview" title="${this.escapeHtml(item.latex)}">
                ${this.escapeHtml(item.latex) || '无公式'}
            </div>
            <div class="timestamp">${this.storage.formatTimestamp(item.timestamp)}</div>
            <div class="actions">
                <button class="btn btn-small load-history" data-id="${item.id}">加载</button>
                <button class="btn btn-small delete-history" data-id="${item.id}" style="background-color: #e74c3c; color: white;">删除</button>
            </div>
        `;
        
        if (prepend) {
            historyList.insertBefore(historyItem, historyList.firstChild);
            
            if (historyList.children.length > this.storage.maxItems) {
                historyList.removeChild(historyList.lastChild);
            }
        } else {
            historyList.appendChild(historyItem);
        }
        
        const loadBtn = historyItem.querySelector('.load-history');
        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.loadHistoryItem(id);
            });
        }
        
        const deleteBtn = historyItem.querySelector('.delete-history');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteHistoryItem(id);
            });
        }
    }
    
    loadHistoryItem(id) {
        const item = this.storage.getById(id);
        if (!item) return;
        
        this.currentLatex = item.latex;
        this.displayLatex(item.latex);
        this.renderLatex(item.latex);
        
        this.showMessage('历史记录已加载', 'success');
    }
    
    deleteHistoryItem(id) {
        this.storage.delete(id);
        
        const historyItem = document.querySelector(`.history-item[data-id="${id}"]`);
        if (historyItem) {
            historyItem.remove();
        }
        
        const historyList = document.getElementById('history-list');
        if (historyList && historyList.children.length === 0) {
            historyList.innerHTML = '<div style="color: #7f8c8d; text-align: center; padding: 20px;">暂无历史记录</div>';
        }
        
        this.showMessage('历史记录已删除', 'success');
    }
    
    async checkBackendStatus() {
        try {
            const status = await this.api.healthCheck();
            console.log('后端状态:', status);
            
            if (!status.myscript_configured) {
                console.warn('MyScript API 密钥未配置，请在后端 .env 文件中设置');
            }
        } catch (error) {
            console.warn('无法连接到后端服务器:', error);
        }
    }
    
    showMessage(message, type = 'info') {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: ${colors[type] || colors.info};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-size: 14px;
        `;
        toast.textContent = message;
        
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.mathOCRApp = new MathOCRApp();
});
