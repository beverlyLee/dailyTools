class MathJaxRenderer {
    constructor(options = {}) {
        this.containerId = options.containerId || 'renderedLatex';
        this.isReady = false;
        this.mathJax = null;
        this.autoNumber = options.autoNumber !== false;
        
        this.init();
    }

    init() {
        if (typeof MathJax !== 'undefined') {
            this.isReady = true;
            this.mathJax = MathJax;
        } else {
            const checkReady = () => {
                if (typeof MathJax !== 'undefined') {
                    this.isReady = true;
                    this.mathJax = MathJax;
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        }
    }

    async render(latexCode, containerElement = null) {
        const container = containerElement || document.getElementById(this.containerId);
        
        if (!container) {
            console.error('渲染容器不存在');
            return false;
        }

        if (!this.isReady) {
            await this.waitForMathJax();
        }

        try {
            const cleanLatex = this.cleanLatex(latexCode);
            container.innerHTML = '';
            
            const mathDiv = document.createElement('div');
            mathDiv.style.overflow = 'auto';
            mathDiv.style.padding = '10px';
            mathDiv.style.textAlign = 'center';
            
            const displayLatex = this.wrapInDisplayMode(cleanLatex);
            mathDiv.textContent = displayLatex;
            
            container.appendChild(mathDiv);
            
            if (this.mathJax && this.mathJax.typesetPromise) {
                await this.mathJax.typesetPromise([mathDiv]);
            } else {
                this.renderFallback(container, cleanLatex);
            }
            
            return true;
        } catch (error) {
            console.error('MathJax 渲染失败:', error);
            this.renderFallback(container, latexCode);
            return false;
        }
    }

    async waitForMathJax() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isReady) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    cleanLatex(latexCode) {
        if (!latexCode || typeof latexCode !== 'string') {
            return '';
        }
        
        let clean = latexCode.trim();
        
        clean = clean.replace(/^\$\$/, '').replace(/\$\$$/, '');
        clean = clean.replace(/^\$/, '').replace(/\$$/, '');
        clean = clean.replace(/^\\\[/, '').replace(/\\\]$/, '');
        clean = clean.replace(/^\\\(/, '').replace(/\\\)$/, '');
        
        return clean;
    }

    wrapInDisplayMode(latexCode) {
        if (latexCode.includes('\\begin{align}') || 
            latexCode.includes('\\begin{equation}') ||
            latexCode.includes('\\begin{gather}')) {
            return latexCode;
        }
        
        return '$$' + latexCode + '$$';
    }

    renderFallback(container, latexCode) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
                <p style="margin-bottom: 10px;"><strong>原始 LaTeX 代码：</strong></p>
                <code style="background: #f5f5f5; padding: 10px 15px; border-radius: 4px; display: inline-block; word-break: break-all; max-width: 100%;">
                    ${this.escapeHtml(latexCode)}
                </code>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async typesetElement(element) {
        if (!this.isReady) {
            await this.waitForMathJax();
        }
        
        if (this.mathJax && this.mathJax.typesetPromise) {
            await this.mathJax.typesetPromise([element]);
        }
    }

    clear(containerElement = null) {
        const container = containerElement || document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '<span class="preview-placeholder">等待识别...</span>';
        }
    }
}

export { MathJaxRenderer };
