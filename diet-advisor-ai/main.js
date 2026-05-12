class DietAdvisorApp {
    constructor() {
        this.foodDatabase = null;
        this.healthRules = null;
        this.healthProfiler = null;
        this.mealAnalyzer = null;
        this.ruleEngine = null;
        this.bayesianNetwork = null;
        this.dietRecommender = null;
        this.currentProfile = null;
    }

    async init() {
        await this.loadData();
        this.initializeModules();
        this.bindEvents();
        this.renderFoodDatabase();
        console.log('Diet Advisor initialized successfully');
    }

    async loadData() {
        try {
            const [foodDbResponse, rulesResponse] = await Promise.all([
                fetch('data/foodDatabase.json'),
                fetch('data/healthRules.json')
            ]);

            this.foodDatabase = await foodDbResponse.json();
            this.healthRules = await rulesResponse.json();

            if (!this.foodDatabase || !this.foodDatabase.foods) {
                throw new Error('Invalid food database structure');
            }
            if (!this.healthRules) {
                throw new Error('Invalid health rules structure');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('数据加载失败，请确保在本地服务器上运行该应用。');
            throw error;
        }
    }

    initializeModules() {
        this.healthProfiler = new HealthProfiler(this.healthRules);
        this.mealAnalyzer = new MealAnalyzer(this.foodDatabase);
        this.ruleEngine = new RuleEngine(this.healthRules);
        this.bayesianNetwork = new SimpleBayesianNetwork();
        this.dietRecommender = new DietRecommender(
            this.healthRules,
            this.foodDatabase,
            this.ruleEngine,
            this.bayesianNetwork
        );
    }

    bindEvents() {
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.handleAnalyze();
        });

        document.getElementById('quick-test-btn').addEventListener('click', () => {
            this.handleQuickTest();
        });

        document.getElementById('meal-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAnalyze();
            }
        });

        document.querySelectorAll('.example-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const meal = btn.dataset.meal;
                document.getElementById('meal-input').value = meal;
            });
        });

        document.getElementById('food-search').addEventListener('input', (e) => {
            const query = e.target.value;
            this.renderFoodDatabase(query);
        });

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.updateProfilePreview());
        });

        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateProfilePreview());
        });
    }

    getFormProfile() {
        const height = parseInt(document.getElementById('height').value) || null;
        const weight = parseInt(document.getElementById('weight').value) || null;
        const age = parseInt(document.getElementById('age').value) || null;
        
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        const gender = genderRadio ? genderRadio.value : null;

        const activity = document.getElementById('activity').value || 'moderate';

        const conditions = [];
        if (document.getElementById('condition-diabetes').checked) conditions.push('糖尿病');
        if (document.getElementById('condition-hypertension').checked) conditions.push('高血压');
        if (document.getElementById('condition-heart').checked) conditions.push('心脏病');
        if (document.getElementById('condition-obesity').checked) conditions.push('肥胖');

        return { heightCm: height, weightKg: weight, age, gender, activityLevel: activity, conditions };
    }

    updateProfilePreview() {
    }

    handleQuickTest() {
        document.getElementById('height').value = 175;
        document.getElementById('weight').value = 80;
        document.getElementById('age').value = 50;
        const maleRadio = document.querySelector('input[name="gender"][value="male"]');
        if (maleRadio) maleRadio.checked = true;
        document.getElementById('activity').value = 'sedentary';
        document.getElementById('condition-diabetes').checked = true;
        document.getElementById('meal-input').value = '米饭+可乐';

        setTimeout(() => this.handleAnalyze(), 100);
    }

    handleAnalyze() {
        const mealText = document.getElementById('meal-input').value.trim();

        if (!mealText) {
            this.showError('请输入餐食内容');
            return;
        }

        const profileOptions = this.getFormProfile();
        
        if (profileOptions.conditions.length === 0 && !profileOptions.heightCm && !profileOptions.weightKg) {
            this.showError('请至少选择一项健康状况或输入身高体重');
            return;
        }

        try {
            this.currentProfile = this.healthProfiler.createProfile(profileOptions);

            const mealResult = this.mealAnalyzer.analyze(mealText);

            if (mealResult.matchedCount === 0) {
                this.showError(`无法识别餐食中的食物: "${mealText}"。请检查输入或查看食物数据库。`);
                return;
            }

            const ruleEvaluation = this.ruleEngine.evaluateMeal(mealResult, this.currentProfile);

            const recommendations = this.dietRecommender.generateRecommendations(
                mealResult,
                this.currentProfile,
                ruleEvaluation
            );

            this.renderResults(mealResult, this.currentProfile);
            this.renderRecommendations(recommendations, ruleEvaluation, this.currentProfile);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('分析过程中发生错误: ' + error.message);
        }
    }

    renderResults(mealResult, profile) {
        const container = document.getElementById('results-container');
        const agg = mealResult.aggregate;

        let html = '';

        if (profile.bmi || profile.conditions.length > 0) {
            html += '<div class="aggregate-summary">';
            html += '<h3>📊 您的健康画像</h3>';
            html += '<div class="aggregate-grid">';
            if (profile.bmi) {
                html += `<div class="nutrition-pill"><span class="label">BMI</span><span class="value">${profile.bmi}</span></div>`;
            }
            if (profile.bmiCategory) {
                html += `<div class="nutrition-pill"><span class="label">体重状态</span><span class="value">${profile.bmiCategory.label}</span></div>`;
            }
            if (profile.dailyCalories) {
                html += `<div class="nutrition-pill"><span class="label">推荐每日热量</span><span class="value">${profile.dailyCalories} kcal</span></div>`;
            }
            html += '</div>';
            
            if (profile.conditions.length > 0) {
                html += '<div style="margin-top:12px; font-size:0.9rem;">';
                html += '<span style="color:#555;">健康状况: </span>';
                html += profile.conditions.map(c => 
                    `<span class="tag tag-danger">${c}</span>`
                ).join(' ');
                html += '</div>';
            }
            html += '</div>';
        }

        html += '<div class="aggregate-summary">';
        html += '<h3>🍽️ 餐食营养总计</h3>';
        html += '<div class="aggregate-grid">';
        html += `<div class="nutrition-pill"><span class="label">热量</span><span class="value">${agg.calories} kcal</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">碳水化合物</span><span class="value">${agg.carbs} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">蛋白质</span><span class="value">${agg.protein} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">脂肪</span><span class="value">${agg.fat} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">糖分</span><span class="value">${agg.sugar} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">钠</span><span class="value">${agg.sodium} mg</span></div>`;
        if (agg.avgGlycemicIndex > 0) {
            html += `<div class="nutrition-pill"><span class="label">平均 GI</span><span class="value">${agg.avgGlycemicIndex}</span></div>`;
        }
        html += '</div>';

        if (agg.ratios.carbs + agg.ratios.protein + agg.ratios.fat > 0) {
            html += '<div class="ratios-bar">';
            html += `<div class="ratio-carbs" style="width:${agg.ratios.carbs}%"></div>`;
            html += `<div class="ratio-protein" style="width:${agg.ratios.protein}%"></div>`;
            html += `<div class="ratio-fat" style="width:${agg.ratios.fat}%"></div>`;
            html += '</div>';
            html += '<div class="ratios-legend">';
            html += `<div class="ratio-item"><span class="ratio-color ratio-carbs"></span>碳水 ${agg.ratios.carbs}%</div>`;
            html += `<div class="ratio-item"><span class="ratio-color ratio-protein"></span>蛋白质 ${agg.ratios.protein}%</div>`;
            html += `<div class="ratio-item"><span class="ratio-color ratio-fat"></span>脂肪 ${agg.ratios.fat}%</div>`;
            html += '</div>';
        }
        html += '</div>';

        html += '<h4 style="margin: 16px 0 12px; color:#555;">🔍 识别的食物</h4>';
        for (const item of mealResult.items) {
            const n = item.nutrition;
            html += '<div class="food-item">';
            html += `<div class="food-item-header">`;
            html += `<span class="food-name">${item.name}</span>`;
            html += `<span class="food-amount">${item.amount}${item.unit}</span>`;
            html += '</div>';
            html += '<div class="food-nutrition">';
            html += `<div class="nutrition-pill"><span class="label">热量</span><span class="value">${n.calories.toFixed(0)} kcal</span></div>`;
            html += `<div class="nutrition-pill"><span class="label">碳水</span><span class="value">${n.carbs.toFixed(1)} g</span></div>`;
            html += `<div class="nutrition-pill"><span class="label">GI</span><span class="value">${n.glycemicIndex || '-'}</span></div>`;
            html += '</div>';

            if (item.food.tags && item.food.tags.length > 0) {
                html += '<div style="margin-top:8px;">';
                for (const tag of item.food.tags) {
                    const isDanger = ['高糖', '高GI', '高钠', '高脂肪', '高热量', '精制碳水'].includes(tag);
                    const isGood = ['低GI', '粗粮', '高纤维', '高蛋白', '低脂肪'].includes(tag);
                    const tagClass = isDanger ? 'tag-danger' : isGood ? 'tag-success' : '';
                    html += `<span class="tag ${tagClass}">${tag}</span>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }

        container.innerHTML = html;
    }

    renderRecommendations(recommendations, ruleEvaluation, profile) {
        const container = document.getElementById('recommendations-container');
        let html = '';

        const assessment = recommendations.overallAssessment;
        const severityLabels = {
            'critical': { title: '⚠️ 严重风险', class: 'assessment-critical' },
            'high': { title: '⚠️ 较高风险', class: 'assessment-high' },
            'medium': { title: '⚡ 中度风险', class: 'assessment-medium' },
            'none': { title: '✅ 餐食良好', class: 'assessment-none' }
        };

        const label = severityLabels[assessment.severity] || severityLabels['none'];
        html += `<div class="assessment-header ${label.class}">`;
        html += `<div class="assessment-title">${label.title}</div>`;
        html += `<div class="assessment-stats">`;
        html += `${assessment.warningCount} 项警告 | ${assessment.replacementCount} 项建议替换`;
        html += `</div>`;
        html += '</div>';

        const hasRiceCokeIssue = recommendations.warnings.some(w => 
            (w.type === 'carbs' || w.type === 'sugar' || w.type === 'glycemicIndex' || w.tag) &&
            recommendations.replacements.some(r => r.from === '米饭' || r.from === '可乐')
        );

        if (hasRiceCokeIssue) {
            html += '<div class="danger-alert">';
            html += '<div class="alert-title">🚨 碳水化合物和糖分过高</div>';
            html += '<div class="alert-message">建议替换为粗粮和白开水。</div>';
            html += '</div>';
        }

        for (const warning of recommendations.warnings) {
            const isCritical = warning.type === 'sugar' || warning.type === 'glycemicIndex' || 
                              (warning.tag && ['高糖', '高GI'].includes(warning.tag));
            
            html += isCritical ? '<div class="danger-alert">' : '<div class="warning-alert">';
            html += `<div class="alert-title">${warning.condition}${isCritical ? ' - 需要注意' : ''}</div>`;
            html += `<div class="alert-message">${warning.message}</div>`;
            html += '</div>';
        }

        if (recommendations.forbiddenFoods.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#c62828;">🚫 建议避免</h4>';
            for (const food of recommendations.forbiddenFoods) {
                html += `<div class="danger-alert">`;
                html += `<div class="alert-title">${food.name}</div>`;
                html += `<div class="alert-message">${food.reason}</div>`;
                html += '</div>';
            }
        }

        if (recommendations.replacements.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#1565c0;">🔄 建议替换</h4>';
            for (const rep of recommendations.replacements) {
                html += '<div class="replacement-item">';
                html += `<span class="replacement-from">${rep.from}</span>`;
                html += '<span class="replacement-arrow">→</span>';
                html += `<span class="replacement-to">${rep.to}</span>`;
                html += `<span class="replacement-reason">${rep.reason}</span>`;
                html += '</div>';
            }
        }

        if (recommendations.suggestions.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#2e7d32;">💡 健康建议</h4>';
            for (const suggestion of recommendations.suggestions) {
                html += '<div class="suggestion-item">';
                html += '<span class="suggestion-icon">•</span>';
                html += `<span class="suggestion-text">${suggestion}</span>`;
                html += '</div>';
            }
        }

        if (recommendations.bayesianRisks && recommendations.bayesianRisks.recommendations.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#6a1b9a;">🔬 贝叶斯风险分析</h4>';
            for (const rec of recommendations.bayesianRisks.recommendations) {
                html += '<div class="info-alert">';
                html += `<div class="alert-message">${rec}</div>`;
                html += '</div>';
            }
        }

        if (recommendations.warnings.length === 0 && 
            recommendations.replacements.length === 0 &&
            recommendations.forbiddenFoods.length === 0) {
            html += '<div class="success-alert">';
            html += '<div class="alert-title">🎉 餐食评估通过</div>';
            html += '<div class="alert-message">您选择的餐食符合当前健康状况，继续保持健康饮食习惯！</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    renderFoodDatabase(query = '') {
        const container = document.getElementById('food-list');
        let foods = this.foodDatabase?.foods || [];

        if (query) {
            const q = query.toLowerCase();
            foods = foods.filter(f => 
                f.name.toLowerCase().includes(q) ||
                (f.aliases && f.aliases.some(a => a.toLowerCase().includes(q))) ||
                (f.tags && f.tags.some(t => t.toLowerCase().includes(q)))
            );
        }

        foods = foods.slice(0, 15);

        if (foods.length === 0) {
            container.innerHTML = '<div class="placeholder" style="padding:20px;"><p>未找到匹配的食物</p></div>';
            return;
        }

        let html = '';
        for (const food of foods) {
            html += '<div class="food-db-item">';
            html += `<div class="name">${food.name}</div>`;
            html += '<div class="tags">';
            html += `${food.category} | ${food.calories}kcal/${food.serving}`;
            if (food.tags && food.tags.length > 0) {
                html += '<br>';
                for (const tag of food.tags) {
                    const isDanger = ['高糖', '高GI', '高钠', '高脂肪', '高热量'].includes(tag);
                    const isGood = ['低GI', '粗粮', '高纤维'].includes(tag);
                    const tagClass = isDanger ? 'tag-danger' : isGood ? 'tag-success' : '';
                    html += `<span class="tag ${tagClass}">${tag}</span>`;
                }
            }
            if (food.healthWarnings && food.healthWarnings.length > 0) {
                html += '<br><span style="color:#c62828; font-size:0.75rem;">⚠️ ';
                html += food.healthWarnings.join(', ') + '患者慎食';
                html += '</span>';
            }
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    showError(message) {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="danger-alert">
                <div class="alert-title">❌ 错误</div>
                <div class="alert-message">${message}</div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new DietAdvisorApp();
    app.init().catch(err => {
        console.error('Initialization error:', err);
    });
});
