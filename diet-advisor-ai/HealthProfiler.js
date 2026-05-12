class HealthProfiler {
    constructor(healthRules) {
        this.healthRules = healthRules;
    }

    calculateBMI(heightCm, weightKg) {
        if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
            return null;
        }
        const heightM = heightCm / 100;
        const bmi = weightKg / (heightM * heightM);
        return parseFloat(bmi.toFixed(1));
    }

    getBMICategory(bmi) {
        if (bmi === null || bmi === undefined) return null;
        const ranges = this.healthRules.bmRanges;
        for (const [key, range] of Object.entries(ranges)) {
            if (bmi >= range.min && bmi < range.max) {
                return { key, label: range.label };
            }
        }
        return null;
    }

    createProfile(options = {}) {
        const {
            heightCm = null,
            weightKg = null,
            age = null,
            gender = null,
            activityLevel = 'moderate',
            conditions = [],
            dietaryPreferences = [],
            allergies = []
        } = options;

        const bmi = this.calculateBMI(heightCm, weightKg);
        const bmiCategory = this.getBMICategory(bmi);

        const derivedConditions = [];
        if (bmiCategory && (bmiCategory.key === 'obese' || bmiCategory.key === 'overweight')) {
            if (!conditions.includes('肥胖')) {
                derivedConditions.push('肥胖');
            }
        }

        const allConditions = [...new Set([...conditions, ...derivedConditions])];

        const riskScore = this.calculateRiskScore(allConditions, bmi);
        const dailyCalories = this.estimateDailyCalories(weightKg, heightCm, age, gender, activityLevel);

        return {
            heightCm,
            weightKg,
            bmi,
            bmiCategory,
            age,
            gender,
            activityLevel,
            conditions: allConditions,
            dietaryPreferences,
            allergies,
            riskScore,
            dailyCalories,
            hasDiabetes: allConditions.includes('糖尿病'),
            hasHypertension: allConditions.includes('高血压'),
            hasHeartDisease: allConditions.includes('心脏病')
        };
    }

    calculateRiskScore(conditions, bmi) {
        let score = 0;
        const conditionScores = {
            '糖尿病': 30,
            '高血压': 25,
            '心脏病': 35,
            '肥胖': 20
        };

        for (const condition of conditions) {
            score += conditionScores[condition] || 10;
        }

        if (bmi) {
            if (bmi >= 30) score += 15;
            else if (bmi >= 28) score += 10;
            else if (bmi >= 24) score += 5;
        }

        return Math.min(score, 100);
    }

    estimateDailyCalories(weightKg, heightCm, age, gender, activityLevel) {
        if (!weightKg || !heightCm || !age || !gender) return null;

        let bmr;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
        }

        const activityMultipliers = {
            'sedentary': 1.2,
            'moderate': 1.55,
            'active': 1.725
        };

        return Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));
    }

    updateProfile(profile, updates) {
        return this.createProfile({ ...profile, ...updates });
    }
}

window.HealthProfiler = HealthProfiler;
