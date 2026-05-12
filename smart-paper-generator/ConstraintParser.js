export class ConstraintParser {
    constructor() {
        this.defaultConstraints = {
            subject: "初中数学",
            totalScore: 100,
            difficulty: null,
            difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
            typeDistribution: {
                "选择题": { count: 10, scoreEach: 3 },
                "填空题": { count: 5, scoreEach: 4 },
                "解答题": { count: 3, scoreEach: 10 }
            },
            topicDistribution: {
                "代数": 0.6,
                "几何": 0.4
            }
        };
    }

    parse(input) {
        const constraints = JSON.parse(JSON.stringify(this.defaultConstraints));

        if (input.subject) constraints.subject = input.subject;
        if (input.totalScore) constraints.totalScore = Number(input.totalScore);

        if (input.difficulty) {
            constraints.difficulty = input.difficulty;
            if (input.difficulty === "easy") {
                constraints.difficultyDistribution = { easy: 0.6, medium: 0.3, hard: 0.1 };
            } else if (input.difficulty === "medium") {
                constraints.difficultyDistribution = { easy: 0.2, medium: 0.6, hard: 0.2 };
            } else if (input.difficulty === "hard") {
                constraints.difficultyDistribution = { easy: 0.1, medium: 0.3, hard: 0.6 };
            }
        }

        if (input.typeDistribution) {
            constraints.typeDistribution = input.typeDistribution;
        }

        if (input.topicDistribution) {
            constraints.topicDistribution = input.topicDistribution;
        }

        if (input.difficultyDistribution) {
            constraints.difficultyDistribution = input.difficultyDistribution;
        }

        return this.validate(constraints);
    }

    validate(constraints) {
        const errors = [];

        const topicSum = Object.values(constraints.topicDistribution).reduce((a, b) => a + b, 0);
        if (Math.abs(topicSum - 1) > 0.01) {
            errors.push("知识点占比之和必须为1（100%）");
        }

        const diffSum = Object.values(constraints.difficultyDistribution).reduce((a, b) => a + b, 0);
        if (Math.abs(diffSum - 1) > 0.01) {
            errors.push("难度分布之和必须为1（100%）");
        }

        const calcTotal = Object.values(constraints.typeDistribution)
            .reduce((sum, t) => sum + (t.count * t.scoreEach), 0);

        return {
            constraints,
            isValid: errors.length === 0,
            errors,
            calculatedTotalScore: calcTotal
        };
    }
}
