import { questionBank } from './questionBank.js';
import { ConstraintParser } from './ConstraintParser.js';
import { QuestionFilter } from './QuestionFilter.js';
import { PaperOptimizer } from './PaperOptimizer.js';

const TYPE_SCORES = questionBank.fixedScores || {
    "选择题": 3,
    "填空题": 4,
    "解答题": 10
};

class PaperGeneratorApp {
    constructor() {
        this.parser = new ConstraintParser();
        this.filter = new QuestionFilter(questionBank);
        this.optimizer = new PaperOptimizer();

        this.init();
    }

    init() {
        this.initElements();
        this.initEventListeners();
        this.updateTotals();
        this.showEmptyState();
    }

    initElements() {
        this.el = {
            subjectSelect: document.getElementById('subjectSelect'),
            difficultySelect: document.getElementById('difficultySelect'),
            algebraRatio: document.getElementById('algebraRatio'),
            geometryRatio: document.getElementById('geometryRatio'),
            algebraValue: document.getElementById('algebraValue'),
            geometryValue: document.getElementById('geometryValue'),
            choiceCount: document.getElementById('choiceCount'),
            fillCount: document.getElementById('fillCount'),
            answerCount: document.getElementById('answerCount'),
            choiceTotal: document.getElementById('choiceTotal'),
            fillTotal: document.getElementById('fillTotal'),
            answerTotal: document.getElementById('answerTotal'),
            expectedTotal: document.getElementById('expectedTotal'),
            generateBtn: document.getElementById('generateBtn'),
            resetBtn: document.getElementById('resetBtn'),
            printBtn: document.getElementById('printBtn'),
            regenerateBtn: document.getElementById('regenerateBtn'),
            resultStats: document.getElementById('resultStats'),
            paperContainer: document.getElementById('paperContainer'),
            downloadActions: document.getElementById('downloadActions')
        };
    }

    initEventListeners() {
        this.el.algebraRatio.addEventListener('input', (e) => {
            const algebra = Number(e.target.value);
            const geometry = 100 - algebra;
            this.el.geometryRatio.value = geometry;
            this.el.algebraValue.textContent = algebra;
            this.el.geometryValue.textContent = geometry;
        });

        const typeInputs = ['choiceCount', 'fillCount', 'answerCount'];
        typeInputs.forEach(id => {
            this.el[id].addEventListener('input', () => this.updateTotals());
        });

        this.el.generateBtn.addEventListener('click', () => this.generatePaper());
        this.el.resetBtn.addEventListener('click', () => this.resetForm());
        this.el.printBtn.addEventListener('click', () => window.print());
        this.el.regenerateBtn.addEventListener('click', () => this.generatePaper());
    }

    updateTotals() {
        const choiceTotal = Number(this.el.choiceCount.value) * TYPE_SCORES["选择题"];
        const fillTotal = Number(this.el.fillCount.value) * TYPE_SCORES["填空题"];
        const answerTotal = Number(this.el.answerCount.value) * TYPE_SCORES["解答题"];

        this.el.choiceTotal.textContent = choiceTotal;
        this.el.fillTotal.textContent = fillTotal;
        this.el.answerTotal.textContent = answerTotal;

        const expected = choiceTotal + fillTotal + answerTotal;
        this.el.expectedTotal.textContent = expected;
    }

    resetForm() {
        this.el.subjectSelect.value = '初中数学';
        this.el.difficultySelect.value = '';
        this.el.algebraRatio.value = 60;
        this.el.geometryRatio.value = 40;
        this.el.algebraValue.textContent = 60;
        this.el.geometryValue.textContent = 40;
        this.el.choiceCount.value = 10;
        this.el.fillCount.value = 5;
        this.el.answerCount.value = 5;
        this.updateTotals();
        this.showEmptyState();
    }

    getConstraints() {
        return {
            subject: this.el.subjectSelect.value,
            totalScore: Number(this.el.expectedTotal.textContent),
            difficulty: this.el.difficultySelect.value || null,
            topicDistribution: {
                '代数': Number(this.el.algebraRatio.value) / 100,
                '几何': Number(this.el.geometryRatio.value) / 100
            },
            typeDistribution: {
                '选择题': {
                    count: Number(this.el.choiceCount.value),
                    scoreEach: TYPE_SCORES["选择题"]
                },
                '填空题': {
                    count: Number(this.el.fillCount.value),
                    scoreEach: TYPE_SCORES["填空题"]
                },
                '解答题': {
                    count: Number(this.el.answerCount.value),
                    scoreEach: TYPE_SCORES["解答题"]
                }
            }
        };
    }

    generatePaper() {
        try {
            const input = this.getConstraints();
            console.log('[PaperGenerator] 用户设置:', JSON.stringify(input, null, 2));

            const parseResult = this.parser.parse(input);
            if (!parseResult.isValid) {
                this.showError(parseResult.errors.join('；'));
                return;
            }

            const constraints = parseResult.constraints;
            console.log('[PaperGenerator] 解析后的约束:', JSON.stringify(constraints, null, 2));

            const validation = this.filter.validateResources(constraints);
            if (!validation.isValid) {
                this.showError('题库资源不足，无法生成符合要求的试卷。' + validation.errors.join('；'));
                return;
            }

            const filteredPool = this.filter.filter(constraints);
            const result = this.optimizer.optimize(filteredPool, constraints);

            if (result.paper.length === 0) {
                this.showError('无法生成试卷：没有符合条件的题目。');
                return;
            }

            if (!result.typeCountMatch) {
                this.showError('生成的题目数量与设置不符，请检查题库资源。');
                return;
            }

            this.renderResult(result, constraints);

            if (validation.warnings.length > 0) {
                console.log('[PaperGenerator] 警告:', validation.warnings);
            }
        } catch (error) {
            console.error('[PaperGenerator] 生成试卷出错:', error);
            this.showError('生成试卷时发生错误：' + error.message);
        }
    }

    renderResult(result, constraints) {
        this.renderStats(result, constraints);
        this.renderPaper(result.paper);
        this.el.downloadActions.style.display = 'flex';
    }

    renderStats(result, constraints) {
        const algebraStat = result.topicStats['代数'] || { count: 0, score: 0 };
        const geometryStat = result.topicStats['几何'] || { count: 0, score: 0 };

        const diffStats = result.difficultyStats || {
            easy: { count: 0, score: 0 },
            medium: { count: 0, score: 0 },
            hard: { count: 0, score: 0 }
        };

        const targetDiff = constraints.difficultyDistribution || { easy: 0.3, medium: 0.5, hard: 0.2 };

        const easyRatio = result.totalScore > 0 ? (diffStats.easy.score / result.totalScore * 100) : 0;
        const mediumRatio = result.totalScore > 0 ? (diffStats.medium.score / result.totalScore * 100) : 0;
        const hardRatio = result.totalScore > 0 ? (diffStats.hard.score / result.totalScore * 100) : 0;

        let statusHtml = '';
        const statusMessages = [];

        if (result.hasDuplicates) {
            statusMessages.push('⚠️ 检测到重复题目');
        }
        if (!result.meetsTopicRatio) {
            statusMessages.push('⚠️ 知识点分布略有偏差');
        }
        if (!result.typeCountMatch) {
            statusMessages.push('⚠️ 题目数量与设置不符');
        }

        if (statusMessages.length === 0) {
            statusHtml = '<div class="success-badge">✅ 试卷质量良好</div>';
        } else {
            statusHtml = statusMessages.map(m => `<div class="warning-badge">${m}</div>`).join('');
        }

        this.el.resultStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${result.totalScore}</div>
                <div class="stat-label">总分</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${result.paper.length}</div>
                <div class="stat-label">题目总数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${result.uniqueKnowledgePoints}</div>
                <div class="stat-label">知识点覆盖</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(algebraStat.score / result.totalScore * 100).toFixed(0)}%</div>
                <div class="stat-label">代数占比 (目标${(constraints.topicDistribution['代数'] * 100).toFixed(0)}%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(geometryStat.score / result.totalScore * 100).toFixed(0)}%</div>
                <div class="stat-label">几何占比 (目标${(constraints.topicDistribution['几何'] * 100).toFixed(0)}%)</div>
            </div>
            
            <div class="stat-card stat-card-difficulty">
                <div class="difficulty-title">难度分布</div>
                <div class="difficulty-bars">
                    <div class="diff-bar-item">
                        <div class="diff-label">
                            <span class="diff-dot diff-easy"></span>
                            <span>简单</span>
                            <span class="diff-count">${diffStats.easy.count}题</span>
                        </div>
                        <div class="diff-bar-wrapper">
                            <div class="diff-bar diff-bar-easy" style="width: ${easyRatio}%"></div>
                        </div>
                        <div class="diff-ratio">${easyRatio.toFixed(0)}% (目标${(targetDiff.easy * 100).toFixed(0)}%)</div>
                    </div>
                    <div class="diff-bar-item">
                        <div class="diff-label">
                            <span class="diff-dot diff-medium"></span>
                            <span>中等</span>
                            <span class="diff-count">${diffStats.medium.count}题</span>
                        </div>
                        <div class="diff-bar-wrapper">
                            <div class="diff-bar diff-bar-medium" style="width: ${mediumRatio}%"></div>
                        </div>
                        <div class="diff-ratio">${mediumRatio.toFixed(0)}% (目标${(targetDiff.medium * 100).toFixed(0)}%)</div>
                    </div>
                    <div class="diff-bar-item">
                        <div class="diff-label">
                            <span class="diff-dot diff-hard"></span>
                            <span>困难</span>
                            <span class="diff-count">${diffStats.hard.count}题</span>
                        </div>
                        <div class="diff-bar-wrapper">
                            <div class="diff-bar diff-bar-hard" style="width: ${hardRatio}%"></div>
                        </div>
                        <div class="diff-ratio">${hardRatio.toFixed(0)}% (目标${(targetDiff.hard * 100).toFixed(0)}%)</div>
                    </div>
                </div>
            </div>
            
            ${statusHtml}
        `;
    }

    renderPaper(paper) {
        const grouped = {};
        paper.forEach(q => {
            if (!grouped[q.type]) grouped[q.type] = [];
            grouped[q.type].push(q);
        });

        const typeOrder = ['选择题', '填空题', '解答题'];
        let html = '';
        let questionNum = 1;

        for (const type of typeOrder) {
            const questions = grouped[type];
            if (!questions || questions.length === 0) continue;

            const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
            html += `
                <div class="paper-section">
                    <div class="section-title">
                        ${type}（共${questions.length}题，${totalScore}分）
                    </div>
            `;

            questions.forEach(q => {
                html += this.renderQuestion(q, questionNum++);
            });

            html += '</div>';
        }

        this.el.paperContainer.innerHTML = html;
    }

    renderQuestion(q, num) {
        const topicClass = q.topic === '代数' ? 'tag-topic-algebra' : 'tag-topic-geometry';
        const topicLabel = q.topic === '代数' ? '代数' : '几何';

        let optionsHtml = '';
        if (q.options && q.options.length > 0) {
            optionsHtml = '<ol type="A" class="question-options">';
            q.options.forEach((opt, i) => {
                optionsHtml += `<li>${opt}</li>`;
            });
            optionsHtml += '</ol>';
        }

        return `
            <div class="question-item">
                <div class="question-header">
                    <div class="question-meta">
                        <span class="tag ${topicClass}">${topicLabel}</span>
                        <span class="tag tag-difficulty-${q.difficulty}">${this.getDifficultyLabel(q.difficulty)}</span>
                    </div>
                    <div class="question-score">（${q.score}分）</div>
                </div>
                <div class="question-text">
                    ${num}. ${q.question}
                </div>
                ${optionsHtml}
                <div class="question-kp">知识点：${q.knowledgePoint}</div>
            </div>
        `;
    }

    getDifficultyLabel(d) {
        if (d <= 1) return '简单';
        if (d <= 2) return '中等';
        return '困难';
    }

    showEmptyState() {
        this.el.resultStats.innerHTML = '';
        this.el.paperContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>请在左侧设置组卷条件</p>
                <p>点击「智能生成试卷」按钮开始</p>
            </div>
        `;
        this.el.downloadActions.style.display = 'none';
    }

    showError(message) {
        this.el.resultStats.innerHTML = `
            <div class="error-message">${message}</div>
        `;
        this.el.paperContainer.innerHTML = '';
        this.el.downloadActions.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[PaperGenerator] 智能题库组卷系统初始化...');
    new PaperGeneratorApp();
});
