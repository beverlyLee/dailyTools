import { TagHierarchy } from './TagHierarchy.js';

export class UserProfile {
    constructor(algorithmConfig) {
        this.algorithmConfig = algorithmConfig;
        this.tagHierarchy = new TagHierarchy();
        this.storageKey = 'news_user_profile_v6';
        this.profile = this.loadProfile();
    }

    loadProfile() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return this.sanitizeProfile(parsed);
            } catch (e) {
                console.error('[UserProfile] 解析用户画像失败:', e);
            }
        }
        return this.createEmptyProfile();
    }

    createEmptyProfile() {
        return {
            interests: {},
            clickHistory: [],
            viewHistory: [],
            totalClicks: 0,
            lastUpdate: null,
            version: 6
        };
    }

    sanitizeProfile(profile) {
        const result = this.createEmptyProfile();
        
        if (profile.interests && typeof profile.interests === 'object') {
            for (const key in profile.interests) {
                if (profile.interests[key] && typeof profile.interests[key] === 'object') {
                    const score = profile.interests[key].score || 0;
                    result.interests[key] = {
                        score: typeof score === 'number' && !isNaN(score) ? score : 0,
                        clickCount: Math.max(0, Math.floor(profile.interests[key].clickCount || 0)),
                        viewTime: Math.max(0, profile.interests[key].viewTime || 0),
                        lastInteraction: profile.interests[key].lastInteraction || null,
                        level: profile.interests[key].level || this.tagHierarchy.getLevel(key) || 5,
                        childTags: Array.isArray(profile.interests[key].childTags) 
                            ? profile.interests[key].childTags 
                            : []
                    };
                }
            }
        }
        
        if (Array.isArray(profile.clickHistory)) {
            result.clickHistory = profile.clickHistory.filter(h => 
                h && h.newsId && h.timestamp
            ).slice(0, 200);
        }
        
        if (Array.isArray(profile.viewHistory)) {
            result.viewHistory = profile.viewHistory.filter(h => 
                h && h.newsId && h.timestamp
            ).slice(0, 200);
        }
        
        result.totalClicks = Math.max(0, Math.floor(profile.totalClicks || 0));
        result.lastUpdate = profile.lastUpdate || null;
        
        return result;
    }

    saveProfile() {
        try {
            this.profile.lastUpdate = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
        } catch (e) {
            console.error('[UserProfile] 保存用户画像失败:', e);
        }
    }

    getOrCreateInterest(key) {
        const normalizedKey = this.tagHierarchy.normalizeTag(key) || key;
        
        if (!this.profile.interests[normalizedKey]) {
            this.profile.interests[normalizedKey] = {
                score: 0,
                clickCount: 0,
                viewTime: 0,
                lastInteraction: null,
                level: this.tagHierarchy.getLevel(normalizedKey) || 5,
                childTags: []
            };
        }
        return this.profile.interests[normalizedKey];
    }

    calculateBaseScore(news) {
        const { min, max } = this.algorithmConfig?.getBaseScoreRange() || { min: 1, max: 10 };
        const range = max - min;
        
        const profile = this.getProfile();
        
        if (profile.totalClicks === 0) {
            return (min + max) / 2;
        }
        
        const newsCategory = news.category;
        const newsTags = news.tags || [];
        
        let matchScore = 0;
        
        const categoryScore = this.getScoreForTag(newsCategory);
        if (categoryScore > 0) {
            matchScore += 0.3;
        }
        
        let matchingTagCount = 0;
        for (const tag of newsTags) {
            if (this.getScoreForTag(tag) > 0) {
                matchingTagCount++;
            }
        }
        
        if (newsTags.length > 0) {
            matchScore += (matchingTagCount / newsTags.length) * 0.7;
        }
        
        const baseScore = min + (matchScore * range);
        
        return Math.max(min, Math.min(max, baseScore));
    }

    extractTagLocations(news) {
        const locations = new Map();
        const title = (news.title || '').toLowerCase();
        const content = (news.content || '').toLowerCase();
        const explicitTags = news.tags || [];
        
        const allTags = new Set(explicitTags);
        
        for (const tag of explicitTags) {
            const normalized = this.tagHierarchy.normalizeTag(tag);
            if (normalized) {
                allTags.add(normalized);
                
                const ancestors = this.tagHierarchy.getAncestors(normalized, true);
                for (const ancestor of ancestors) {
                    allTags.add(ancestor);
                }
            }
        }
        
        for (const tag of allTags) {
            if (!tag) continue;
            
            const tagLower = tag.toLowerCase();
            const locationInfo = {
                tag,
                inTitle: false,
                inContent: false,
                inExplicitTags: false,
                bestLocation: null
            };
            
            if (explicitTags.includes(tag) || 
                explicitTags.some(t => this.tagHierarchy.normalizeTag(t) === tag)) {
                locationInfo.inExplicitTags = true;
                locationInfo.bestLocation = 'tag';
            }
            
            if (title.includes(tagLower)) {
                locationInfo.inTitle = true;
                locationInfo.bestLocation = 'title';
            }
            
            if (content.includes(tagLower) && !locationInfo.inTitle) {
                locationInfo.inContent = true;
                if (!locationInfo.bestLocation) {
                    locationInfo.bestLocation = 'content';
                }
            }
            
            if (locationInfo.inTitle || locationInfo.inContent || locationInfo.inExplicitTags) {
                locations.set(tag, locationInfo);
            }
        }
        
        return locations;
    }

    calculateTagImportance(tag, locationInfo) {
        if (!locationInfo || !locationInfo.bestLocation) {
            return this.algorithmConfig?.getTagImportanceWeight('tag') ?? 0.8;
        }
        
        return this.algorithmConfig?.getTagImportanceWeight(locationInfo.bestLocation) ?? 1.0;
    }

    recordClick(news) {
        if (!news || !news.id) {
            console.warn('[UserProfile] 无效的新闻数据，跳过记录点击');
            return;
        }

        this.profile.totalClicks = (this.profile.totalClicks || 0) + 1;
        
        const baseScore = this.calculateBaseScore(news);
        const aggregateThreshold = this.algorithmConfig?.getAggregateThreshold() ?? 2;
        
        console.log('[UserProfile] 基础分计算:', {
            newsTitle: news.title,
            baseScore,
            totalClicks: this.profile.totalClicks
        });
        
        const category = news.category;
        if (category) {
            const categoryScore = baseScore;
            const interest = this.getOrCreateInterest(category);
            interest.clickCount++;
            interest.score += categoryScore;
            interest.lastInteraction = Date.now();
            
            console.log('[UserProfile] 分类得分:', {
                category,
                categoryScore,
                newScore: interest.score
            });
        }
        
        const allNewsTags = news.tags || [];
        const tagLocations = this.extractTagLocations(news);
        
        const aggregatedResults = this.tagHierarchy.aggregateForProfile(allNewsTags);
        
        console.log('[UserProfile] 标签聚合结果:', {
            originalTags: allNewsTags,
            aggregatedResults: aggregatedResults.map(r => ({
                tag: r.tag,
                level: r.level,
                childCount: r.childCount,
                children: r.children
            }))
        });
        
        const processedAggregatedTags = new Set();
        
        for (const result of aggregatedResults) {
            const { tag, level, childCount, children } = result;
            
            if (processedAggregatedTags.has(tag)) continue;
            
            let shouldAggregate = childCount >= aggregateThreshold;
            
            if (!shouldAggregate && children.length > 0) {
                const childrenInLocations = children.filter(child => tagLocations.has(child));
                if (childrenInLocations.length >= aggregateThreshold) {
                    shouldAggregate = true;
                }
            }
            
            let totalTagScore = 0;
            const bestLocations = [];
            
            if (shouldAggregate) {
                processedAggregatedTags.add(tag);
                
                for (const child of children) {
                    const childLocation = tagLocations.get(child);
                    if (childLocation) {
                        const importance = this.calculateTagImportance(child, childLocation);
                        const childScore = baseScore * importance;
                        totalTagScore += childScore;
                        bestLocations.push(childLocation.bestLocation);
                        processedAggregatedTags.add(child);
                    }
                }
                
                if (tagLocations.has(tag)) {
                    const locationInfo = tagLocations.get(tag);
                    const importance = this.calculateTagImportance(tag, locationInfo);
                    const tagScore = baseScore * importance;
                    totalTagScore += tagScore;
                    bestLocations.push(locationInfo.bestLocation);
                }
                
                const interest = this.getOrCreateInterest(tag);
                interest.clickCount += childCount;
                interest.score += totalTagScore;
                interest.lastInteraction = Date.now();
                interest.level = level;
                
                interest.childTags = [...new Set([...interest.childTags, ...children])];
                
                console.log('[UserProfile] 聚合标签得分:', {
                    aggregatedTag: tag,
                    level,
                    childCount,
                    children,
                    bestLocations,
                    totalTagScore,
                    newScore: interest.score
                });
            }
        }
        
        for (const [tag, locationInfo] of tagLocations.entries()) {
            if (processedAggregatedTags.has(tag)) continue;
            
            const ancestors = this.tagHierarchy.getAncestors(tag, true);
            let isAlreadyCounted = false;
            for (const ancestor of ancestors) {
                if (processedAggregatedTags.has(ancestor)) {
                    isAlreadyCounted = true;
                    break;
                }
            }
            if (isAlreadyCounted) continue;
            
            const importance = this.calculateTagImportance(tag, locationInfo);
            const tagScore = baseScore * importance;
            
            const interest = this.getOrCreateInterest(tag);
            interest.clickCount++;
            interest.score += tagScore;
            interest.lastInteraction = Date.now();
            interest.level = this.tagHierarchy.getLevel(tag) || 5;
            
            console.log('[UserProfile] 单独标签得分:', {
                tag,
                level: interest.level,
                location: locationInfo.bestLocation,
                importance,
                tagScore,
                newScore: interest.score
            });
        }
        
        this.profile.clickHistory.unshift({
            newsId: news.id,
            category: category || null,
            tags: Array.isArray(news.tags) ? [...news.tags] : [],
            baseScore,
            timestamp: Date.now()
        });

        if (this.profile.clickHistory.length > 200) {
            this.profile.clickHistory = this.profile.clickHistory.slice(0, 200);
        }

        this.saveProfile();
    }

    recordViewTime(news, viewTimeSeconds) {
        if (!news || !news.id) {
            console.warn('[UserProfile] 无效的新闻数据，跳过记录阅读时长');
            return;
        }

        const safeViewTime = Math.max(0, viewTimeSeconds);
        const maxViewTimeScore = this.algorithmConfig?.get('profile.maxViewTimeScore') ?? 5;
        const timeScore = Math.min(safeViewTime / 30, maxViewTimeScore);
        const viewTimeCategoryWeight = this.algorithmConfig?.get('profile.viewTimeCategoryWeight') ?? 2;
        const viewTimeTagWeight = this.algorithmConfig?.get('profile.viewTimeTagWeight') ?? 4;
        
        const category = news.category;
        if (category) {
            const interest = this.getOrCreateInterest(category);
            interest.viewTime += safeViewTime;
            interest.score = interest.score + timeScore * viewTimeCategoryWeight;
            interest.lastInteraction = Date.now();
        }

        const allNewsTags = news.tags || [];
        const aggregatedResults = this.tagHierarchy.aggregateForProfile(allNewsTags);
        const aggregateThreshold = this.algorithmConfig?.getAggregateThreshold() ?? 2;
        
        const processedTags = new Set();
        
        for (const result of aggregatedResults) {
            const { tag, childCount } = result;
            
            if (processedTags.has(tag)) continue;
            
            const shouldAggregate = childCount >= aggregateThreshold;
            
            if (shouldAggregate) {
                processedTags.add(tag);
                for (const child of result.children) {
                    processedTags.add(child);
                }
                
                const interest = this.getOrCreateInterest(tag);
                interest.viewTime += safeViewTime;
                interest.score = interest.score + timeScore * viewTimeTagWeight * childCount;
                interest.lastInteraction = Date.now();
            }
        }
        
        for (const tag of allNewsTags) {
            if (processedTags.has(tag)) continue;
            
            const ancestors = this.tagHierarchy.getAncestors(tag, true);
            let isAlreadyCounted = false;
            for (const ancestor of ancestors) {
                if (processedTags.has(ancestor)) {
                    isAlreadyCounted = true;
                    break;
                }
            }
            if (isAlreadyCounted) continue;
            
            const interest = this.getOrCreateInterest(tag);
            interest.viewTime += safeViewTime;
            interest.score = interest.score + timeScore * viewTimeTagWeight;
            interest.lastInteraction = Date.now();
        }

        this.profile.viewHistory.unshift({
            newsId: news.id,
            viewTime: safeViewTime,
            timestamp: Date.now()
        });

        if (this.profile.viewHistory.length > 200) {
            this.profile.viewHistory = this.profile.viewHistory.slice(0, 200);
        }

        this.saveProfile();
    }

    getTopInterests(topN = 10) {
        const interests = [];
        for (const key in this.profile.interests) {
            const interest = this.profile.interests[key];
            if (interest && typeof interest.score === 'number') {
                interests.push({
                    name: key,
                    score: interest.score,
                    clickCount: interest.clickCount || 0,
                    viewTime: interest.viewTime || 0,
                    level: interest.level || this.tagHierarchy.getLevel(key) || 5,
                    childTags: interest.childTags || []
                });
            }
        }
        
        interests.sort((a, b) => {
            const scoreDiff = b.score - a.score;
            if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
            return a.level - b.level;
        });
        
        return interests.slice(0, topN);
    }

    getInterestVector() {
        const vector = {};
        for (const key in this.profile.interests) {
            if (this.profile.interests[key]) {
                vector[key] = this.profile.interests[key].score;
            }
        }
        return vector;
    }

    getScoreForTag(tag) {
        if (!tag) return 0;
        
        const normalizedTag = this.tagHierarchy.normalizeTag(tag);
        if (normalizedTag && this.profile.interests[normalizedTag]) {
            return this.profile.interests[normalizedTag].score;
        }
        
        return 0;
    }

    getScoreForTagWithHierarchy(tag) {
        if (!tag) return 0;
        
        const normalizedTag = this.tagHierarchy.normalizeTag(tag);
        if (!normalizedTag) return 0;
        
        let totalScore = 0;
        
        if (this.profile.interests[normalizedTag]) {
            totalScore += this.profile.interests[normalizedTag].score;
        }
        
        const ancestors = this.tagHierarchy.getAncestors(normalizedTag, true);
        const hierarchyBonus = this.algorithmConfig?.get('recommendation.hierarchyMatchBonus') ?? 0.5;
        
        for (const ancestor of ancestors) {
            if (this.profile.interests[ancestor] && ancestor !== normalizedTag) {
                totalScore += this.profile.interests[ancestor].score * hierarchyBonus;
            }
        }
        
        return totalScore;
    }

    getClickCountForTag(tag) {
        if (!tag) return 0;
        
        const normalizedTag = this.tagHierarchy.normalizeTag(tag);
        if (normalizedTag && this.profile.interests[normalizedTag]) {
            return Math.max(0, this.profile.interests[normalizedTag].clickCount || 0);
        }
        
        return 0;
    }

    getRecentClicks(limit = 20) {
        const safeLimit = Math.max(0, Math.floor(limit));
        return (this.profile.clickHistory || []).slice(0, safeLimit);
    }

    resetProfile() {
        this.profile = this.createEmptyProfile();
        this.saveProfile();
    }

    getProfile() {
        return {
            interests: { ...this.profile.interests },
            clickHistory: [...this.profile.clickHistory],
            viewHistory: [...this.profile.viewHistory],
            totalClicks: this.profile.totalClicks || 0,
            lastUpdate: this.profile.lastUpdate
        };
    }

    getAggregatedInterests(minLevel = 1) {
        const interests = [];
        for (const key in this.profile.interests) {
            const interest = this.profile.interests[key];
            const level = interest.level || this.tagHierarchy.getLevel(key) || 5;
            
            if (level >= minLevel && level <= 3) {
                interests.push({
                    name: key,
                    score: interest.score,
                    clickCount: interest.clickCount || 0,
                    viewTime: interest.viewTime || 0,
                    level,
                    childTags: interest.childTags || []
                });
            }
        }
        
        interests.sort((a, b) => b.score - a.score);
        return interests;
    }
}
