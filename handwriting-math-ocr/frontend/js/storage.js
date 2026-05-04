class LocalStorageManager {
    constructor(storageKey = 'math_ocr_history') {
        this.storageKey = storageKey;
        this.maxItems = 50;
    }
    
    save(item) {
        const history = this.getHistory();
        
        const newItem = {
            id: Date.now().toString(),
            latex: item.latex || '',
            mathml: item.mathml || '',
            strokes: item.strokes || [],
            timestamp: new Date().toISOString(),
            createdAt: Date.now()
        };
        
        history.unshift(newItem);
        
        if (history.length > this.maxItems) {
            history.splice(this.maxItems);
        }
        
        this.saveHistory(history);
        
        return newItem;
    }
    
    getHistory() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('读取历史记录失败:', error);
            return [];
        }
    }
    
    saveHistory(history) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(history));
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    }
    
    delete(id) {
        const history = this.getHistory();
        const filteredHistory = history.filter(item => item.id !== id);
        this.saveHistory(filteredHistory);
        return filteredHistory;
    }
    
    clearAll() {
        localStorage.removeItem(this.storageKey);
    }
    
    getById(id) {
        const history = this.getHistory();
        return history.find(item => item.id === id) || null;
    }
    
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }
}
