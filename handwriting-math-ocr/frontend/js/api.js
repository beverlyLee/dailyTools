class MathOCRAPI {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }
    
    async recognize(strokes, mimeTypes = ['application/x-latex', 'application/mathml+xml']) {
        try {
            const response = await fetch(`${this.baseUrl}/api/recognize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    strokes: strokes,
                    mime_types: mimeTypes
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('识别失败');
            }
            
            return {
                latex: data.latex,
                mathml: data.mathml,
                raw: data.raw_response
            };
            
        } catch (error) {
            console.error('识别API调用失败:', error);
            throw error;
        }
    }
    
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            return await response.json();
        } catch (error) {
            console.error('健康检查失败:', error);
            return { status: 'unavailable', myscript_configured: false };
        }
    }
}


class MathRenderer {
    renderLatex(latex, element) {
        if (!latex || !element) return;
        
        try {
            katex.render(latex, element, {
                displayMode: true,
                throwOnError: false,
                errorColor: '#e74c3c',
                strict: 'ignore',
                trust: true
            });
        } catch (error) {
            console.error('LaTeX渲染失败:', error);
            element.innerHTML = `<span style="color: #e74c3c;">渲染错误: ${error.message}</span>`;
        }
    }
    
    clear(element) {
        if (element) {
            element.innerHTML = '';
        }
    }
}
