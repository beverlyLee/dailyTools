class SentenceSplitter {
    constructor() {
        this.cnPunctuation = /[。！？；\n\r!?.]+/;
        this.cnSpecialEndings = /[~！？。；!?.]+$/;
        
        this._initFilters();
        this._initWordClasses();
    }

    _initFilters() {
        this.garbagePatterns = [
            /^[a-zA-Z0-9\s]{1,3}$/,
            /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/,
            /^[\s\u4e00-\u9fa5]{0,1}[\u2600-\u27BF]+$/,
            /^[hH][tT][tT][pP][sS]?:\/\//,
            /^www\./,
            /^\d+$/,
            /^[。！？，、；：""''（）\[\]【】]+$/,
            /[0-9a-zA-Z]{8,}/,
            /^\s*$/
        ];
        
        this.abusivePatterns = [
            /shab/i,
            /\bsb\b/i,
            /傻逼/,
            /煞笔/,
            /草泥马/,
            /cnm/i,
            /nmsl/i,
            /垃圾垃圾垃圾/,
            /bbbbb/,
            /aaaaa/,
            /66666/,
            /233333/,
            /shab.*平台/,
            /傻逼.*平台/,
            /.*shab.*/,
            /.*傻逼.*/,
            /.*傻逼/,
            /傻逼.*/
        ];
        
        this.competitorPatterns = [
            /隔壁[0-9a-zA-Z一二三四五六七八九十百千万]+/,
            /隔壁.*平台/,
            /隔壁.*软件/,
            /隔壁.*app/i,
            /隔壁.*比/,
            /对面.*平台/,
            /对面.*软件/,
            /其他.*平台/,
            /别的.*平台/,
            /另一个.*平台/
        ];
        
        this.meaninglessPatterns = [
            /^[嗯啊哦哎嘿哈哟呢嘛啦咯吧啊咦嘻呵哇]+$/,
            /^[对对对是是是好好好行行行来了来了去去去]+$/,
            /^[.。…，,、~!！?？]+$/,
            /^[a-zA-Z]{2,3}$/
        ];
        
        this.spamPhrases = [
            '刷单', '兼职', '加微信', '加QQ', '联系方式', '私聊',
            '点击链接', '扫描二维码', '加V', '加q', '加vx',
            '免费领取', '中奖', '红包', '优惠券', '限时活动'
        ];
    }

    _initWordClasses() {
        this.contentWords = new Set([
            '闪退', '崩溃', '退出', '关闭', '终止', '卡住', '无响应', '停止运行',
            '卡', '卡顿', '慢', '延迟', '等待', '加载', '转圈', '响应', '迟钝', '速度',
            '广告', '推广', '弹窗', '开屏', '插播',
            '客服', '售后', '反馈', '工单', '人工', '机器人', '回复', '态度',
            'UI', '界面', '设计', '好看', '简洁', '清爽', '漂亮', '现代化', '深色模式', '配色',
            'bug', '修复', '适配', '版本',
            '更新', '升级', '新版本', '老版本',
            '用户', '体验', '功能', '使用', '推荐', '好评', '差评', '垃圾',
            '失望', '满意', '舒服', '流畅', '方便', '专业', '简洁', '漂亮',
            '好用', '不好用', '喜欢', '讨厌', '赞', '棒', '差', '烂',
            '速度', '效率', '稳定', '不稳定', '卸载',
            '登录', '启动', '打开', '操作', '响应', '解决',
            '后悔', '幸好', '可惜', '遗憾', '开心', '难过', '愤怒',
            '良心', '坑', '骗', '值', '不值', '不推荐',
            '订单', '支付', '付款', '退款', '售后', '配送', '外卖', '快递',
            '商家', '商品', '质量', '价格', '优惠', '活动',
            '搜索', '推荐', '算法', '内容', '视频', '图片', '音频',
            '评论', '评价', '点赞', '收藏', '分享', '转发',
            '消息', '通知', '推送', '提醒',
            '账号', '密码', '验证码', '安全', '隐私',
            '网络', '连接', '流量', 'WiFi', '信号',
            '手机', '苹果', '安卓', '系统', '升级', '更新',
            '美团', '饿了么', '淘宝', '京东', '拼多多', '抖音', '快手', '微信',
            '外卖', '餐饮', '美食', '酒店', '旅游', '机票', '火车票',
            '打车', '出行', '共享单车', '地铁', '公交',
            '电影', '演出', '门票', '团购', '优惠券',
            '评价', '晒单', '晒图', '返现', '红包',
            '闪退', '卡顿', '崩溃', '黑屏', '白屏', '发热', '耗电',
            '注册', '登录', '实名认证', '绑定', '解绑',
            '客服', '投诉', '建议', '反馈', '举报',
            '会员', 'VIP', '付费', '订阅', '续费',
            '活动', '优惠', '折扣', '满减', '秒杀',
            '外卖员', '骑手', '配送员', '商家', '餐厅',
            '菜品', '味道', '分量', '包装', '餐具',
            '准时', '超时', '取消', '退款', '赔付',
            '定位', '导航', '地址', '距离', '范围'
        ]);
        
        this.functionWords = new Set([
            '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
            '自己', '这', '那', '还', '跟', '个', '我们', '能', '吗', '呢', '啊', '吧', '呀',
            '哦', '嘛', '给', '让', '被', '把', '哪', '什么', '怎么', '为什么',
            '多', '少', '大', '小', '太', '真', '最', '更', '比较', '挺', '蛮', '非常',
            '特别', '十分', '格外', '尤其', 'app', '软件', '应用', '这个', '那个',
            '它', '他', '她', '们', '啦', '哦', '呢', '吧', '啊', '吗', '呀',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '太', '真', '很', '非常', '特别', '十分', '格外', '尤其', '比较',
            'app', '软件', '应用', '这个', '那个', '它', '他', '她', '们',
            '从', '向', '往', '朝', '对', '对于', '关于', '被', '把', '给',
            '把', '被', '给', '让', '使', '叫', '请',
            '得', '地', '所', '之', '以', '而', '与', '或',
            '及', '等', '等等', '之类', '等等',
            '但是', '然而', '不过', '只是', '就是', '才', '就', '还',
            '因为', '所以', '因此', '于是', '如果', '只要', '除非',
            '虽然', '但是', '即使', '也', '无论', '都',
            '首先', '其次', '然后', '最后', '总之',
            '其实', '实际上', '事实上', '当然', '显然',
            '嗯', '啊', '哦', '唉', '哇', '哈', '嘿', '哼', '呸', '呀'
        ]);
        
        this.validVerbSuffixes = new Set([
            '了', '着', '过', '起来', '下去', '出来', '进去', '上来', '下来'
        ]);
        
        this.validAdjectiveSuffixes = new Set([
            '的', '了', '得', '起来'
        ]);
    }

    preprocessReview(text) {
        if (!text || typeof text !== 'string') {
            return { clean: '', isValid: false, reason: '空文本' };
        }
        
        let processed = text;
        
        processed = processed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        processed = processed.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        processed = processed.replace(/[\u2600-\u27BF]/g, '');
        
        processed = processed.replace(/\s+/g, ' ');
        processed = processed.trim();
        
        if (processed.length === 0) {
            return { clean: '', isValid: false, reason: '空白文本' };
        }
        
        const garbageResult = this._checkGarbage(processed);
        if (!garbageResult.isValid) {
            return garbageResult;
        }
        
        const spamResult = this._checkSpam(processed);
        if (!spamResult.isValid) {
            return spamResult;
        }
        
        const meaninglessResult = this._checkMeaningless(processed);
        if (!meaninglessResult.isValid) {
            return meaninglessResult;
        }
        
        const chineseRatio = this._calculateChineseRatio(processed);
        if (chineseRatio < 0.3 && processed.length > 5) {
            return { clean: processed, isValid: false, reason: '中文占比过低' };
        }
        
        return { clean: processed, isValid: true, reason: '' };
    }

    _checkGarbage(text) {
        for (const pattern of this.garbagePatterns) {
            if (pattern.test(text)) {
                return { clean: text, isValid: false, reason: '垃圾文本/乱码' };
            }
        }
        
        const lowerText = text.toLowerCase();
        const abusiveWords = ['shab', '傻逼', '煞笔', '草泥马', 'cnm', 'nmsl', 'sb'];
        for (const word of abusiveWords) {
            if (lowerText.includes(word)) {
                return { clean: text, isValid: false, reason: '辱骂/低俗内容' };
            }
        }
        
        for (const pattern of this.competitorPatterns) {
            if (pattern.test(text)) {
                return { clean: text, isValid: false, reason: '竞品/无关内容' };
            }
        }
        
        for (const phrase of this.spamPhrases) {
            if (lowerText.includes(phrase.toLowerCase())) {
                return { clean: text, isValid: false, reason: '垃圾广告' };
            }
        }
        
        const uniqueChars = new Set(text.replace(/\s/g, ''));
        if (uniqueChars.size <= 2 && text.length > 3) {
            return { clean: text, isValid: false, reason: '重复字符过多' };
        }
        
        return { clean: text, isValid: true, reason: '' };
    }

    _checkSpam(text) {
        const lowerText = text.toLowerCase();
        
        for (const phrase of this.spamPhrases) {
            if (lowerText.includes(phrase.toLowerCase())) {
                return { clean: text, isValid: false, reason: '垃圾广告内容' };
            }
        }
        
        const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
        if (urlPattern.test(text)) {
            return { clean: text, isValid: false, reason: '包含链接' };
        }
        
        return { clean: text, isValid: true, reason: '' };
    }

    _checkMeaningless(text) {
        if (text.length < 2) {
            return { clean: text, isValid: false, reason: '文本过短' };
        }
        
        for (const pattern of this.meaninglessPatterns) {
            if (pattern.test(text)) {
                return { clean: text, isValid: false, reason: '无意义语气词' };
            }
        }
        
        const contentRatio = this._calculateContentRatio(text);
        if (contentRatio < 0.2 && text.length > 10) {
            return { clean: text, isValid: false, reason: '有效内容过少' };
        }
        
        return { clean: text, isValid: true, reason: '' };
    }

    _calculateChineseRatio(text) {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const totalChars = text.replace(/\s/g, '').length;
        return totalChars > 0 ? chineseChars / totalChars : 0;
    }

    _calculateContentRatio(text) {
        let contentCount = 0;
        let totalCount = 0;
        
        for (const char of text) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                totalCount++;
                if (this.contentWords.has(char) || 
                    Array.from(this.contentWords).some(w => w.includes(char))) {
                    contentCount++;
                }
            } else if (/[a-zA-Z0-9]/.test(char)) {
                totalCount++;
                contentCount++;
            }
        }
        
        return totalCount > 0 ? contentCount / totalCount : 0;
    }

    split(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const preprocessResult = this.preprocessReview(text);
        if (!preprocessResult.isValid) {
            return [];
        }

        let cleanedText = preprocessResult.clean;
        
        cleanedText = this._normalizeText(cleanedText);
        
        const rawSentences = this._smartSplit(cleanedText);
        const cleanedSentences = [];

        for (let sentence of rawSentences) {
            sentence = this.clean(sentence);
            if (this.isValid(sentence)) {
                const completeSentence = this._ensureCompleteSentence(sentence);
                if (completeSentence) {
                    cleanedSentences.push(completeSentence);
                }
            }
        }

        return cleanedSentences;
    }

    _normalizeText(text) {
        let normalized = text;
        
        normalized = normalized.replace(/[！!]{2,}/g, '！');
        normalized = normalized.replace(/[？?]{2,}/g, '？');
        normalized = normalized.replace(/[。.]{2,}/g, '。');
        normalized = normalized.replace(/[，,]{2,}/g, '，');
        
        normalized = normalized.replace(/([。！？；!?])(?!$)/g, '$1\n');
        
        return normalized;
    }

    _smartSplit(text) {
        if (!text || text.length < 5) {
            return text ? [text] : [];
        }
        
        const sentences = [];
        const punctuationSplit = text.split(/([。！？；!?\n\r])/);
        let tempSentence = '';
        
        for (let i = 0; i < punctuationSplit.length; i++) {
            const part = punctuationSplit[i];
            
            if (/[。！？；!?\n\r]/.test(part)) {
                if (tempSentence.trim()) {
                    sentences.push(tempSentence.trim() + part);
                }
                tempSentence = '';
            } else {
                tempSentence += part;
            }
        }
        
        if (tempSentence.trim()) {
            sentences.push(tempSentence.trim());
        }
        
        const result = [];
        for (const sentence of sentences) {
            if (sentence.length <= 60) {
                result.push(sentence);
            } else {
                const subSentences = this._splitLongSentence(sentence);
                result.push(...subSentences);
            }
        }
        
        return result.filter(s => s && s.trim().length > 0);
    }
    
    _splitLongSentence(longText) {
        if (longText.length <= 50) {
            return [longText];
        }
        
        const sentences = [];
        let current = '';
        const keywords = this._getPainPointKeywords();
        let lastKeywordPos = -1;
        
        for (let i = 0; i < longText.length; i++) {
            const char = longText[i];
            current += char;
            
            for (const kw of keywords) {
                if (longText.substring(i).startsWith(kw)) {
                    if (lastKeywordPos >= 0 && current.length > 20) {
                        const beforeKw = current.substring(0, current.length - char.length).trim();
                        if (beforeKw.length >= 10) {
                            sentences.push(beforeKw);
                            current = char;
                        }
                    }
                    lastKeywordPos = i;
                    break;
                }
            }
            
            if (char === '，' || char === '、') {
                if (current.length > 25) {
                    const beforeComma = current.substring(0, current.length - 1).trim();
                    if (beforeComma.length >= 10 && this._hasMeaningfulContent(beforeComma)) {
                        sentences.push(beforeComma);
                        current = '';
                    }
                }
            }
            
            if (current.length >= 50) {
                const trimmed = current.trim();
                if (trimmed.length >= 10) {
                    sentences.push(trimmed);
                }
                current = '';
            }
        }
        
        if (current.trim().length >= 5) {
            sentences.push(current.trim());
        }
        
        return sentences.length > 0 ? sentences : [longText];
    }
    
    _getPainPointKeywords() {
        return [
            '闪退', '崩溃', '退出', '关闭', '无响应', '黑屏', '白屏', '卡住',
            '卡', '卡顿', '慢', '延迟', '加载', '转圈', '响应', '速度',
            '广告', '弹窗', '开屏', '推广',
            '客服', '售后', '反馈', '投诉', '联系',
            'UI', '界面', '设计', '配色', '布局',
            'bug', '错误', '异常', '修复', '问题',
            '更新', '升级', '版本',
            '支付', '退款', '扣款', '付款',
            '配送', '外卖', '骑手', '超时',
            '卸载', '垃圾', '烂', '差', '坑', '骗',
            '太卡', '太慢', '太烂', '太差', '太垃圾'
        ];
    }
    
    _hasMeaningfulContent(text) {
        if (!text || text.length < 5) return false;
        
        const keywords = this._getPainPointKeywords();
        for (const kw of keywords) {
            if (text.includes(kw)) {
                return true;
            }
        }
        
        const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        return chineseCount >= 5;
    }
    
    _hasPainPointKeyword(text) {
        const keywords = [
            '闪退', '崩溃', '退出', '关闭', '无响应', '黑屏', '白屏',
            '卡', '卡顿', '慢', '延迟', '加载', '转圈', '响应',
            '广告', '弹窗', '开屏',
            '客服', '售后', '反馈', '投诉',
            'UI', '界面', '设计',
            'bug', '错误', '异常', '修复',
            '更新', '升级', '版本',
            '支付', '退款', '扣款',
            '配送', '外卖', '骑手',
            '卸载', '垃圾', '烂', '差', '坑', '骗'
        ];
        
        for (const kw of keywords) {
            if (text.includes(kw)) {
                return true;
            }
        }
        return false;
    }
    
    _canSplitAtComma(text, commaPos) {
        const before = text.substring(Math.max(0, commaPos - 20), commaPos);
        const after = text.substring(commaPos + 1, Math.min(text.length, commaPos + 20));
        
        const painPointBefore = this._hasPainPointKeyword(before);
        const painPointAfter = this._hasPainPointKeyword(after);
        
        if (painPointBefore && painPointAfter && before.length >= 5 && after.length >= 5) {
            return true;
        }
        
        const hasVerbBefore = this._hasVerb(before);
        const hasSubjectBefore = this._hasSubject(before);
        const hasVerbAfter = this._hasVerb(after);
        const hasSubjectAfter = this._hasSubject(after);
        
        if (hasVerbBefore && hasSubjectBefore && hasVerbAfter && hasSubjectAfter) {
            return true;
        }
        
        return false;
    }

    _hasVerb(text) {
        const verbs = [
            '用', '用了', '打开', '启动', '登录', '注册', '点击', '操作',
            '看', '看了', '玩', '玩了', '买', '买了', '退', '退款',
            '卡', '闪退', '崩溃', '退出', '关闭', '停', '停止',
            '等', '等待', '加载', '转', '转圈', '响应',
            '喜欢', '讨厌', '觉得', '认为', '感觉',
            '说', '反馈', '投诉', '建议',
            '付', '付款', '支付', '下单', '订购',
            '送', '配送', '收到', '没收到',
            '改', '修改', '更新', '升级',
            '联系', '找', '问', '咨询'
        ];
        
        for (const verb of verbs) {
            if (text.includes(verb)) {
                return true;
            }
        }
        
        return false;
    }

    _hasSubject(text) {
        const subjects = ['我', '你', '他', '她', '它', '我们', '你们', '他们', '这个', '那个', '软件', 'app', '应用'];
        
        for (const sub of subjects) {
            if (text.toLowerCase().includes(sub.toLowerCase())) {
                return true;
            }
        }
        
        return false;
    }

    splitMultipleReviews(reviews) {
        if (!Array.isArray(reviews)) {
            console.warn('SentenceSplitter.splitMultipleReviews: 输入 reviews 不是数组，返回空结果');
            return { sentences: [], filteredCount: 0 };
        }
        
        const allSentences = [];
        const filteredReviews = [];
        
        for (const review of reviews) {
            if (typeof review !== 'string') {
                continue;
            }
            
            const preprocessResult = this.preprocessReview(review);
            
            if (preprocessResult.isValid) {
                filteredReviews.push(preprocessResult.clean);
                const sentences = this.split(preprocessResult.clean);
                if (Array.isArray(sentences)) {
                    for (const sentence of sentences) {
                        if (typeof sentence === 'string' && sentence.trim().length > 0) {
                            allSentences.push({
                                text: sentence,
                                sourceReview: preprocessResult.clean,
                                originalReview: review
                            });
                        }
                    }
                }
            }
        }
        
        return { sentences: allSentences, filteredCount: reviews.length - filteredReviews.length };
    }

    clean(sentence) {
        if (!sentence) return '';
        
        let cleaned = sentence.trim();
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        cleaned = cleaned.replace(/^[，、：；,.，、]+|[，、：；,.，、]+$/g, '');
        
        cleaned = cleaned.replace(/^[!！?？.。~～]+|[!！?？.。~～]+$/g, '');
        
        cleaned = cleaned.trim();
        
        return cleaned;
    }

    _ensureCompleteSentence(sentence) {
        if (!sentence || sentence.length < 3) {
            return null;
        }
        
        if (sentence.length > 150) {
            return this._truncateToComplete(sentence);
        }
        
        if (this._isFragment(sentence)) {
            if (sentence.length >= 5 && this._hasMeaningfulContent(sentence)) {
                return sentence;
            }
            return null;
        }
        
        return sentence;
    }

    _truncateToComplete(sentence) {
        const maxLength = 100;
        
        if (sentence.length <= maxLength) {
            return sentence;
        }
        
        const punctuations = ['。', '！', '？', '，', '；'];
        
        for (let i = maxLength; i >= 20; i--) {
            if (punctuations.includes(sentence[i])) {
                return sentence.substring(0, i + 1);
            }
        }
        
        for (let i = maxLength; i >= 20; i--) {
            const char = sentence[i];
            if (/[\u4e00-\u9fa5]/.test(char) && this._isContentWord(char)) {
                let truncated = sentence.substring(0, i + 1);
                if (!truncated.endsWith('，') && !truncated.endsWith('、')) {
                    truncated += '...';
                }
                return truncated;
            }
        }
        
        return sentence.substring(0, maxLength) + '...';
    }

    _isFragment(sentence) {
        if (sentence.length < 4) {
            return true;
        }
        
        if (this._isOnlyAdjective(sentence)) {
            return true;
        }
        
        if (/^[好差棒烂快慢卡爽]了?$/.test(sentence)) {
            return true;
        }
        
        return false;
    }

    _isOnlyAdjective(sentence) {
        const adjectives = ['好', '差', '棒', '烂', '快', '慢', '卡', '爽', '漂亮', '丑', '贵', '便宜'];
        const particles = ['啊', '呀', '吧', '呢', '嘛', '了', '的', '得'];
        
        let onlyAdj = true;
        for (const char of sentence) {
            if (!adjectives.includes(char) && !particles.includes(char)) {
                onlyAdj = false;
                break;
            }
        }
        
        return onlyAdj && sentence.length <= 5;
    }

    _hasMeaningfulContent(sentence) {
        for (const word of this.contentWords) {
            if (sentence.includes(word)) {
                return true;
            }
        }
        
        const chineseCount = (sentence.match(/[\u4e00-\u9fa5]/g) || []).length;
        return chineseCount >= 5;
    }

    _isContentWord(char) {
        for (const word of this.contentWords) {
            if (word.includes(char)) {
                return true;
            }
        }
        return false;
    }

    isValid(sentence) {
        if (!sentence || sentence.length < 3) {
            return false;
        }
        
        if (sentence.length > 200) {
            return false;
        }
        
        const hasChinese = /[\u4e00-\u9fa5]/.test(sentence);
        if (!hasChinese) {
            return false;
        }
        
        const chineseRatio = this._calculateChineseRatio(sentence);
        if (chineseRatio < 0.3) {
            return false;
        }
        
        const contentRatio = this._calculateContentRatio(sentence);
        if (contentRatio < 0.1) {
            return false;
        }
        
        return true;
    }

    tokenize(sentence) {
        const words = [];
        let i = 0;
        
        while (i < sentence.length) {
            const char = sentence[i];
            
            if (/[\u4e00-\u9fa5]/.test(char)) {
                let matched = false;
                for (const word of this.contentWords) {
                    if (sentence.substring(i).startsWith(word)) {
                        words.push(word);
                        i += word.length;
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    words.push(char);
                    i++;
                }
            } else if (/[a-zA-Z]/.test(char)) {
                let word = '';
                while (i < sentence.length && /[a-zA-Z0-9]/.test(sentence[i])) {
                    word += sentence[i];
                    i++;
                }
                if (word.length > 1) {
                    words.push(word.toLowerCase());
                }
            } else if (/[0-9]/.test(char)) {
                let num = '';
                while (i < sentence.length && /[0-9]/.test(sentence[i])) {
                    num += sentence[i];
                    i++;
                }
                if (num.length >= 2) {
                    words.push(num);
                }
            } else {
                i++;
            }
        }
        
        return words;
    }

    extractNgrams(sentence, n = 2) {
        const chars = [];
        for (let char of sentence) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                chars.push(char);
            }
        }
        
        const ngrams = [];
        for (let i = 0; i <= chars.length - n; i++) {
            const ngram = chars.slice(i, i + n).join('');
            if (this._isMeaningfulNgram(ngram)) {
                ngrams.push(ngram);
            }
        }
        
        return ngrams;
    }

    _isMeaningfulNgram(ngram) {
        for (const word of this.contentWords) {
            if (word.includes(ngram) || ngram.includes(word)) {
                return true;
            }
        }
        
        if (this.functionWords.has(ngram)) {
            return false;
        }
        
        return true;
    }

    getWordFrequency(sentences) {
        const freq = {};
        const totalWords = [];
        
        for (const sentence of sentences) {
            const words = this.tokenize(sentence.text);
            for (const word of words) {
                if (this._isValidKeyword(word)) {
                    freq[word] = (freq[word] || 0) + 1;
                    totalWords.push(word);
                }
            }
            
            const bigrams = this.extractNgrams(sentence.text, 2);
            for (const bigram of bigrams) {
                if (this._isValidKeyword(bigram)) {
                    freq[bigram] = (freq[bigram] || 0) + 1;
                }
            }
        }
        
        return freq;
    }

    _isValidKeyword(word) {
        if (!word || word.length < 2) {
            return false;
        }
        
        if (word.length > 8) {
            return false;
        }
        
        if (this.functionWords.has(word)) {
            return false;
        }
        
        const stopPhrases = new Set([
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            '一个', '一些', '一下', '那种', '这样', '那样'
        ]);
        
        if (stopPhrases.has(word)) {
            return false;
        }
        
        if (/^[0-9]+$/.test(word)) {
            return false;
        }
        
        return true;
    }

    isContentWord(word) {
        return this.contentWords.has(word) || 
               Array.from(this.contentWords).some(w => w.includes(word) || word.includes(w));
    }

    isFunctionWord(word) {
        return this.functionWords.has(word);
    }
}

window.SentenceSplitter = SentenceSplitter;
