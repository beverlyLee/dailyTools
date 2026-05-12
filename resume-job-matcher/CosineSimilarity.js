class CosineSimilarity {
    static calculate(vecA, vecB) {
        if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
            throw new Error('向量必须是数组类型');
        }

        if (vecA.length === 0 || vecB.length === 0) {
            throw new Error('向量不能为空');
        }

        if (vecA.length !== vecB.length) {
            throw new Error('向量维度不匹配');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            const a = typeof vecA[i] === 'number' ? vecA[i] : 0;
            const b = typeof vecB[i] === 'number' ? vecB[i] : 0;
            
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

        return Math.max(-1, Math.min(1, similarity));
    }

    static similarityToPercentage(similarity) {
        if (typeof similarity !== 'number' || isNaN(similarity)) {
            return 0;
        }

        const clampedSimilarity = Math.max(-1, Math.min(1, similarity));
        const percentage = ((clampedSimilarity + 1) / 2) * 100;
        return Math.max(0, Math.min(100, Math.round(percentage * 100) / 100));
    }

    static getMatchDescription(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return '无法计算匹配度';
        }

        if (percentage >= 85) {
            return '高度匹配！您的简历与该职位非常契合，强烈建议投递。';
        } else if (percentage >= 60) {
            return '较为匹配。您的简历与该职位有一定契合度，建议优化后投递。';
        } else if (percentage >= 40) {
            return '部分匹配。该职位与您的背景有一定关联，但差距较大。';
        } else {
            return '匹配度较低。建议寻找更契合您技能和经验的职位。';
        }
    }

    static getMatchLevel(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            return 'medium';
        }

        if (percentage >= 85) {
            return 'high';
        } else if (percentage >= 40) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}

export default CosineSimilarity;
