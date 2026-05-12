export class QuestionFilter {
    constructor(questionBank) {
        this.questionBank = questionBank;
        this.fixedScores = questionBank.fixedScores || {
            "选择题": 3,
            "填空题": 4,
            "解答题": 10
        };
    }

    validateResources(constraints) {
        const errors = [];
        const warnings = [];

        let pool = [...this.questionBank.questions];
        pool = pool.filter(q => q.subject === constraints.subject);

        const topics = Object.entries(constraints.topicDistribution)
            .filter(([topic, ratio]) => ratio > 0)
            .map(([topic]) => topic);
        if (topics.length > 0) {
            pool = pool.filter(q => topics.includes(q.topic));
        }

        const difficultyDist = constraints.difficultyDistribution || { easy: 0.3, medium: 0.5, hard: 0.2 };
        const isAllEasy = difficultyDist.easy >= 0.9;
        const isAllMedium = difficultyDist.medium >= 0.9;
        const isAllHard = difficultyDist.hard >= 0.9;

        if (isAllEasy) {
            pool = pool.filter(q => q.difficulty <= 1);
        } else if (isAllMedium) {
            pool = pool.filter(q => q.difficulty === 2);
        } else if (isAllHard) {
            pool = pool.filter(q => q.difficulty >= 3);
        }

        const typeConfig = constraints.typeDistribution;
        const typeOrder = ["选择题", "填空题", "解答题"];

        for (const type of typeOrder) {
            const config = typeConfig[type];
            if (!config || config.count <= 0) continue;

            const typePool = pool.filter(q => q.type === type);
            const availableCount = typePool.length;

            if (config.count > availableCount) {
                errors.push(`题库资源不足：${type} 题库中只有 ${availableCount} 道符合条件的题目，无法选择 ${config.count} 道`);
            }

            const topics = Object.entries(constraints.topicDistribution)
                .filter(([topic, ratio]) => ratio > 0)
                .map(([topic]) => topic);
            for (const topic of topics) {
                const ratio = constraints.topicDistribution[topic];
                const targetCount = Math.round(config.count * ratio);
                const topicPool = typePool.filter(q => q.topic === topic);
                
                if (targetCount > 0 && topicPool.length < targetCount) {
                    warnings.push(`${type} - ${topic}：目标 ${targetCount} 道，可用 ${topicPool.length} 道，可能影响知识点分布`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    filter(constraints) {
        let pool = [...this.questionBank.questions];

        pool = pool.filter(q => q.subject === constraints.subject);

        const topics = Object.entries(constraints.topicDistribution)
            .filter(([topic, ratio]) => ratio > 0)
            .map(([topic]) => topic);
        if (topics.length > 0) {
            pool = pool.filter(q => topics.includes(q.topic));
        }

        const difficultyDist = constraints.difficultyDistribution || { easy: 0.3, medium: 0.5, hard: 0.2 };
        const isAllEasy = difficultyDist.easy >= 0.9;
        const isAllMedium = difficultyDist.medium >= 0.9;
        const isAllHard = difficultyDist.hard >= 0.9;

        if (isAllEasy) {
            pool = pool.filter(q => q.difficulty <= 1);
        } else if (isAllMedium) {
            pool = pool.filter(q => q.difficulty === 2);
        } else if (isAllHard) {
            pool = pool.filter(q => q.difficulty >= 3);
        }

        return this.groupByTypeTopicDifficultySub(pool);
    }

    groupByTypeTopicDifficultySub(questions) {
        const grouped = {};
        const types = ["选择题", "填空题", "解答题"];
        const topics = ["代数", "几何"];
        const difficulties = ["easy", "medium", "hard"];
        const subDifficulties = ["基础", "进阶"];

        types.forEach(type => {
            grouped[type] = {};
            topics.forEach(topic => {
                grouped[type][topic] = {};
                difficulties.forEach(diff => {
                    grouped[type][topic][diff] = {};
                    subDifficulties.forEach(sub => {
                        grouped[type][topic][diff][sub] = [];
                    });
                });
            });
        });

        questions.forEach(q => {
            const diffKey = q.difficulty <= 1 ? 'easy' : (q.difficulty <= 2 ? 'medium' : 'hard');
            const subDiff = q.subDifficulty || '基础';
            if (grouped[q.type] && grouped[q.type][q.topic] && grouped[q.type][q.topic][diffKey]) {
                grouped[q.type][q.topic][diffKey][subDiff].push(q);
            }
        });

        return grouped;
    }

    getPoolStats(constraints) {
        let pool = [...this.questionBank.questions];
        pool = pool.filter(q => q.subject === constraints.subject);

        const topics = Object.keys(constraints.topicDistribution);
        if (topics.length > 0) {
            pool = pool.filter(q => topics.includes(q.topic));
        }

        const stats = {
            total: pool.length,
            byType: {},
            byDifficulty: {
                easy: pool.filter(q => q.difficulty <= 1).length,
                medium: pool.filter(q => q.difficulty === 2).length,
                hard: pool.filter(q => q.difficulty >= 3).length
            }
        };

        const types = ["选择题", "填空题", "解答题"];
        types.forEach(type => {
            stats.byType[type] = pool.filter(q => q.type === type).length;
        });

        return stats;
    }
}
