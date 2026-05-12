const techNews = [
    { id: 1, title: "人工智能大模型竞争加剧", category: "科技", tags: ["人工智能", "大模型", "AI"] },
    { id: 2, title: "特斯拉发布全新自动驾驶技术", category: "科技", tags: ["特斯拉", "自动驾驶", "新能源汽车", "AI"] },
    { id: 3, title: "量子计算机取得重大突破", category: "科技", tags: ["量子计算", "IBM", "科技突破"] },
    { id: 4, title: "5G网络覆盖率突破90%", category: "科技", tags: ["5G", "通信", "工信部"] },
    { id: 5, title: "苹果Vision Pro销量超预期", category: "科技", tags: ["元宇宙", "VR", "AR", "苹果"] },
    { id: 6, title: "芯片产业链复苏", category: "科技", tags: ["芯片", "台积电", "英伟达"] },
    { id: 7, title: "华为Mate 80发布", category: "科技", tags: ["华为", "Mate 80", "5G", "手机"] },
    { id: 8, title: "微信小程序生态突破", category: "科技", tags: ["微信", "小程序", "腾讯"] },
    { id: 9, title: "新能源汽车智能化", category: "科技", tags: ["新能源汽车", "自动驾驶", "比亚迪"] },
    { id: 10, title: "生成式AI游戏应用", category: "科技", tags: ["AI", "游戏", "生成式AI", "AIGC"] },
    { id: 11, title: "ChatGPT企业版发布", category: "科技", tags: ["人工智能", "大模型", "AI", "OpenAI"] },
    { id: 12, title: "物联网设备爆发增长", category: "科技", tags: ["物联网", "智能家居", "智能设备"] }
];

const sportsNews = [
    { id: 13, title: "欧冠决赛皇马夺冠", category: "体育", tags: ["足球", "欧冠", "皇马"] },
    { id: 14, title: "梅西世界杯出征", category: "体育", tags: ["足球", "梅西", "世界杯"] },
    { id: 15, title: "C罗沙特联赛", category: "体育", tags: ["足球", "C罗", "沙特联赛"] },
    { id: 16, title: "曼城英超卫冕", category: "体育", tags: ["足球", "英超", "曼城"] },
    { id: 17, title: "中超联赛上海海港", category: "体育", tags: ["足球", "中超", "上海海港"] },
    { id: 18, title: "女足亚洲杯", category: "体育", tags: ["足球", "女足", "亚洲杯"] },
    { id: 19, title: "NBA总决赛湖人", category: "体育", tags: ["篮球", "NBA", "湖人", "詹姆斯"] },
    { id: 20, title: "欧洲杯开幕", category: "体育", tags: ["足球", "欧洲杯", "德国"] }
];

const financeNews = [
    { id: 21, title: "美联储暂停加息", category: "财经", tags: ["美联储", "加息", "货币政策"] },
    { id: 22, title: "A股市场震荡", category: "财经", tags: ["A股", "股票", "上证指数"] },
    { id: 23, title: "房地产政策优化", category: "财经", tags: ["房地产", "楼市", "政策"] }
];

const allNews = [...techNews, ...sportsNews, ...financeNews];

class SimpleUserProfile {
    constructor() {
        this.interests = {};
        this.clickHistory = [];
        this.totalClicks = 0;
    }

    recordClick(news) {
        this.totalClicks++;
        
        const categoryWeight = 4;
        const tagWeight = 8;
        
        const category = news.category;
        if (category) {
            if (!this.interests[category]) {
                this.interests[category] = { score: 0, clickCount: 0 };
            }
            this.interests[category].clickCount++;
            this.interests[category].score += categoryWeight;
        }

        if (Array.isArray(news.tags)) {
            for (const tag of news.tags) {
                if (tag) {
                    if (!this.interests[tag]) {
                        this.interests[tag] = { score: 0, clickCount: 0 };
                    }
                    this.interests[tag].clickCount++;
                    this.interests[tag].score += tagWeight;
                }
            }
        }

        this.clickHistory.unshift({
            newsId: news.id,
            category: category || null,
            tags: Array.isArray(news.tags) ? [...news.tags] : [],
            timestamp: Date.now()
        });
    }

    getScoreForTag(tag) {
        if (tag && this.interests[tag]) {
            return this.interests[tag].score;
        }
        return 0;
    }

    getTopInterests(topN = 50) {
        const interests = [];
        for (const key in this.interests) {
            interests.push({
                name: key,
                score: this.interests[key].score,
                clickCount: this.interests[key].clickCount
            });
        }
        interests.sort((a, b) => b.score - a.score);
        return interests.slice(0, topN);
    }

    getRecentClicks(limit = 20) {
        return this.clickHistory.slice(0, limit);
    }

    getProfile() {
        return {
            interests: { ...this.interests },
            totalClicks: this.totalClicks
        };
    }

    resetProfile() {
        this.interests = {};
        this.clickHistory = [];
        this.totalClicks = 0;
    }
}

class SimpleRecommendationEngine {
    constructor(userProfile) {
        this.userProfile = userProfile;
    }

    calculateTagMatchScore(news) {
        const newsTags = news.tags || [];
        
        if (newsTags.length === 0) {
            return 0;
        }
        
        let totalScore = 0;
        let matchCount = 0;
        
        for (const tag of newsTags) {
            const tagScore = this.userProfile.getScoreForTag(tag);
            if (tagScore > 0) {
                totalScore += tagScore;
                matchCount++;
            }
        }
        
        if (matchCount > 0) {
            const coverageBoost = (matchCount / newsTags.length) * 10;
            return totalScore + coverageBoost;
        }
        
        return 0;
    }

    calculateCategoryMatchScore(news) {
        const categoryScore = this.userProfile.getScoreForTag(news.category);
        if (categoryScore > 0) {
            return categoryScore * 0.5;
        }
        return 0;
    }

    calculateCollaborativeScore(news, recentClicks, allNews) {
        if (!recentClicks || recentClicks.length === 0) {
            return 0;
        }
        
        let similarityScore = 0;
        let totalWeight = 0;
        let isRecentlyClicked = 0;
        
        for (let i = 0; i < recentClicks.length; i++) {
            const clickedNews = allNews.find(n => n.id === recentClicks[i].newsId);
            if (!clickedNews) continue;
            
            if (clickedNews.id === news.id) {
                isRecentlyClicked = 3;
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
            
            const tagSimilarity = clickedNews.tags && clickedNews.tags.length > 0 
                ? tagMatchCount / Math.max(clickedNews.tags.length, newsTags.length)
                : 0;
            
            similarityScore += tagSimilarity * recencyWeight;
        }
        
        const baseScore = totalWeight > 0 ? similarityScore / totalWeight * 5 : 0;
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
        
        scoredNews.sort((a, b) => b.finalScore - a.finalScore);
        
        return scoredNews.slice(0, limit);
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
        
        const sorted = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return sorted;
    }
}

console.log('=' .repeat(70));
console.log('动态加权算法验证 - 点击5次科技新闻后的得分测试');
console.log('=' .repeat(70));

const userProfile = new SimpleUserProfile();
const engine = new SimpleRecommendationEngine(userProfile);

console.log('\n[测试1: 动态加权算法验证]');
console.log('  权重配置: 分类权重=4, 标签权重=8');
console.log('  期望: 点击5次科技新闻后，相关新闻得分应显著高于10.0');

const testTechNews = techNews.slice(0, 5);
console.log('\n  点击的5篇科技新闻:');
for (let i = 0; i < 5; i++) {
    const news = testTechNews[i];
    userProfile.recordClick(news);
    console.log(`    ${i + 1}. ${news.title}`);
    console.log(`       标签: [${news.tags.join(', ')}]`);
}

console.log('\n  用户画像分数:');
const topInterests = userProfile.getTopInterests(10);
let techScore = 0;
let aiScore = 0;
for (const interest of topInterests) {
    console.log(`    ${interest.name}: score=${interest.score.toFixed(1)}`);
    if (interest.name === '科技') techScore = interest.score;
    if (interest.name === 'AI') aiScore = interest.score;
}

console.log('\n  验证:');
console.log(`    科技分类分数: ${techScore} (期望: 5次 * 4 = 20)`);
console.log(`    AI标签分数: ${aiScore} (期望: 多次出现 * 8 > 16)`);

const passScore = techScore > 10 && aiScore > 10;
console.log(`    结果: ${passScore ? '✓ 通过' : '✗ 失败'}`);

console.log('\n[测试2: 推荐得分验证]');
const recommendations = engine.getRecommendations(allNews, 10);

console.log('\n  前10条推荐结果:');
let techCount = 0;
let highScoreCount = 0;
recommendations.forEach((item, index) => {
    const isTech = item.news.category === '科技';
    if (isTech) techCount++;
    if (item.finalScore > 10.0) highScoreCount++;
    
    const icon = isTech ? '💻' : '  ';
    console.log(`    ${index + 1}. [${icon}] ${item.news.title}`);
    console.log(`       得分: ${item.finalScore.toFixed(1)} (标签: ${item.tagMatchScore.toFixed(1)}, 分类: ${item.categoryMatchScore.toFixed(1)}, 协同: ${item.collaborativeScore.toFixed(1)})`);
    console.log(`       标签: [${item.news.tags.join(', ')}]`);
});

console.log('\n[测试3: 统计验证]');
const topCategories = engine.getTopCategoriesFromRecommendations(recommendations);
const topTags = engine.getTopTagsFromRecommendations(recommendations, 5);

console.log('\n  前10条分类分布:');
topCategories.forEach(([category, count]) => {
    console.log(`    ${category}: ${count}条`);
});

console.log('\n  前10条热门标签:');
topTags.forEach(([tag, count], index) => {
    console.log(`    ${index + 1}. ${tag}: ${count}次`);
});

console.log('\n  推荐结果验证:');
console.log(`    科技新闻数量: ${techCount}条 (期望: 前10条以科技为主)`);
console.log(`    得分>10.0的新闻: ${highScoreCount}条 (期望: 多条新闻得分>10.0)`);

const passRecommendations = techCount >= 5 && highScoreCount >= 5;
console.log(`    结果: ${passRecommendations ? '✓ 通过' : '✗ 失败'}`);

console.log('\n[测试4: 数据污染验证 - 点击1篇体育新闻]');
userProfile.recordClick(sportsNews[0]);
const newRecommendations = engine.getRecommendations(allNews, 10);
let newTechCount = 0;
newRecommendations.forEach(item => {
    if (item.news.category === '科技') newTechCount++;
});

console.log(`  点击体育新闻前科技新闻数: ${techCount}条`);
console.log(`  点击体育新闻后科技新闻数: ${newTechCount}条`);
console.log(`  结果: ${newTechCount >= 5 ? '✓ 科技偏好保持良好' : '⚠ 科技偏好明显下降'}`);

console.log('\n' + '=' .repeat(70));
console.log('最终验证结果:');
console.log('=' .repeat(70));
console.log(`  画像分数验证: ${passScore ? '✓ 通过' : '✗ 失败'}`);
console.log(`  推荐结果验证: ${passRecommendations ? '✓ 通过' : '✗ 失败'}`);

const allPass = passScore && passRecommendations;
if (allPass) {
    console.log(`  总体结果: ✓ 所有测试通过！`);
    console.log('\n🎉 动态加权算法验证成功！');
    console.log(`   点击5次科技新闻后，科技分类分数=${techScore}，AI标签分数=${aiScore}`);
    console.log(`   前10条推荐中有${techCount}条科技新闻，${highScoreCount}条得分>10.0`);
} else {
    console.log(`  总体结果: ✗ 部分测试失败，请检查算法逻辑`);
}
console.log('=' .repeat(70));

process.exit(allPass ? 0 : 1);
