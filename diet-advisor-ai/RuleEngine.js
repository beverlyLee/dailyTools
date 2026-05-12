class RuleEngine {
    constructor(healthRules) {
        this.healthRules = healthRules;
        this.conditionProfiles = healthRules.conditionProfiles;
    }

    evaluateMealAgainstCondition(mealAggregate, condition) {
        const profile = this.conditionProfiles[condition];
        if (!profile) return null;

        const violations = [];

        if (profile.maxGlycemicIndex && mealAggregate.avgGlycemicIndex > 0) {
            if (mealAggregate.avgGlycemicIndex > profile.maxGlycemicIndex) {
                violations.push({
                    type: 'glycemicIndex',
                    name: '升糖指数过高',
                    value: mealAggregate.avgGlycemicIndex,
                    limit: profile.maxGlycemicIndex,
                    severity: 'high'
                });
            }
        }

        if (profile.maxSugarPerMeal && mealAggregate.sugar > profile.maxSugarPerMeal) {
            violations.push({
                type: 'sugar',
                name: '糖分过高',
                value: mealAggregate.sugar,
                limit: profile.maxSugarPerMeal,
                unit: 'g',
                severity: 'high'
            });
        }

        if (profile.maxCarbsPerMeal && mealAggregate.carbs > profile.maxCarbsPerMeal) {
            violations.push({
                type: 'carbs',
                name: '碳水化合物过高',
                value: mealAggregate.carbs,
                limit: profile.maxCarbsPerMeal,
                unit: 'g',
                severity: 'medium'
            });
        }

        if (profile.maxSodiumPerMeal && mealAggregate.sodium > profile.maxSodiumPerMeal) {
            violations.push({
                type: 'sodium',
                name: '钠含量过高',
                value: mealAggregate.sodium,
                limit: profile.maxSodiumPerMeal,
                unit: 'mg',
                severity: 'medium'
            });
        }

        if (profile.maxFatPerMeal && mealAggregate.fat > profile.maxFatPerMeal) {
            violations.push({
                type: 'fat',
                name: '脂肪过高',
                value: mealAggregate.fat,
                limit: profile.maxFatPerMeal,
                unit: 'g',
                severity: 'medium'
            });
        }

        const tagViolations = [];
        for (const warningTag of profile.warnings || []) {
            if (mealAggregate.tags && mealAggregate.tags.includes(warningTag)) {
                tagViolations.push(warningTag);
            }
        }

        return {
            condition,
            violations,
            tagViolations,
            severity: this.calculateSeverity(violations.length, tagViolations.length),
            profile
        };
    }

    calculateSeverity(nutrientViolations, tagViolations) {
        const total = nutrientViolations + tagViolations;
        if (total >= 3) return 'critical';
        if (total >= 2) return 'high';
        if (total >= 1) return 'medium';
        return 'none';
    }

    evaluateMeal(mealResult, healthProfile) {
        const results = {};
        const allConditions = healthProfile.conditions || [];
        let hasViolations = false;
        const allViolations = [];

        for (const condition of allConditions) {
            const result = this.evaluateMealAgainstCondition(mealResult.aggregate, condition);
            if (result && (result.violations.length > 0 || result.tagViolations.length > 0)) {
                results[condition] = result;
                hasViolations = true;
                allViolations.push(...result.violations);
            }
        }

        const highRiskFoods = [];
        for (const item of mealResult.items) {
            const warnings = item.food.healthWarnings || [];
            for (const condition of allConditions) {
                if (warnings.includes(condition)) {
                    if (!highRiskFoods.find(f => f.name === item.name)) {
                        highRiskFoods.push({
                            name: item.name,
                            matchedText: item.matchedText,
                            reason: `${condition}患者应谨慎食用`,
                            condition
                        });
                    }
                }
            }
        }

        return {
            conditionResults: results,
            hasViolations,
            totalViolations: allViolations.length,
            highRiskFoods,
            overallSeverity: this.determineOverallSeverity(results)
        };
    }

    determineOverallSeverity(results) {
        const severities = Object.values(results).map(r => r.severity);
        if (severities.includes('critical')) return 'critical';
        if (severities.includes('high')) return 'high';
        if (severities.includes('medium')) return 'medium';
        return 'none';
    }

    checkFoodAgainstProfile(food, healthProfile) {
        const warnings = [];
        const conditions = healthProfile.conditions || [];

        for (const condition of conditions) {
            if (food.healthWarnings && food.healthWarnings.includes(condition)) {
                warnings.push({
                    type: 'warning',
                    condition,
                    message: `包含对${condition}患者有风险的成分`
                });
            }

            const profile = this.conditionProfiles[condition];
            if (profile) {
                for (const warningTag of profile.warnings || []) {
                    if (food.tags && food.tags.includes(warningTag)) {
                        warnings.push({
                            type: 'tag',
                            condition,
                            tag: warningTag,
                            message: `包含${warningTag}标签，${condition}患者需注意`
                        });
                    }
                }
            }
        }

        for (const allergy of healthProfile.allergies || []) {
            if (food.dietaryRestrictions && food.dietaryRestrictions.includes(allergy)) {
                warnings.push({
                    type: 'allergy',
                    allergy,
                    message: `含过敏原：${allergy}`
                });
            }
        }

        return {
            food,
            warnings,
            isRecommended: warnings.length === 0,
            riskLevel: warnings.length > 2 ? 'high' : warnings.length > 0 ? 'medium' : 'low'
        };
    }
}

window.RuleEngine = RuleEngine;
