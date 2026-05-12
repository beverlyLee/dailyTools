import { UserProfile } from './UserProfile.js';
import { ContentFeature } from './ContentFeature.js';
import { RecommendationEngine } from './RecommendationEngine.js';
import { AlgorithmConfig } from './AlgorithmConfig.js';

class TestRecommender {
    constructor() {
        this.algorithmConfig = new AlgorithmConfig();
        this.userProfile = new UserProfile(this.algorithmConfig);
        this.contentFeature = new ContentFeature();
        this.recommendationEngine = new RecommendationEngine(
            this.userProfile,
            this.contentFeature,
            this.algorithmConfig
        );
        this.newsData = this.generateTestNewsData();
    }

    generateTestNewsData() {
        let id = 1;
        const createNews = (title, content, category, tags, source) => ({
            id: id++,
            title,
            content,
            category,
            tags,
            source
        });

        return [
            createNews("欧冠决赛：皇马击败多特蒙德夺冠", "北京时间5月26日凌晨，2025-2026赛季欧冠决赛在温布利球场展开争夺，皇家马德里凭借维尼修斯的梅开二度，以2-1击败多特蒙德，队史第15次夺得欧冠冠军。", "体育", ["足球", "欧冠", "皇马", "多特蒙德"], "体育新闻"),
            createNews("梅西宣布将参加2026世界杯", "阿根廷球星梅西近日在接受采访时表示，他将代表阿根廷国家队参加2026年美加墨世界杯，这将是他第五次参加世界杯赛事。", "体育", ["足球", "梅西", "世界杯", "阿根廷"], "足球报"),
            createNews("C罗转会沙特联赛取得成功", "葡萄牙球星C罗在沙特联赛的首个赛季表现出色，帮助利雅得胜利队夺得联赛冠军，个人也以35粒进球荣膺射手王。", "体育", ["足球", "C罗", "沙特联赛", "利雅得胜利"], "环球体育"),
            createNews("英超联赛：曼城卫冕成功", "2025-2026赛季英超联赛落下帷幕，曼城队以领先第二名阿森纳5分的优势成功卫冕，实现英超四连冠的伟业。", "体育", ["足球", "英超", "曼城", "阿森纳"], "BBC体育"),
            createNews("中超联赛：上海海港夺冠", "2025赛季中超联赛收官，上海海港队以总积分68分夺得冠军，这是他们队史第三座中超联赛冠军奖杯。", "体育", ["足球", "中超", "上海海港"], "中国体育报"),
            createNews("女足亚洲杯：中国队晋级四强", "在女足亚洲杯四分之一决赛中，中国女足凭借王霜的绝杀进球，以2-1击败日本女足，成功晋级半决赛。", "体育", ["足球", "女足", "亚洲杯", "中国女足"], "体育周报"),
            createNews("欧洲杯开幕：24支球队角逐冠军", "2026年欧洲杯在德国盛大开幕，24支欧洲强队将在一个月的时间里争夺欧洲足球最高荣誉。", "体育", ["足球", "欧洲杯", "德国"], "欧洲体育"),
            createNews("姆巴佩转会皇马", "姆巴佩正式加盟皇家马德里，转会费创历史新高，这位法国新星将在伯纳乌开启新的征程。", "体育", ["足球", "姆巴佩", "皇马", "转会"], "马卡报"),
            createNews("哈兰德再夺英超金靴", "曼城前锋哈兰德以40粒进球蝉联英超金靴，帮助球队成功卫冕联赛冠军，个人表现无可挑剔。", "体育", ["足球", "哈兰德", "曼城", "英超"], "天空体育"),
            createNews("利物浦欧冠小组赛全胜晋级", "利物浦在欧冠小组赛中以六战全胜的战绩晋级淘汰赛，展现了强大的统治力。", "体育", ["足球", "利物浦", "欧冠", "英超"], "镜报"),
            createNews("巴萨西甲联赛夺冠在望", "巴塞罗那在西甲联赛中领先第二名12分，距离本赛季联赛冠军仅一步之遥。", "体育", ["足球", "巴萨", "西甲", "巴塞罗那"], "阿斯报"),
            createNews("拜仁慕尼黑德甲八连冠", "拜仁慕尼黑成功卫冕德甲冠军，创造了德甲八连冠的辉煌纪录。", "体育", ["足球", "拜仁", "德甲", "慕尼黑"], "图片报"),
            createNews("国米意甲联赛强势夺冠", "国际米兰以领先第二名15分的巨大优势夺得意甲冠军，时隔11年再次登顶。", "体育", ["足球", "国米", "意甲", "国际米兰"], "米兰体育报"),
            createNews("巴黎圣日耳曼法甲三连冠", "巴黎圣日耳曼成功实现法甲三连冠，姆巴佩和内马尔的组合展现了强大的攻击力。", "体育", ["足球", "巴黎", "法甲", "内马尔"], "队报"),
            
            createNews("NBA总决赛：湖人对阵凯尔特人", "2026年NBA总决赛对阵出炉，洛杉矶湖人将与波士顿凯尔特人展开终极对决，詹姆斯有望再夺总冠军。", "体育", ["篮球", "NBA", "湖人", "凯尔特人", "詹姆斯"], "ESPN"),
            
            createNews("人工智能大模型竞争加剧", "全球科技巨头纷纷发布新一代大语言模型，AI技术竞争进入白热化阶段。专家预测，2026年将是AI应用规模化落地的关键一年。", "科技", ["人工智能", "大模型", "AI"], "科技日报"),
            createNews("特斯拉发布全新自动驾驶技术", "特斯拉在年度投资者日上发布了FSD 3.0版本自动驾驶技术，宣称将实现完全无人驾驶，预计明年开始向用户推送。", "科技", ["特斯拉", "自动驾驶", "新能源汽车"], "36氪"),
            createNews("量子计算机取得重大突破", "IBM宣布其最新量子计算机实现了1000量子比特的突破，这一进展将为密码学、药物研发等领域带来革命性变化。", "科技", ["量子计算", "IBM", "科技突破"], "Nature"),
            createNews("5G网络覆盖率突破90%", "工信部最新数据显示，我国5G网络覆盖率已突破90%，用户数超过6亿，5G应用场景持续扩展。", "科技", ["5G", "通信", "工信部"], "新华网"),
            createNews("元宇宙概念再次升温", "随着VR/AR技术的成熟和苹果Vision Pro的热销，元宇宙概念再次成为资本市场关注焦点。", "科技", ["元宇宙", "VR", "AR", "苹果"], "界面新闻"),
            createNews("芯片产业链复苏迹象明显", "全球芯片市场需求回暖，台积电、英伟达等巨头业绩超预期，半导体行业迎来新一轮增长周期。", "科技", ["芯片", "台积电", "英伟达", "半导体"], "第一财经"),
            
            createNews("美联储宣布加息25个基点", "美联储联邦公开市场委员会宣布将联邦基金利率目标区间上调25个基点，市场预计这将是本轮加息周期的最后一次。", "财经", ["美联储", "加息", "货币政策"], "华尔街见闻"),
            createNews("A股市场震荡上行", "上证指数本周累计上涨2.3%，创业板指表现更为强势，科技、新能源板块领涨两市。", "财经", ["A股", "股票", "上证指数", "创业板"], "东方财富"),
            createNews("房地产政策持续优化", "多个城市出台房地产市场调控新政策，包括降低首付比例、放宽限购等措施，市场信心逐步恢复。", "财经", ["房地产", "楼市", "政策"], "经济日报"),
            createNews("原油价格波动加剧", "受地缘政治因素影响，国际原油价格近期波动加剧，布伦特原油期货价格突破每桶85美元。", "财经", ["原油", "油价", "能源"], "金融时报"),
            createNews("人民币汇率保持稳定", "在全球货币波动的背景下，人民币汇率保持相对稳定，对美元汇率维持在7.1附近。", "财经", ["人民币", "汇率", "外汇"], "中国人民银行"),
            createNews("新能源汽车销量创新高", "2026年第一季度，我国新能源汽车销量突破200万辆，市场渗透率达到45%，继续领跑全球。", "财经", ["新能源汽车", "销量", "比亚迪"], "乘联会"),
            
            createNews("《流浪地球3》票房破50亿", "科幻大片《流浪地球3》上映两周票房突破50亿，成为春节档最大赢家，口碑票房双丰收。", "娱乐", ["电影", "流浪地球", "票房"], "猫眼电影"),
            createNews("周杰伦世界巡演启动", "华语乐坛天王周杰伦2026世界巡回演唱会正式启动，首站上海开票即秒罄，粉丝热情高涨。", "娱乐", ["周杰伦", "演唱会", "音乐"], "新浪娱乐"),
            createNews("国产剧出海成绩亮眼", "多部国产电视剧在海外流媒体平台热播，中国文化影响力持续提升，成为文化输出新名片。", "娱乐", ["电视剧", "国产剧", "文化输出"], "人民日报海外版"),
            createNews("短视频平台用户突破10亿", "国内短视频平台日活跃用户数突破10亿，短视频已成为人们获取信息和娱乐的主要方式之一。", "娱乐", ["短视频", "抖音", "快手"], "QuestMobile"),
            createNews("知名导演张艺谋新片开拍", "张艺谋导演新作《满江红2》正式开机，预计将于2026年底上映，备受影迷期待。", "娱乐", ["张艺谋", "电影", "满江红"], "腾讯娱乐"),
            
            createNews("健康饮食趋势兴起", "越来越多的年轻人开始关注健康饮食，轻食、植物基食品市场快速增长，健康生活方式成为新时尚。", "生活", ["健康", "饮食", "轻食"], "健康时报"),
            createNews("旅游业迎来全面复苏", "五一假期国内旅游人次突破3亿，出入境游持续升温，旅游业迎来全面复苏的黄金期。", "生活", ["旅游", "五一假期", "出行"], "文旅部"),
            createNews("职场充电成新趋势", "受市场环境影响，越来越多的职场人选择充电学习，在线教育、职业培训市场需求旺盛。", "生活", ["职场", "教育", "培训"], "前程无忧"),
            createNews("智能家居走入寻常百姓家", "智能音箱、智能门锁等设备普及率持续提升，智能家居生态逐渐成熟，让生活更加便捷。", "生活", ["智能家居", "物联网", "智能设备"], "IDC"),
            createNews("环保意识增强，绿色消费成主流", "消费者环保意识不断增强，绿色产品、可降解包装受到青睐，可持续发展理念深入人心。", "生活", ["环保", "绿色消费", "可持续"], "中国环境报")
        ];
    }

    run() {
        const output = document.getElementById('output');
        const logs = [];
        
        const log = (text, type = 'info') => {
            logs.push({ text, type });
            console.log(text);
            if (output) {
                const line = document.createElement('div');
                line.className = type;
                line.textContent = text;
                output.appendChild(line);
            }
        };

        log('=' .repeat(60));
        log('个性化新闻推荐引擎测试');
        log('=' .repeat(60));
        
        log('\n[测试步骤1] 重置用户画像...', 'info');
        this.userProfile.resetProfile();
        const resetSuccess = this.userProfile.getProfile().totalClicks === 0;
        log('用户画像已重置: ' + (resetSuccess ? '✓ 成功' : '✗ 失败'), resetSuccess ? 'success' : 'error');
        
        const footballNews = this.newsData.filter(n => n.tags && n.tags.includes('足球'));
        log('\n[测试步骤2] 找到 ' + footballNews.length + ' 条足球相关新闻', 'info');
        footballNews.forEach((n, i) => log('  ' + (i + 1) + '. ' + n.title));
        
        log('\n[测试步骤3] 连续点击5篇足球新闻...', 'info');
        for (let i = 0; i < 5; i++) {
            const news = footballNews[i];
            this.userProfile.recordClick(news);
            log('  点击第' + (i + 1) + '篇: ' + news.title);
            log('    标签: [' + news.tags.join(', ') + ']');
        }
        
        log('\n[测试步骤4] 查看当前用户画像...', 'info');
        const profile = this.userProfile.getProfile();
        log('  总点击数: ' + profile.totalClicks);
        log('  兴趣标签:');
        Object.entries(profile.interests).forEach(([key, val]) => {
            log('    ' + key + ': score=' + val.score.toFixed(1) + ', clicks=' + val.clickCount);
        });
        
        log('\n[测试步骤5] 生成推荐列表...', 'info');
        const recommendations = this.recommendationEngine.getRecommendations(this.newsData, 20);
        
        log('\n[测试步骤6] 检查前10条推荐中足球相关新闻数量...', 'info');
        let footballCount = 0;
        log('\n前10条推荐:');
        recommendations.slice(0, 10).forEach((item, index) => {
            const isFootball = item.news.tags && item.news.tags.includes('足球');
            if (isFootball) footballCount++;
            const prefix = isFootball ? '⚽ 足球' : '   其他';
            log('  ' + (index + 1) + '. [' + prefix + '] ' + item.news.title, isFootball ? 'success' : 'info');
            log('     得分: ' + item.finalScore.toFixed(2) + ', 标签: [' + (item.news.tags?.join(', ') || '') + ']');
        });
        
        log('\n' + '=' .repeat(60));
        log('测试结果:');
        log('=' .repeat(60));
        log('  前10条推荐中足球相关: ' + footballCount + ' 条');
        log('  要求: 至少 6 条');
        
        const passed = footballCount >= 6;
        log('  结果: ' + (passed ? '✓ 通过' : '✗ 未通过'), passed ? 'success' : 'error');
        
        if (passed) {
            log('\n🎉 恭喜！推荐引擎测试通过！', 'success');
            log('   连续点击5篇足球新闻后，前10条推荐中有 ' + footballCount + ' 条足球相关新闻。', 'success');
        } else {
            log('\n❌ 测试未通过，请检查推荐算法逻辑。', 'error');
        }
        log('=' .repeat(60));
        
        return passed;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const test = new TestRecommender();
    const result = test.run();
    console.log('\n测试返回值:', result);
});
