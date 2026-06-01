class FormFillerApp {
    constructor() {
        this.fieldIdentifier = new FieldIdentifier();
        this.entityMatcher = new EntityMatcher();
        this.autoFiller = new AutoFiller();
        this.profileStorage = new ProfileStorage();
    }

    async init() {
        try {
            this.loadSavedProfile();
            this.renderRulesList();
            this.renderHistoryList();
            this.bindEvents();
            console.log('AI Form Filler initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    loadSavedProfile() {
        const profile = this.profileStorage.getProfile();
        if (profile) {
            this.populateProfileFields(profile);
            this.entityMatcher.setProfile(profile);
        }
    }

    populateProfileFields(profile) {
        const fieldMappings = {
            'name': 'profile-name',
            'phone': 'profile-phone',
            'email': 'profile-email',
            'idCard': 'profile-idcard',
            'gender': 'profile-gender',
            'age': 'profile-age',
            'birthday': 'profile-birthday',
            'region': 'profile-region',
            'address': 'profile-address',
            'zipcode': 'profile-zipcode',
            'country': 'profile-country',
            'username': 'profile-username',
            'nickname': 'profile-nickname',
            'company': 'profile-company',
            'job': 'profile-job'
        };

        for (const [key, elementId] of Object.entries(fieldMappings)) {
            const element = document.getElementById(elementId);
            if (element && profile[key]) {
                element.value = profile[key];
            }
        }
    }

    getProfileFromForm() {
        return {
            name: this.getValue('profile-name'),
            phone: this.getValue('profile-phone'),
            email: this.getValue('profile-email'),
            idCard: this.getValue('profile-idcard'),
            gender: this.getValue('profile-gender'),
            age: this.getValue('profile-age'),
            birthday: this.getValue('profile-birthday'),
            region: this.getValue('profile-region'),
            address: this.getValue('profile-address'),
            zipcode: this.getValue('profile-zipcode'),
            country: this.getValue('profile-country'),
            username: this.getValue('profile-username'),
            nickname: this.getValue('profile-nickname'),
            company: this.getValue('profile-company'),
            job: this.getValue('profile-job')
        };
    }

    getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    bindEvents() {
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('fill-demo-btn').addEventListener('click', () => {
            this.fillDemoForm();
        });

        document.getElementById('clear-history-btn').addEventListener('click', () => {
            this.clearHistory();
        });
    }

    saveProfile() {
        const profile = this.getProfileFromForm();
        const result = this.profileStorage.saveProfile(profile);

        const statusEl = document.getElementById('profile-status');
        statusEl.style.display = 'block';
        statusEl.className = 'status-message ' + (result.success ? 'success' : 'error');
        statusEl.textContent = result.message;

        if (result.success) {
            this.entityMatcher.setProfile(profile);
        }

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }

    async fillDemoForm() {
        const profile = this.profileStorage.getProfile();

        if (!profile || Object.keys(profile).every(k => !profile[k])) {
            this.showFillStatus('error', '❌ 请先填写并保存您的个人资料');
            return;
        }

        this.entityMatcher.setProfile(profile);

        const demoCard = document.querySelector('.demo-card');
        const identifiedFields = this.fieldIdentifier.scanPage(demoCard);

        if (identifiedFields.length === 0) {
            this.showFillStatus('info', 'ℹ️ 未识别到可填充的表单字段');
            return;
        }

        const { matches, noMatches } = this.entityMatcher.batchMatch(identifiedFields);
        
        if (matches.length === 0) {
            this.showFillStatus('info', 'ℹ️ 表单字段已识别，但用户资料中缺少对应信息');
            return;
        }

        const fillResults = await this.autoFiller.fillAll(matches);

        this.displayFillReport(fillResults, identifiedFields);

        this.profileStorage.addHistoryEntry({
            action: 'fill_demo_form',
            matchedFields: fillResults.filled.length,
            totalFields: identifiedFields.length,
            successRate: ((fillResults.filled.length / identifiedFields.length) * 100).toFixed(1)
        });

        this.renderHistoryList();
    }

    displayFillReport(fillResults, identifiedFields) {
        const statusEl = document.getElementById('fill-status');
        const reportEl = document.getElementById('fill-report');

        statusEl.style.display = 'block';

        if (fillResults.filled.length > 0) {
            statusEl.className = 'fill-status success';
            statusEl.innerHTML = `
                <strong>✅ 自动填充完成</strong><br>
                <small>识别到 ${identifiedFields.length} 个字段，成功填充 ${fillResults.filled.length} 个字段</small>
            `;

            let reportHtml = '<div class="fill-report-title">填充详情：</div>';
            
            for (const item of fillResults.filled) {
                const displayInfo = this.entityMatcher.getEntityDisplayInfo(item.entity);
                reportHtml += `
                    <div class="fill-report-item">
                        <span class="field-name">${displayInfo.displayName}</span>
                        <span class="matched-value">${item.value}</span>
                    </div>
                `;
            }

            if (fillResults.failed.length > 0) {
                reportHtml += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">'
                for (const item of fillResults.failed) {
                    const displayInfo = this.entityMatcher.getEntityDisplayInfo(item.entity);
                    reportHtml += `
                        <div class="fill-report-item">
                            <span class="field-name">${displayInfo.displayName}</span>
                            <span class="no-match">填充失败</span>
                        </div>
                    `;
                }
                reportHtml += '</div>';
            }

            reportEl.innerHTML = reportHtml;
            reportEl.style.display = 'block';
        } else {
            statusEl.className = 'fill-status info';
            statusEl.innerHTML = '<strong>ℹ️ 没有可填充的字段</strong>';
            reportEl.style.display = 'none';
        }
    }

    showFillStatus(type, message) {
        const statusEl = document.getElementById('fill-status');
        const reportEl = document.getElementById('fill-report');
        
        statusEl.style.display = 'block';
        statusEl.className = 'fill-status ' + type;
        statusEl.innerHTML = message;
        reportEl.style.display = 'none';
    }

    renderRulesList() {
        const rulesListEl = document.getElementById('rules-list');
        const rules = this.fieldIdentifier.getAllRules();

        let html = '';
        for (const [key, rule] of Object.entries(rules)) {
            const displayInfo = this.entityMatcher.getEntityDisplayInfo(key);
            
            const patterns = [
                ...rule.namePatterns.slice(0, 3),
                ...rule.placeholderPatterns.slice(0, 2)
            ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

            html += `
                <div class="rule-item">
                    <div class="entity-name">${displayInfo.displayName}</div>
                    <div class="rule-tags">
                        ${patterns.map(p => `<span class="rule-tag">${p}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        rulesListEl.innerHTML = html;
    }

    renderHistoryList() {
        const historyListEl = document.getElementById('history-list');
        const history = this.profileStorage.getHistory();

        if (history.length === 0) {
            historyListEl.innerHTML = `
                <div class="placeholder">
                    <p>暂无操作记录</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const entry of history.slice(0, 10)) {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const actionName = entry.action === 'fill_demo_form' ? '填充演示表单' 
                : entry.action === 'fill_verify_form' ? '填充验证表单' 
                : entry.action;

            html += `
                <div class="history-item">
                    <div class="time">${timeStr}</div>
                    <div class="summary">
                        ${actionName}：${entry.matchedFields}/${entry.totalFields} 字段
                        ${entry.successRate ? ` (${entry.successRate}%)` : ''}
                    </div>
                </div>
            `;
        }

        historyListEl.innerHTML = html;
    }

    clearHistory() {
        const result = this.profileStorage.clearHistory();
        if (result.success) {
            this.renderHistoryList();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new FormFillerApp();
    app.init();
});
