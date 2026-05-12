class DietRecommender {
    constructor(healthRules, foodDatabase, ruleEngine, bayesianNetwork) {
        this.healthRules = healthRules;
        this.foodDatabase = foodDatabase;
        this.foods = foodDatabase.foods;
        this.ruleEngine = ruleEngine;
        this.bayesianNetwork = bayesianNetwork;
    }

    generateRecommendations(mealResult, healthProfile, ruleEvaluation) {
        const warnings = [];
        const replacements = [];
        const suggestions = [];
        const forbiddenFoods = [];
        const approvedFoods = [];

        const conditions = healthProfile.conditions || [];

        for (const condition of conditions) {
            const conditionResult = ruleEvaluation.conditionResults[condition];
            if (conditionResult) {
                for (const violation of conditionResult.violations) {
                    warnings.push({
                        condition,
                        type: violation.type,
                        name: violation.name,
                        message: this.formatViolationMessage(violation, condition)
                    });
                }

                for (const tag of conditionResult.tagViolations) {
                    warnings.push({
                        condition,
                        type: 'tag',
                        tag,
                        message: `餐食包含"${tag}"标签，${condition}患者需注意`
                    });
                }
            }
        }

        for (const highRiskFood of ruleEvaluation.highRiskFoods) {
            forbiddenFoods.push({
                name: highRiskFood.name,
                matchedText: highRiskFood.matchedText,
                reason: highRiskFood.reason
            });
        }

        for (const item of mealResult.items) {
            const replacementRules = this.findReplacements(item.food, conditions);
            for (const rule of replacementRules) {
                replacements.push({
                    from: rule.from,
                    to: rule.to,
                    reason: rule.reason,
                    condition: rule.matchedCondition
                });
            }
        }

        if (conditions.includes('糖尿病')) {
            suggestions.push('建议搭配膳食纤维丰富的食物，有助于延缓碳水吸收。');
            suggestions.push('注意食物的升糖指数，优先选择低GI（<55）的食物。');
            suggestions.push('每餐碳水化合物摄入量建议控制在45-60g以内。');
        }

        if (conditions.includes('高血压')) {
            suggestions.push('建议低钠饮食，每日钠摄入量不超过2000mg。');
            suggestions.push('增加富含钾的食物，有助于血压调节。');
        }

        if (conditions.includes('心脏病')) {
            suggestions.push('建议采用地中海饮食风格，多摄入Omega-3脂肪酸。');
            suggestions.push('限制饱和脂肪和反式脂肪的摄入。');
        }

        if (conditions.includes('肥胖')) {
            suggestions.push('建议控制总热量摄入，每餐500-700卡路里为宜。');
            suggestions.push('增加蛋白质和膳食纤维的摄入，增强饱腹感。');
        }

        const bayesianRisks = this.bayesianNetwork.evaluateMealRisk(mealResult, healthProfile);

        return {
            warnings: this.deduplicate(warnings),
            replacements: this.deduplicateReplacements(replacements),
            suggestions: Array.from(new Set(suggestions)),
            forbiddenFoods: this.deduplicateForbidden(forbiddenFoods),
            approvedFoods: approvedFoods,
            bayesianRisks,
            overallAssessment: this.getOverallAssessment(warnings, replacements, bayesianRisks)
        };
    }

    formatViolationMessage(violation, condition) {
        if (violation.type === 'glycemicIndex') {
            return `平均升糖指数为${violation.value}，${condition}患者建议控制在${violation.limit}以下。`;
        }
        if (violation.type === 'sugar') {
            return `糖分摄入${violation.value}${violation.unit}，超过${condition}患者推荐上限${violation.limit}${violation.unit}。`;
        }
        if (violation.type === 'carbs') {
            return `碳水化合物${violation.value}${violation.unit}，${condition}患者建议控制在${violation.limit}${violation.unit}以内。`;
        }
        if (violation.type === 'sodium') {
            return `钠含量${violation.value}${violation.unit}，${condition}患者建议每餐不超过${violation.limit}${violation.unit}。`;
        }
        if (violation.type === 'fat') {
            return `脂肪摄入${violation.value}${violation.unit}，${condition}患者建议控制在${violation.limit}${violation.unit}以内。`;
        }
        return `${violation.name}，${condition}患者请注意。`;
    }

    findReplacements(food, conditions) {
        const rules = this.healthRules.foodReplacementRules || [];
        const replacements = [];

        for (const rule of rules) {
            if (food.name === rule.from || food.aliases.includes(rule.from)) {
                const matchedCondition = conditions.find(c => (rule.conditions || []).includes(c));
                if (matchedCondition) {
                    replacements.push({
                        from: rule.from,
                        to: rule.to,
                        reason: rule.reason,
                        matchedCondition
                    });
                }
            }
        }

        return replacements;
    }

    deduplicate(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = `${item.condition}-${item.type || item.tag}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    deduplicateReplacements(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = `${item.from}-${item.to}-${item.condition}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    deduplicateForbidden(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = item.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    getOverallAssessment(warnings, replacements, bayesianRisks) {
        const severityOrder = ['critical', 'high', 'medium', 'none'];
        let maxSeverity = 'none';

        for (const warning of warnings) {
            if (warning.type === 'sugar' || warning.type === 'glycemicIndex') {
                if (severityOrder.indexOf('high') < severityOrder.indexOf(maxSeverity)) {
                    maxSeverity = 'high';
                }
            }
        }

        if (bayesianRisks.overallLevel === 'High') {
            if (severityOrder.indexOf('critical') < severityOrder.indexOf(maxSeverity)) {
                maxSeverity = 'critical';
            }
        } else if (bayesianRisks.overallLevel === 'Medium') {
            if (severityOrder.indexOf('medium') < severityOrder.indexOf(maxSeverity)) {
                maxSeverity = 'medium';
            }
        }

        if (warnings.length === 0 && replacements.length === 0 && bayesianRisks.overallLevel === 'Low') {
            maxSeverity = 'none';
        }

        return {
            severity: maxSeverity,
            warningCount: warnings.length,
            replacementCount: replacements.length,
            highRiskCount: bayesianRisks.highRiskCount || 0
        };
    }

    getAlternateFoods(foodName, conditions) {
        const replacements = [];
        const rules = this.healthRules.foodReplacementRules || [];

        for (const rule of rules) {
            if (rule.from === foodName) {
                const altFood = this.foods.find(f => f.name === rule.to);
                if (altFood) {
                    const isSafe = conditions.every(c => 
                        !altFood.healthWarnings || !altFood.healthWarnings.includes(c)
                    );
                    replacements.push({
                        ...altFood,
                        reason: rule.reason
                    });
                }
            }
        }

        return replacements;
    }
}

window.DietRecommender = DietRecommender;
