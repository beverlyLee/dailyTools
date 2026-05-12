export class PaperOptimizer {
    constructor() {
        this.selectedIds = new Set();
    }

    optimize(filteredPool, constraints) {
        this.selectedIds.clear();
        const paper = [];
        const typeOrder = ["选择题", "填空题", "解答题"];

        const difficultyDistribution = constraints.difficultyDistribution || { easy: 0.3, medium: 0.5, hard: 0.2 };
        const topicDistribution = constraints.topicDistribution;

        const typeConfig = constraints.typeDistribution;
        const typeStats = {};

        for (const type of typeOrder) {
            const config = typeConfig[type];
            if (!config || config.count <= 0) continue;

            const typeQuestions = this.selectByType(
                filteredPool[type],
                config.count,
                topicDistribution,
                difficultyDistribution
            );

            paper.push(...typeQuestions);
            typeStats[type] = {
                requested: config.count,
                selected: typeQuestions.length
            };
        }

        const result = this.analyzeResult(paper, constraints, typeStats);
        return { paper, ...result };
    }

    selectByType(topicPool, countNeeded, topicDistribution, difficultyDistribution) {
        const selected = [];

        const getDifficultyKey = (d) => {
            if (d <= 1) return 'easy';
            if (d <= 2) return 'medium';
            return 'hard';
        };

        const diffTargetCount = {
            easy: Math.max(0, Math.round(countNeeded * difficultyDistribution.easy)),
            medium: Math.max(0, Math.round(countNeeded * difficultyDistribution.medium)),
            hard: Math.max(0, Math.round(countNeeded * difficultyDistribution.hard))
        };

        let totalAllocated = diffTargetCount.easy + diffTargetCount.medium + diffTargetCount.hard;
        if (totalAllocated < countNeeded) {
            const maxDiff = Object.keys(diffTargetCount).reduce((a, b) => 
                difficultyDistribution[a] > difficultyDistribution[b] ? a : b);
            diffTargetCount[maxDiff] += (countNeeded - totalAllocated);
        } else if (totalAllocated > countNeeded) {
            const minDiff = Object.keys(diffTargetCount).reduce((a, b) => 
                difficultyDistribution[a] < difficultyDistribution[b] ? a : b);
            diffTargetCount[minDiff] = Math.max(0, diffTargetCount[minDiff] - (totalAllocated - countNeeded));
        }

        const topicTargetCount = {};
        for (const [topic, ratio] of Object.entries(topicDistribution)) {
            topicTargetCount[topic] = Math.max(0, Math.round(countNeeded * ratio));
        }

        let topicTotal = Object.values(topicTargetCount).reduce((a, b) => a + b, 0);
        if (topicTotal < countNeeded) {
            const maxTopic = Object.keys(topicTargetCount).reduce((a, b) => 
                topicDistribution[a] > topicDistribution[b] ? a : b);
            topicTargetCount[maxTopic] += (countNeeded - topicTotal);
        }

        const flattenedPool = [];
        for (const [topic, diffMap] of Object.entries(topicPool)) {
            for (const [diff, subMap] of Object.entries(diffMap)) {
                for (const [subDiff, questions] of Object.entries(subMap)) {
                    for (const q of questions) {
                        if (!this.selectedIds.has(q.id)) {
                            flattenedPool.push({ q, subDiff });
                        }
                    }
                }
            }
        }

        const pickedByDiff = { easy: 0, medium: 0, hard: 0 };
        const pickedByTopic = {};
        for (const topic of Object.keys(topicDistribution)) {
            pickedByTopic[topic] = 0;
        }

        const pickedBySubDiff = { '基础': 0, '进阶': 0 };

        const scoreQuestion = (item, pickedByDiff, pickedByTopic, pickedBySubDiff) => {
            const q = item.q;
            const subDiff = item.subDiff;
            const diffKey = getDifficultyKey(q.difficulty);
            const diffRemaining = diffTargetCount[diffKey] - pickedByDiff[diffKey];
            const topicRemaining = topicTargetCount[q.topic] - (pickedByTopic[q.topic] || 0);
            const subDiffCount = pickedBySubDiff[subDiff] || 0;

            let score = 0;
            if (diffRemaining > 0) score += 200;
            if (topicRemaining > 0) score += 100;
            score -= (pickedByDiff[diffKey] * 20);
            score -= ((pickedByTopic[q.topic] || 0) * 10);
            score -= (subDiffCount * 30);

            return score;
        };

        const availablePool = [...flattenedPool];
        let remaining = countNeeded;

        while (remaining > 0 && availablePool.length > 0) {
            availablePool.sort((a, b) => 
                scoreQuestion(b, pickedByDiff, pickedByTopic, pickedBySubDiff) - 
                scoreQuestion(a, pickedByDiff, pickedByTopic, pickedBySubDiff)
            );

            const best = availablePool.shift();

            if (best && !this.selectedIds.has(best.q.id)) {
                selected.push(best.q);
                this.selectedIds.add(best.q.id);

                const diffKey = getDifficultyKey(best.q.difficulty);
                pickedByDiff[diffKey]++;
                pickedByTopic[best.q.topic] = (pickedByTopic[best.q.topic] || 0) + 1;
                pickedBySubDiff[best.subDiff] = (pickedBySubDiff[best.subDiff] || 0) + 1;

                remaining--;
            }
        }

        return this.sortByKnowledgePoint(selected);
    }

    sortByKnowledgePoint(questions) {
        const byKnowledge = {};
        const result = [];

        for (const q of questions) {
            const key = q.knowledgePoint;
            if (!byKnowledge[key]) byKnowledge[key] = [];
            byKnowledge[key].push(q);
        }

        for (const list of Object.values(byKnowledge)) {
            result.push(...list);
        }

        return result;
    }

    analyzeResult(paper, constraints, typeStats) {
        const totalScore = paper.reduce((sum, q) => sum + q.score, 0);
        const topicStats = {};
        const typeStatsResult = {};
        const difficultyStats = {
            easy: { count: 0, score: 0 },
            medium: { count: 0, score: 0 },
            hard: { count: 0, score: 0 }
        };

        const knowledgePoints = new Set();
        const questionIds = new Set();
        let hasDuplicates = false;

        for (const q of paper) {
            if (!topicStats[q.topic]) topicStats[q.topic] = { count: 0, score: 0 };
            topicStats[q.topic].count++;
            topicStats[q.topic].score += q.score;

            if (!typeStatsResult[q.type]) typeStatsResult[q.type] = { count: 0, score: 0 };
            typeStatsResult[q.type].count++;
            typeStatsResult[q.type].score += q.score;

            const diffKey = q.difficulty <= 1 ? 'easy' : (q.difficulty <= 2 ? 'medium' : 'hard');
            difficultyStats[diffKey].count++;
            difficultyStats[diffKey].score += q.score;

            knowledgePoints.add(q.knowledgePoint);

            if (questionIds.has(q.id)) {
                hasDuplicates = true;
            }
            questionIds.add(q.id);
        }

        const topicRatios = {};
        for (const [topic, stat] of Object.entries(topicStats)) {
            topicRatios[topic] = totalScore > 0 ? (stat.score / totalScore).toFixed(2) : "0";
        }

        const difficultyRatios = {};
        for (const [diff, stat] of Object.entries(difficultyStats)) {
            difficultyRatios[diff] = totalScore > 0 ? (stat.score / totalScore).toFixed(2) : "0";
        }

        const typeCountMatch = this.checkTypeCountMatch(typeStatsResult, constraints.typeDistribution);

        return {
            totalScore,
            topicStats,
            typeStats: typeStatsResult,
            difficultyStats,
            topicRatios,
            difficultyRatios,
            uniqueKnowledgePoints: knowledgePoints.size,
            hasDuplicates,
            typeCountMatch,
            meetsTopicRatio: this.checkTopicRatio(topicStats, constraints, totalScore)
        };
    }

    checkTopicRatio(topicStats, constraints, totalScore) {
        if (totalScore === 0) return false;

        for (const [topic, targetRatio] of Object.entries(constraints.topicDistribution)) {
            const stat = topicStats[topic] || { score: 0 };
            const actualRatio = stat.score / totalScore;
            const diff = Math.abs(actualRatio - targetRatio);
            if (diff > 0.15) return false;
        }
        return true;
    }

    checkTypeCountMatch(typeStats, typeDistribution) {
        for (const [type, config] of Object.entries(typeDistribution)) {
            if (config.count > 0) {
                const stat = typeStats[type] || { count: 0 };
                if (stat.count !== config.count) {
                    return false;
                }
            }
        }
        return true;
    }
}
