class KeywordExtractor {
    constructor() {
        this.stopWords = new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
            'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
            'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from',
            'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
            'further', 'once', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
            'need', 'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
            'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
            'this', 'that', 'these', 'those', 'am', 'no', 'nor', 'not', 'only',
            'own', 'same', 'so', 'than', 'too', 'very', 'just', 'as', 'also',
            'of', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
            'very', 's', 't', 'can', 'will', 'just', 'don', 'now', 'work', 'job',
            'experience', 'skills', 'skill', 'ability', 'abilities', 'knowledge',
            'working', 'worked', 'years', 'year', 'company', 'companies',
            'project', 'projects', 'team', 'teams', 'member', 'members',
            'developer', 'developers', 'engineer', 'engineers', 'manager',
            'managers', 'senior', 'junior', 'lead', 'role', 'roles',
            'position', 'positions', 'responsibility', 'responsibilities',
            'requirement', 'requirements', 'qualification', 'qualifications',
            'ability', 'abilities', 'must', 'should', 'may', 'might', 'the',
            'and', 'for', 'with', 'in', 'to', 'of', 'on', 'at', 'by', 'from',
            'as', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'have',
            'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
            'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
            'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
            'this', 'that', 'these', 'those', 'am', 'no', 'nor', 'not', 'only',
            'own', 'same', 'so', 'than', 'too', 'very', 'just'
        ]);

        this.technicalKeywords = new Set([
            'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
            'php', 'ruby', 'swift', 'kotlin', 'scala', 'dart', 'objective-c',
            'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
            'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt.js', 'gatsby',
            'node.js', 'express', 'koa', 'nestjs', 'django', 'flask', 'spring',
            'spring boot', 'laravel', 'rails', 'asp.net',
            'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
            'oracle', 'sql server', 'cassandra', 'dynamodb',
            'docker', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp', 'cloud',
            'git', 'github', 'gitlab', 'ci/cd', 'jenkins', 'travis', 'circleci',
            'rest', 'restful', 'api', 'graphql', 'grpc', 'soap',
            'machine learning', 'ml', 'deep learning', 'ai', 'nlp',
            'tensorflow', 'pytorch', 'scikit-learn', 'keras',
            'agile', 'scrum', 'kanban', 'devops', 'microservices',
            'testing', 'jest', 'mocha', 'chai', 'selenium', 'cypress',
            'webpack', 'vite', 'rollup', 'babel',
            'linux', 'unix', 'bash', 'shell',
            'rest api', 'web services', 'microservice', 'full stack',
            'front-end', 'frontend', 'back-end', 'backend', 'full-stack'
        ]);
    }

    extractKeywords(text, topN = 20) {
        if (typeof text !== 'string' || text.trim() === '') {
            return [];
        }

        try {
            const words = this.tokenize(text);
            const wordFreq = new Map();
            const wordScore = new Map();

            if (Array.isArray(words)) {
                for (const word of words) {
                    if (typeof word === 'string') {
                        const lowerWord = word.toLowerCase();
                        if (this.isValidKeyword(lowerWord)) {
                            wordFreq.set(lowerWord, (wordFreq.get(lowerWord) || 0) + 1);
                        }
                    }
                }
            }

            const phrases = this.extractPhrases(text);
            if (Array.isArray(phrases)) {
                for (const phrase of phrases) {
                    if (typeof phrase === 'string') {
                        const lowerPhrase = phrase.toLowerCase();
                        if (this.technicalKeywords.has(lowerPhrase)) {
                            wordScore.set(lowerPhrase, (wordScore.get(lowerPhrase) || 0) + 5);
                        }
                    }
                }
            }

            for (const [word, freq] of wordFreq) {
                let score = typeof freq === 'number' ? freq : 0;
                if (this.technicalKeywords.has(word)) {
                    score *= 3;
                }
                if (typeof word === 'string' && word.length > 4) {
                    score *= 1.5;
                }
                wordScore.set(word, (wordScore.get(word) || 0) + score);
            }

            const sortedKeywords = Array.from(wordScore.entries())
                .sort((a, b) => {
                    const scoreA = typeof a[1] === 'number' ? a[1] : 0;
                    const scoreB = typeof b[1] === 'number' ? b[1] : 0;
                    return scoreB - scoreA;
                })
                .slice(0, typeof topN === 'number' ? topN : 20)
                .map(entry => entry[0]);

            return sortedKeywords;
        } catch (error) {
            console.error('提取关键词失败:', error);
            return [];
        }
    }

    tokenize(text) {
        if (typeof text !== 'string') {
            return [];
        }

        try {
            return text
                .toLowerCase()
                .replace(/[^a-zA-Z0-9+\-#]/g, ' ')
                .split(/\s+/)
                .filter(word => typeof word === 'string' && word.length > 1);
        } catch (error) {
            console.error('分词失败:', error);
            return [];
        }
    }

    extractPhrases(text) {
        if (typeof text !== 'string') {
            return [];
        }

        try {
            const phrases = [];
            const lowerText = text.toLowerCase();
            
            for (const keyword of this.technicalKeywords) {
                if (typeof keyword === 'string' && 
                    keyword.includes(' ') && 
                    lowerText.includes(keyword)) {
                    phrases.push(keyword);
                }
            }

            return phrases;
        } catch (error) {
            console.error('提取短语失败:', error);
            return [];
        }
    }

    isValidKeyword(word) {
        return typeof word === 'string' && 
               word.length > 1 && 
               !this.stopWords.has(word) &&
               !/^\d+$/.test(word);
    }

    findMissingKeywords(resumeText, jobText) {
        try {
            const resumeKeywordsArray = this.extractKeywords(resumeText, 30);
            const jobKeywords = this.extractKeywords(jobText, 30);

            const resumeKeywords = new Set();
            if (Array.isArray(resumeKeywordsArray)) {
                for (const k of resumeKeywordsArray) {
                    if (typeof k === 'string') {
                        resumeKeywords.add(k.toLowerCase());
                    }
                }
            }

            if (!Array.isArray(jobKeywords)) {
                return [];
            }

            const missingKeywords = jobKeywords.filter(keyword => {
                if (typeof keyword !== 'string') {
                    return false;
                }
                return !resumeKeywords.has(keyword.toLowerCase());
            });

            return missingKeywords.slice(0, 15);
        } catch (error) {
            console.error('查找缺失关键词失败:', error);
            return [];
        }
    }
}

export default KeywordExtractor;
