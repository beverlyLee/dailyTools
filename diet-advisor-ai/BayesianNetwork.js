class SimpleBayesianNetwork {
    constructor() {
        this.networks = {};
        this.initializeDefaultNetworks();
    }

    initializeDefaultNetworks() {
        this.networks.diabetes = {
            nodes: {
                FoodType: {
                    values: ['Safe', 'ModerateRisk', 'HighRisk'],
                    probabilities: {
                        Safe: 0.5,
                        ModerateRisk: 0.3,
                        HighRisk: 0.2
                    }
                },
                GlycemicIndex: {
                    parent: 'FoodType',
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        Safe: { Low: 0.7, Medium: 0.25, High: 0.05 },
                        ModerateRisk: { Low: 0.2, Medium: 0.5, High: 0.3 },
                        HighRisk: { Low: 0.05, Medium: 0.2, High: 0.75 }
                    }
                },
                SugarContent: {
                    parent: 'FoodType',
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        Safe: { Low: 0.75, Medium: 0.2, High: 0.05 },
                        ModerateRisk: { Low: 0.15, Medium: 0.55, High: 0.3 },
                        HighRisk: { Low: 0.05, Medium: 0.15, High: 0.8 }
                    }
                },
                Risk: {
                    parents: ['GlycemicIndex', 'SugarContent'],
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        'Low,Low': { Low: 0.85, Medium: 0.12, High: 0.03 },
                        'Low,Medium': { Low: 0.55, Medium: 0.35, High: 0.1 },
                        'Low,High': { Low: 0.2, Medium: 0.5, High: 0.3 },
                        'Medium,Low': { Low: 0.5, Medium: 0.4, High: 0.1 },
                        'Medium,Medium': { Low: 0.25, Medium: 0.5, High: 0.25 },
                        'Medium,High': { Low: 0.08, Medium: 0.42, High: 0.5 },
                        'High,Low': { Low: 0.15, Medium: 0.5, High: 0.35 },
                        'High,Medium': { Low: 0.05, Medium: 0.35, High: 0.6 },
                        'High,High': { Low: 0.02, Medium: 0.18, High: 0.8 }
                    }
                }
            }
        };

        this.networks.hypertension = {
            nodes: {
                FoodType: {
                    values: ['Safe', 'ModerateRisk', 'HighRisk'],
                    probabilities: { Safe: 0.5, ModerateRisk: 0.3, HighRisk: 0.2 }
                },
                Sodium: {
                    parent: 'FoodType',
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        Safe: { Low: 0.6, Medium: 0.3, High: 0.1 },
                        ModerateRisk: { Low: 0.2, Medium: 0.5, High: 0.3 },
                        HighRisk: { Low: 0.1, Medium: 0.3, High: 0.6 }
                    }
                },
                Fat: {
                    parent: 'FoodType',
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        Safe: { Low: 0.55, Medium: 0.35, High: 0.1 },
                        ModerateRisk: { Low: 0.15, Medium: 0.5, High: 0.35 },
                        HighRisk: { Low: 0.05, Medium: 0.25, High: 0.7 }
                    }
                },
                Risk: {
                    parents: ['Sodium', 'Fat'],
                    values: ['Low', 'Medium', 'High'],
                    cpt: {
                        'Low,Low': { Low: 0.8, Medium: 0.18, High: 0.02 },
                        'Low,Medium': { Low: 0.5, Medium: 0.4, High: 0.1 },
                        'Low,High': { Low: 0.2, Medium: 0.55, High: 0.25 },
                        'Medium,Low': { Low: 0.45, Medium: 0.45, High: 0.1 },
                        'Medium,Medium': { Low: 0.2, Medium: 0.55, High: 0.25 },
                        'Medium,High': { Low: 0.08, Medium: 0.42, High: 0.5 },
                        'High,Low': { Low: 0.2, Medium: 0.5, High: 0.3 },
                        'High,Medium': { Low: 0.05, Medium: 0.35, High: 0.6 },
                        'High,High': { Low: 0.02, Medium: 0.18, High: 0.8 }
                    }
                }
            }
        };
    }

    discretizeValue(value, thresholds) {
        if (value <= thresholds[0]) return 'Low';
        if (value <= thresholds[1]) return 'Medium';
        return 'High';
    }

    inferRisk(networkName, evidence) {
        const network = this.networks[networkName];
        if (!network) return null;

        const nodes = network.nodes;
        const riskNode = nodes.Risk;
        let parentValues = [];
        
        if (!riskNode.parents) return null;

        for (const parent of riskNode.parents) {
            parentValues.push(evidence[parent]);
        }

        const key = parentValues.join(',');
        return riskNode.cpt[key] || null;
    }

    evaluateDiabetesRisk(food) {
        const giThresholds = [55, 70];
        const sugarThresholds = [5, 15];

        const evidence = {
            GlycemicIndex: this.discretizeValue(food.glycemicIndex || 0, giThresholds),
            SugarContent: this.discretizeValue(food.sugar || 0, sugarThresholds)
        };

        const riskDistribution = this.inferRisk('diabetes', evidence);

        let riskLevel = 'Low';
        let probability = 0;

        if (riskDistribution) {
            probability = riskDistribution.High;
            if (riskDistribution.High >= 0.5) {
                riskLevel = 'High';
            } else if (riskDistribution.Medium >= 0.4 || riskDistribution.High >= 0.25) {
                riskLevel = 'Medium';
            }
        }

        return {
            type: 'diabetes',
            riskLevel,
            probability,
            distribution: riskDistribution,
            evidence,
            recommendations: this.generateDiabetesAdvice(riskLevel, food)
        };
    }

    evaluateHypertensionRisk(food) {
        const sodiumThresholds = [100, 300];
        const fatThresholds = [5, 15];

        const evidence = {
            Sodium: this.discretizeValue(food.sodium || 0, sodiumThresholds),
            Fat: this.discretizeValue(food.fat || 0, fatThresholds)
        };

        const riskDistribution = this.inferRisk('hypertension', evidence);

        let riskLevel = 'Low';
        let probability = 0;

        if (riskDistribution) {
            probability = riskDistribution.High;
            if (riskDistribution.High >= 0.5) {
                riskLevel = 'High';
            } else if (riskDistribution.Medium >= 0.4 || riskDistribution.High >= 0.25) {
                riskLevel = 'Medium';
            }
        }

        return {
            type: 'hypertension',
            riskLevel,
            probability,
            distribution: riskDistribution,
            evidence,
            recommendations: this.generateHypertensionAdvice(riskLevel, food)
        };
    }

    generateDiabetesAdvice(riskLevel, food) {
        const advice = [];
        if (riskLevel === 'High') {
            advice.push(`${food.name}的血糖风险较高，建议减少或避免食用。`);
            if (food.glycemicIndex > 55) {
                advice.push('升糖指数较高，会快速升高血糖。');
            }
            if (food.sugar > 10) {
                advice.push('糖分含量高，糖尿病患者应严格控制。');
            }
        } else if (riskLevel === 'Medium') {
            advice.push(`${food.name}有中度风险，可适量食用，建议搭配高纤维食物。`);
        }
        return advice;
    }

    generateHypertensionAdvice(riskLevel, food) {
        const advice = [];
        if (riskLevel === 'High') {
            advice.push(`${food.name}对高血压患者风险较高。`);
            if (food.sodium > 200) {
                advice.push('钠含量较高，可能导致血压升高。');
            }
            if (food.fat > 15) {
                advice.push('脂肪含量高，不利于心血管健康。');
            }
        } else if (riskLevel === 'Medium') {
            advice.push(`${food.name}有中度风险，建议控制食用量。`);
        }
        return advice;
    }

    evaluateMealRisk(mealResult, healthProfile) {
        const risks = [];
        const conditions = healthProfile.conditions || [];

        for (const item of mealResult.items) {
            const food = item.food;
            const itemRisks = [];

            if (conditions.includes('糖尿病')) {
                const risk = this.evaluateDiabetesRisk(food);
                if (risk.riskLevel !== 'Low') {
                    itemRisks.push(risk);
                }
            }

            if (conditions.includes('高血压') || conditions.includes('心脏病')) {
                const risk = this.evaluateHypertensionRisk(food);
                if (risk.riskLevel !== 'Low') {
                    itemRisks.push(risk);
                }
            }

            if (itemRisks.length > 0) {
                risks.push({
                    food: item.name,
                    matchedText: item.matchedText,
                    risks: itemRisks
                });
            }
        }

        const hasHighRisk = risks.some(r => r.risks.some(x => x.riskLevel === 'High'));
        const hasMediumRisk = risks.some(r => r.risks.some(x => x.riskLevel === 'Medium'));

        return {
            risks,
            overallLevel: hasHighRisk ? 'High' : hasMediumRisk ? 'Medium' : 'Low',
            highRiskCount: risks.filter(r => r.risks.some(x => x.riskLevel === 'High')).length,
            recommendations: this.compileRecommendations(risks)
        };
    }

    compileRecommendations(risks) {
        const recommendations = [];
        const seenRecs = new Set();

        for (const risk of risks) {
            for (const itemRisk of risk.risks) {
                if (itemRisk.recommendations) {
                    for (const rec of itemRisk.recommendations) {
                        if (!seenRecs.has(rec)) {
                            recommendations.push(rec);
                            seenRecs.add(rec);
                        }
                    }
                }
            }
        }

        return recommendations;
    }
}

window.SimpleBayesianNetwork = SimpleBayesianNetwork;
