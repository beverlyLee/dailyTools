class ProfileStorage {
    constructor(storageKey = 'formFillerProfile', historyKey = 'formFillerHistory') {
        this.storageKey = storageKey;
        this.historyKey = historyKey;
        this.maxHistoryItems = 20;
    }

    saveProfile(profile) {
        try {
            const existingProfile = this.getProfile() || {};
            const mergedProfile = { ...existingProfile, ...profile };
            localStorage.setItem(this.storageKey, JSON.stringify(mergedProfile));
            return { success: true, message: '资料保存成功' };
        } catch (error) {
            console.error('Error saving profile:', error);
            return { success: false, message: '保存失败: ' + error.message };
        }
    }

    getProfile() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
        return null;
    }

    updateField(fieldName, value) {
        const profile = this.getProfile() || {};
        profile[fieldName] = value;
        return this.saveProfile(profile);
    }

    clearProfile() {
        try {
            localStorage.removeItem(this.storageKey);
            return { success: true, message: '资料已清空' };
        } catch (error) {
            console.error('Error clearing profile:', error);
            return { success: false, message: '清空失败: ' + error.message };
        }
    }

    exportProfile() {
        const profile = this.getProfile();
        if (!profile) {
            return null;
        }
        return JSON.stringify(profile, null, 2);
    }

    importProfile(jsonString) {
        try {
            const profile = JSON.parse(jsonString);
            if (typeof profile !== 'object' || profile === null) {
                return { success: false, message: '无效的配置格式' };
            }
            return this.saveProfile(profile);
        } catch (error) {
            return { success: false, message: '导入失败: ' + error.message };
        }
    }

    getProfileFields() {
        return [
            { key: 'name', label: '姓名', type: 'text' },
            { key: 'phone', label: '手机号', type: 'tel' },
            { key: 'email', label: '邮箱', type: 'email' },
            { key: 'idCard', label: '身份证号', type: 'text' },
            { key: 'gender', label: '性别', type: 'select' },
            { key: 'age', label: '年龄', type: 'number' },
            { key: 'birthday', label: '生日', type: 'date' },
            { key: 'region', label: '地区', type: 'text' },
            { key: 'address', label: '地址', type: 'text' },
            { key: 'zipcode', label: '邮编', type: 'text' },
            { key: 'country', label: '国家', type: 'text' },
            { key: 'username', label: '用户名', type: 'text' },
            { key: 'nickname', label: '昵称', type: 'text' },
            { key: 'company', label: '公司', type: 'text' },
            { key: 'job', label: '职位', type: 'text' }
        ];
    }

    addHistoryEntry(entry) {
        try {
            const history = this.getHistory();
            const newEntry = {
                ...entry,
                timestamp: new Date().toISOString()
            };
            
            history.unshift(newEntry);
            
            if (history.length > this.maxHistoryItems) {
                history.splice(this.maxHistoryItems);
            }
            
            localStorage.setItem(this.historyKey, JSON.stringify(history));
            return true;
        } catch (error) {
            console.error('Error adding history entry:', error);
            return false;
        }
    }

    getHistory() {
        try {
            const data = localStorage.getItem(this.historyKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
        return [];
    }

    clearHistory() {
        try {
            localStorage.removeItem(this.historyKey);
            return { success: true, message: '历史记录已清空' };
        } catch (error) {
            console.error('Error clearing history:', error);
            return { success: false, message: '清空失败: ' + error.message };
        }
    }
}
