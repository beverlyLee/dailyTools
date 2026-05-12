import { TagHierarchy } from './TagHierarchy.js';

export class RecommendationEngine {
    constructor(userProfile, contentFeature, algorithmConfig) {
        this.userProfile = userProfile;
        this.contentFeature = contentFeature;
        this.algorithmConfig = algorithmConfig;
        this.tagHierarchy = new TagHierarchy();
    }

    calculateTagMatchScore(news) {
        const newsTags = news.tags || [];
        
        if (newsTags.length === 0) {
            return 0;
        }
        
        const tagMatchBoost = this.algorithmConfig?.get('recommendation.tagMatchBoost') ?? 0.3;
        
        let totalScore = 0;
        let matchCount = 0;
        
        for (const tag of newsTags) {
            const tagScore = this.userProfile.getScoreForTagWithHierarchy(tag);
            if (tagScore > 0) {
                totalScore += tagScore;
                matchCount++;
            }
        }
        
        if (matchCount > 0) {
            const coverageBoost = (matchCount / newsTags.length) * (tagMatchBoost * 33.33);
            return totalScore + coverageBoost;
        }
        
        return 0;
    }

    calculateCategoryMatchScore(news) {
        const categoryMatchMultiplier = this.algorithmConfig?.get('recommendation.categoryMatchMultiplier') ?? 0.5;
        const categoryScore = this.userProfile.getScoreForTag(news.category);
        if (categoryScore > 0) {
            return categoryScore * categoryMatchMultiplier;
        }
        return 0;
    }

    calculateCollaborativeScore(news, recentClicks, allNews) {
        if (!recentClicks || recentClicks.length === 0) {
            return 0;
        }
        
        const collaborativeBaseMultiplier = this.algorithmConfig?.get('recommendation.collaborativeBaseMultiplier') ?? 5;
        const recentlyClickedPenalty = this.algorithmConfig?.get('recommendation.recentlyClickedPenalty') ?? 3;
        
        let similarityScore = 0;
        let totalWeight = 0;
        let isRecentlyClicked = 0;
        
        for (let i = 0; i < recentClicks.length; i++) {
            const clickedNews = allNews.find(n => n.id === recentClicks[i].newsId);
            if (!clickedNews) continue;
            
            if (clickedNews.id === news.id) {
                isRecentlyClicked = recentlyClickedPenalty;
            }
            
            const recencyWeight = Math.max(0.3, 1 - i * 0.1);
            totalWeight += recencyWeight;
            
            const clickedTags = new Set(clickedNews.tags || []);
            const newsTags = news.tags || [];
            
            let tagMatchCount = 0;
            for (const tag of newsTags) {
                if (clickedTags.has(tag)) {
                    tagMatchCount++;
                }
            }
            
            for (const tag of newsTags) {
                const ancestors = this.tagHierarchy.getAncestors(tag, true);
                for (const clickedTag of clickedTags) {
                    if (tag !== clickedTag) {
                        const clickedAncestors = this.tagHierarchy.getAncestors(clickedTag, true);
                        for (const ancestor of ancestors) {
                            if (clickedAncestors.includes(ancestor) && !clickedTags.has(ancestor)) {
                                tagMatchCount += 0.5;
                                break;
                            }
                        }
                    }
                }
            }
            
            const tagSimilarity = clickedNews.tags && clickedNews.tags.length > 0 
                ? tagMatchCount / Math.max(clickedNews.tags.length, newsTags.length)
                : 0;
            
            similarityScore += tagSimilarity * recencyWeight;
        }
        
        const baseScore = totalWeight > 0 ? similarityScore / totalWeight * collaborativeBaseMultiplier : 0;
        return Math.max(baseScore - isRecentlyClicked, 0);
    }

    calculateFinalScore(news, recentClicks, allNews) {
        const tagMatchScore = this.calculateTagMatchScore(news);
        const categoryMatchScore = this.calculateCategoryMatchScore(news);
        const collaborativeScore = this.calculateCollaborativeScore(news, recentClicks, allNews);
        
        const hasInterests = this.userProfile.getProfile().totalClicks > 0;
        
        let finalScore;
        if (hasInterests) {
            finalScore = tagMatchScore + categoryMatchScore + collaborativeScore;
        } else {
            finalScore = Math.random() * 10 + 1;
        }
        
        return {
            news,
            tagMatchScore,
            categoryMatchScore,
            collaborativeScore,
            finalScore: Math.max(0, finalScore)
        };
    }

    getRecommendations(allNews, limit = 10) {
        const recentClicks = this.userProfile.getRecentClicks(10);
        
        const scoredNews = allNews.map(news => 
            this.calculateFinalScore(news, recentClicks, allNews)
        );
        
        scoredNews.sort((a, b) => {
            const scoreDiff = b.finalScore - a.finalScore;
            if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
            return Math.random() - 0.5;
        });
        
        return scoredNews.slice(0, limit);
    }

    getTrendingNews(allNews, limit = 10) {
        const shuffled = [...allNews].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit);
    }

    getNewsByCategory(allNews, category, limit = 10) {
        const categoryNews = allNews.filter(news => news.category === category);
        const shuffled = [...categoryNews].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit);
    }

    getTopCategoriesFromRecommendations(recommendations) {
        const categoryCounts = {};
        for (const item of recommendations) {
            const category = item.news.category;
            if (!categoryCounts[category]) {
                categoryCounts[category] = 0;
            }
            categoryCounts[category]++;
        }
        
        const sorted = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1]);
        
        return sorted;
    }

    getTopTagsFromRecommendations(recommendations, limit = 3) {
        const tagCounts = {};
        for (const item of recommendations) {
            const tags = item.news.tags || [];
            for (const tag of tags) {
                if (!tagCounts[tag]) {
                    tagCounts[tag] = 0;
                }
                tagCounts[tag]++;
            }
        }
        
        const aggregatedTags = {};
        for (const [tag, count] of Object.entries(tagCounts)) {
            const normalizedTag = this.tagHierarchy.normalizeTag(tag);
            if (normalizedTag) {
                if (!aggregatedTags[normalizedTag]) {
                    aggregatedTags[normalizedTag] = 0;
                }
                aggregatedTags[normalizedTag] += count;
            }
        }
        
        const sorted = Object.entries(aggregatedTags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return sorted;
    }

    getHierarchyMatchBonus() {
        return this.algorithmConfig?.get('recommendation.hierarchyMatchBonus') ?? 0.5;
    }
}
