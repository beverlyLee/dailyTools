class EntityExtractor {
    constructor() {
        this.model = null;
        
        this.entityTypes = {
            person: {
                label: '人名',
                color: '#1976d2',
                priority: 1
            },
            company: {
                label: '公司名',
                color: '#388e3c',
                priority: 2
            },
            product: {
                label: '产品名',
                color: '#00796b',
                priority: 3
            },
            action_intent: {
                label: '动作/意图',
                color: '#f57c00',
                priority: 4
            },
            date: {
                label: '日期/时间',
                color: '#7b1fa2',
                priority: 5
            },
            amount: {
                label: '金额',
                color: '#e64a19',
                priority: 6
            },
            email: {
                label: '邮箱',
                color: '#c62828',
                priority: 7
            },
            phone: {
                label: '电话',
                color: '#5d4037',
                priority: 8
            }
        };
        
        this.actionIntentKeywords = [
            { verb: '询问', context: 'inquiry' },
            { verb: '咨询', context: 'inquiry' },
            { verb: '了解', context: 'inquiry' },
            { verb: '想知道', context: 'inquiry' },
            { verb: '请问', context: 'inquiry' },
            { verb: '报价', context: 'price' },
            { verb: '购买', context: 'purchase' },
            { verb: '采购', context: 'purchase' },
            { verb: '订阅', context: 'subscription' },
            { verb: '预定', context: 'subscription' },
            { verb: '投诉', context: 'complaint' },
            { verb: '反馈', context: 'feedback' },
            { verb: '抱怨', context: 'complaint' },
            { verb: '不满意', context: 'complaint' },
            { verb: '进度', context: 'status' },
            { verb: '进展', context: 'status' },
            { verb: '状态', context: 'status' },
            { verb: '开会', context: 'meeting' },
            { verb: '预约', context: 'meeting' },
            { verb: '见面', context: 'meeting' },
            { verb: '拜访', context: 'meeting' },
            { verb: '确认', context: 'confirm' },
            { verb: '取消', context: 'cancel' },
            { verb: '修改', context: 'modify' },
            { verb: '查看', context: 'view' },
            { verb: '申请', context: 'apply' },
            { verb: '提交', context: 'submit' },
            { verb: '提供', context: 'provide' },
            { verb: '发送', context: 'send' },
            { verb: '回复', context: 'reply' },
            { verb: '联系', context: 'contact' },
            { verb: '安排', context: 'arrange' }
        ];
        
        this.stopWords = new Set([
            '的', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
            '自己', '这', '那', '她', '他', '它', '们', '这个', '那个', '什么', '怎么',
            '为什么', '哪', '哪里', '谁', '多少', '几', '了', '吗', '呢', '啊', '吧', '呀',
            '哦', '嗯', '哈哈', '嘿嘿', '喔', '啦', '呗', '喽',
            '我们', '你们', '他们', '她们', '它们', '咱们',
            '这是', '那是', '是什么', '是多少', '怎么样', '如何',
            '可以', '能够', '可能', '应该', '必须', '需要',
            '一下', '一下下', '一些', '一点', '一点点',
            '关于', '有关', '对于', '至于', '关于这个',
            '给我', '给我们', '给你', '给你们',
            '请', '麻烦', '请问', '烦请',
            '尊敬的', '亲爱的', '您好', '你好', '谢谢', '感谢',
            '此致', '敬礼', '祝好', '祝商祺', '顺颂商祺',
            '但是', '然而', '不过', '而且', '并且', '所以', '因此',
            '因为', '所以', '虽然', '但是', '如果', '假如',
            '了', '着', '过', '得', '地',
            '的话', '来说', '来看', '的话',
            'and', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you',
            'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'our', 'their', 'a', 'an'
        ]);
        
        this.companyPrefixIndicators = new Set([
            '我司', '贵司', '我们公司', '贵公司', '该公司', '那家公司', '这家公司',
            '我们的公司', '你们的公司', '他们的公司',
            'our company', 'your company', 'the company', 'this company', 'that company'
        ]);
        
        this.companySuffixes = [
            '有限公司', '股份有限公司', '有限责任公司',
            '集团有限公司', '实业有限公司', '投资有限公司',
            '科技有限公司', '软件有限公司', '信息技术有限公司',
            '咨询有限公司', '服务有限公司', '贸易有限公司',
            '发展有限公司', '管理有限公司', '控股有限公司',
            '集团', '公司', 'Inc.', 'Inc', 'Ltd.', 'Ltd', 'LLC',
            'Corporation', 'Corp.', 'Corp', 'Company', 'Co.', 'Co',
            'GmbH', 'AG', 'S.A.', 'S.L.'
        ];
        
        this.chineseSurnames = [
            '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
            '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
            '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
            '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
            '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎',
            '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜',
            '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆',
            '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史',
            '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤',
            '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文'
        ];
    }

    async init() {
        await this.loadModel();
    }

    async loadModel() {
        try {
            console.log('正在初始化实体抽取器...');
            
            if (typeof tf !== 'undefined') {
                const model = tf.sequential();
                model.add(tf.layers.embedding({
                    inputDim: 10000,
                    outputDim: 128,
                    inputLength: 100
                }));
                model.add(tf.layers.bidirectional({
                    layer: tf.layers.lstm({ units: 64, returnSequences: true })
                }));
                model.add(tf.layers.dropout({ rate: 0.3 }));
                model.add(tf.layers.timeDistributed({
                    layer: tf.layers.dense({ units: 10, activation: 'softmax' })
                }));
                
                model.compile({
                    optimizer: tf.train.adam(0.001),
                    loss: 'categoricalCrossentropy',
                    metrics: ['accuracy']
                });
                
                this.model = model;
                console.log('TensorFlow.js BiLSTM 实体抽取模型初始化完成');
            }
        } catch (error) {
            console.warn('TensorFlow.js 模型加载失败，将使用基于规则的实体抽取:', error);
        }
    }

    async extract(text) {
        const entities = [];
        
        entities.push(...this.extractEmails(text));
        entities.push(...this.extractPhones(text));
        entities.push(...this.extractDates(text));
        entities.push(...this.extractAmounts(text));
        entities.push(...this.extractProducts(text));
        entities.push(...this.extractCompanies(text));
        entities.push(...this.extractPersons(text));
        entities.push(...this.extractActionIntents(text));
        
        const uniqueEntities = this.removeOverlappingEntities(entities);
        const cleanedEntities = this.denoiseEntities(uniqueEntities, text);
        
        if (this.model) {
            try {
                const modelEntities = await this.extractWithModel(text);
                cleanedEntities.push(...modelEntities);
            } catch (error) {
                console.log('模型实体抽取失败，使用规则结果');
            }
        }
        
        return this.groupEntities(cleanedEntities);
    }

    getContext(text, start, end, windowSize = 5) {
        const beforeStart = Math.max(0, start - windowSize);
        const afterEnd = Math.min(text.length, end + windowSize);
        
        return {
            before: text.substring(beforeStart, start),
            after: text.substring(end, afterEnd),
            fullBefore: text.substring(0, start),
            fullAfter: text.substring(end)
        };
    }

    isValidCompanyContext(text, start, end) {
        const context = this.getContext(text, start, end, 10);
        const beforeText = context.before.toLowerCase();
        
        const invalidPrefixes = [
            '我想', '想', '需要', '希望', '想要', '打算',
            '咨询', '询问', '了解', '请问', '想知道',
            '请', '麻烦', '能否', '能不能', '可否', '是否可以',
            '关于', '有关', '对于',
            '这个', '那个', '这些', '那些'
        ];
        
        for (const prefix of invalidPrefixes) {
            if (beforeText.includes(prefix)) {
                const prefixIndex = beforeText.lastIndexOf(prefix);
                const textBetween = beforeText.substring(prefixIndex + prefix.length);
                const hasValidSeparator = textBetween.includes('公司') || 
                                          textBetween.includes('的') ||
                                          textBetween.length > 5;
                if (!hasValidSeparator) {
                    return false;
                }
            }
        }
        
        return true;
    }

    isValidActionIntentContext(text, start, end) {
        const context = this.getContext(text, start, end, 10);
        const beforeText = context.before;
        
        const validPrefixes = [
            '我想', '想', '需要', '希望', '想要', '打算', '计划',
            '咨询', '询问', '了解', '请问', '想知道',
            '请', '麻烦', '能否', '能不能', '可否', '是否可以',
            '需要', '想要', '希望'
        ];
        
        for (const prefix of validPrefixes) {
            if (beforeText.includes(prefix)) {
                return true;
            }
        }
        
        return true;
    }

    isStopWord(word) {
        return this.stopWords.has(word) || this.stopWords.has(word.toLowerCase());
    }

    denoiseEntities(entities, text) {
        return entities.filter(entity => {
            if (this.isStopWord(entity.value)) {
                return false;
            }
            
            if (entity.value.length < 2) {
                return false;
            }
            
            if (/^[，,。.！!？?；;:：\s]+$/.test(entity.value)) {
                return false;
            }
            
            if (entity.type === 'action_intent') {
                if (this.isStopWord(entity.value)) {
                    return false;
                }
            }
            
            if (entity.type === 'company') {
                if (!this.isValidCompanyName(entity.value)) {
                    return false;
                }
            }
            
            if (entity.type === 'person') {
                if (!this.isLikelyPersonName(entity.value)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    isValidCompanyName(name) {
        if (name.length < 3) return false;
        if (this.isStopWord(name)) return false;
        
        const hasValidSuffix = this.companySuffixes.some(suffix => 
            name.endsWith(suffix) || name.endsWith(suffix.replace(/\.$/, ''))
        );
        
        if (hasValidSuffix) return true;
        
        const commonCompanyWords = ['科技', '软件', '信息', '咨询', '服务', '贸易', '集团'];
        for (const word of commonCompanyWords) {
            if (name.includes(word) && name.length >= 4) {
                return true;
            }
        }
        
        return false;
    }

    extractEmails(text) {
        const entities = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        let match;
        
        while ((match = emailRegex.exec(text)) !== null) {
            const value = match[0];
            entities.push({
                type: 'email',
                value: value,
                start: match.index,
                end: match.index + value.length,
                confidence: 0.98
            });
        }
        
        return entities;
    }

    extractPhones(text) {
        const entities = [];
        const phoneRegex = /(?:\+?86)?1[3-9]\d{9}|(?:0\d{2,3}-?)?\d{7,8}/g;
        let match;
        
        while ((match = phoneRegex.exec(text)) !== null) {
            const value = match[0];
            entities.push({
                type: 'phone',
                value: value,
                start: match.index,
                end: match.index + value.length,
                confidence: 0.92
            });
        }
        
        return entities;
    }

    extractDates(text) {
        const entities = [];
        
        const datePatterns = [
            { regex: /\d{4}年\d{1,2}月\d{1,2}日/g, confidence: 0.98 },
            { regex: /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g, confidence: 0.95 },
            { regex: /\d{1,2}月\d{1,2}日/g, confidence: 0.88 },
            { regex: /(?:下|上|这|本|下下)周[一二三四五六日天末]?/g, confidence: 0.85 },
            { regex: /(?:明|后|今|昨)天/g, confidence: 0.90 },
            { regex: /\d{1,2}月\d{1,2}号?/g, confidence: 0.82 },
            { regex: /(?:上午|下午|晚上)\s*\d{1,2}(?:[:：]\d{1,2})?/g, confidence: 0.80 },
            { regex: /\d{1,2}(?:[:：]\d{1,2})?\s*(?:点|时)/g, confidence: 0.78 }
        ];
        
        for (const pattern of datePatterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const value = match[0];
                entities.push({
                    type: 'date',
                    value: value,
                    start: match.index,
                    end: match.index + value.length,
                    confidence: pattern.confidence
                });
            }
        }
        
        return entities;
    }

    extractAmounts(text) {
        const entities = [];
        
        const amountPatterns = [
            { regex: /[¥￥]\s?\d+(?:,\d{3})*(?:\.\d+)?/g, unit: '人民币', confidence: 0.95 },
            { regex: /\$\s?\d+(?:,\d{3})*(?:\.\d+)?/g, unit: '美元', confidence: 0.95 },
            { regex: /€\s?\d+(?:,\d{3})*(?:\.\d+)?/g, unit: '欧元', confidence: 0.95 },
            { regex: /\d+(?:,\d{3})*(?:\.\d+)?\s*元(?:人民币)?/g, unit: '人民币', confidence: 0.92 },
            { regex: /\d+(?:,\d{3})*(?:\.\d+)?\s*美元/g, unit: '美元', confidence: 0.92 },
            { regex: /\d+(?:,\d{3})*(?:\.\d+)?\s*欧元/g, unit: '欧元', confidence: 0.92 },
            { regex: /\d+(?:,\d{3})*(?:\.\d+)?\s*万(?:元)?/g, unit: '万元', confidence: 0.88 }
        ];
        
        for (const pattern of amountPatterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const value = match[0];
                entities.push({
                    type: 'amount',
                    value: value,
                    start: match.index,
                    end: match.index + value.length,
                    confidence: pattern.confidence,
                    unit: pattern.unit
                });
            }
        }
        
        return entities;
    }

    extractProducts(text) {
        const entities = [];
        
        const productMarkers = [
            { regex: /[《「『"]([^《」』"]+?)[》」』"]/g, type: 'quoted', confidence: 0.95 },
            { regex: /(?:产品|系统|软件|版本|方案|服务)[：:]\s*([^\n，,。；;]+)/g, type: 'colon', confidence: 0.85 },
            { regex: /(?:贵公司的|我们的|我司的)\s*([^\s，,。；;\n]{2,20}?(?:系统|软件|平台|服务|产品|版本|方案))/g, type: 'descriptive', confidence: 0.80 }
        ];
        
        for (const marker of productMarkers) {
            let match;
            while ((match = marker.regex.exec(text)) !== null) {
                let value = match[1] || match[0];
                if (value) {
                    value = value.replace(/^[《「『"：:]|["》」』]$/g, '').trim();
                    if (value.length > 1 && value.length < 50 && !this.isStopWord(value)) {
                        entities.push({
                            type: 'product',
                            value: value,
                            start: match.index,
                            end: match.index + match[0].length,
                            confidence: marker.confidence
                        });
                    }
                }
            }
        }
        
        const commonProducts = [
            '智能办公系统', 'CRM系统', 'ERP系统', 'OA系统', '云服务',
            '企业版', '专业版', 'Pro版', '标准版', '高级版', '基础版',
            '会员服务', '订阅服务', '企业服务', '技术支持', '定制开发'
        ];
        
        for (const product of commonProducts) {
            const index = text.indexOf(product);
            if (index !== -1) {
                entities.push({
                    type: 'product',
                    value: product,
                    start: index,
                    end: index + product.length,
                    confidence: 0.90
                });
            }
        }
        
        return entities;
    }

    extractCompanies(text) {
        const entities = [];
        
        const sortedSuffixes = [...this.companySuffixes].sort((a, b) => b.length - a.length);
        
        const stopCharacters = new Set([
            ' ', ',', '，', '.', '。', '!', '！', '?', '？', ';', '；', ':', '：',
            '\n', '"', "'", '「', '」', '『', '』',
            '是', '我', '你', '他', '她', '它', '们', '的', '在'
        ]);
        
        for (const suffix of sortedSuffixes.slice(0, 20)) {
            let pos = 0;
            while (pos < text.length) {
                const suffixPos = text.indexOf(suffix, pos);
                if (suffixPos === -1) break;
                
                const companyEnd = suffixPos + suffix.length;
                let companyStart = suffixPos;
                
                while (companyStart > 0) {
                    const char = text[companyStart - 1];
                    if (stopCharacters.has(char)) {
                        break;
                    }
                    companyStart--;
                }
                
                const value = text.substring(companyStart, companyEnd);
                
                if (value.length > suffix.length + 1 && value.length < 100) {
                    if (!this.isStopWord(value) && this.isValidCompanyName(value)) {
                        if (this.isValidCompanyContext(text, companyStart, companyEnd)) {
                            if (!this.isLikelyPersonName(value)) {
                                const exists = entities.some(e => e.value === value);
                                if (!exists) {
                                    entities.push({
                                        type: 'company',
                                        value: value,
                                        start: companyStart,
                                        end: companyEnd,
                                        confidence: 0.85
                                    });
                                }
                            }
                        }
                    }
                }
                
                pos = companyEnd;
            }
        }
        
        const englishCompanyRegex = /(?:[A-Z][a-zA-Z]+(?:\s|$)){2,}?(?:Inc|Ltd|LLC|Corporation|Company|GmbH)\b/g;
        while ((match = englishCompanyRegex.exec(text)) !== null) {
            const value = match[0].trim();
            entities.push({
                type: 'company',
                value: value,
                start: match.index,
                end: match.index + value.length,
                confidence: 0.90
            });
        }
        
        return entities;
    }

    extractPersons(text) {
        const entities = [];
        
        const signaturePatterns = [
            { regex: /(?:--|—|—-|===|此致|敬礼|祝好|祝商祺|顺颂商祺)[\s\n]*([^\n]{2,12})/g, confidence: 0.95 },
            { regex: /谢谢[!！]?[\s\n]*([^\n]{2,12})/g, confidence: 0.88 },
            { regex: /感谢[!！]?[\s\n]*([^\n]{2,12})/g, confidence: 0.88 },
            { regex: /期待您的回复[!！。.]?[\s\n]*([^\n]{2,12})/g, confidence: 0.85 }
        ];
        
        for (const pattern of signaturePatterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (match[1]) {
                    const value = match[1].trim();
                    if (value.length >= 2 && value.length <= 12) {
                        if (this.isLikelyPersonName(value) && !this.isStopWord(value)) {
                            entities.push({
                                type: 'person',
                                value: value,
                                start: match.index,
                                end: match.index + match[0].length,
                                confidence: pattern.confidence
                            });
                        }
                    }
                }
            }
        }
        
        const namePattern = new RegExp(
            `(?:尊敬的|亲爱的|您好，?\\s*)?(${this.chineseSurnames.join('|')})[氏]?[\\u4e00-\\u9fa5]{1,2}(?:先生|女士|老师|总|经理|总监|老板)?`,
            'g'
        );
        
        let nameMatch;
        while ((nameMatch = namePattern.exec(text)) !== null) {
            if (nameMatch[1]) {
                const fullMatch = nameMatch[0];
                let nameValue = fullMatch.replace(/(?:尊敬的|亲爱的|您好，?\s*)|(?:先生|女士|老师|总|经理|总监|老板)/g, '').trim();
                
                if (nameValue.length >= 2 && nameValue.length <= 4) {
                    if (this.isLikelyPersonName(nameValue) && !this.isStopWord(nameValue)) {
                        const existingEntity = entities.find(e => e.value === nameValue);
                        if (!existingEntity) {
                            entities.push({
                                type: 'person',
                                value: nameValue,
                                start: nameMatch.index,
                                end: nameMatch.index + fullMatch.length,
                                confidence: 0.75
                            });
                        }
                    }
                }
            }
        }
        
        return entities;
    }

    extractActionIntents(text) {
        const entities = [];
        
        const actionIntentPatterns = [
            { pattern: /(?:想|需要|希望|想要|打算|计划)\s+(询问|咨询|了解|报价|购买|采购|订阅|查看|申请|确认|预定)\b/g, confidence: 0.92 },
            { pattern: /(?:请|麻烦|烦请|能否|能不能|可否|是否可以)\s+(提供|发送|回复|联系|安排|预约|确认|取消|修改)\b/g, confidence: 0.90 },
            { pattern: /\b(投诉|反馈|抱怨|不满意|有问题|出问题)\b/g, confidence: 0.88 },
            { pattern: /(?:想知道|想了解|请问|咨询一下|了解一下)/g, confidence: 0.85 },
            { pattern: /\b(询问|咨询|了解|报价|购买|采购|订阅|预定|查看|申请|确认|提供|发送|回复|联系|安排|预约|取消|修改|进度|进展|状态)\b/g, confidence: 0.75 }
        ];
        
        for (const actionPattern of actionIntentPatterns) {
            let match;
            while ((match = actionPattern.pattern.exec(text)) !== null) {
                let actionValue = match[0].trim();
                
                actionValue = actionValue.replace(/^(?:想|需要|希望|想要|打算|计划|请|麻烦|烦请|能否|能不能|可否|是否可以)\s+/, '');
                actionValue = actionValue.trim();
                
                if (actionValue.length >= 2 && actionValue.length <= 10) {
                    if (!this.isStopWord(actionValue) && this.isValidActionIntentContext(text, match.index, match.index + match[0].length)) {
                        const existingEntity = entities.find(e => e.value === actionValue);
                        if (!existingEntity) {
                            entities.push({
                                type: 'action_intent',
                                value: actionValue,
                                start: match.index,
                                end: match.index + match[0].length,
                                confidence: actionPattern.confidence
                            });
                        }
                    }
                }
            }
        }
        
        for (const { verb, context } of this.actionIntentKeywords) {
            const index = text.indexOf(verb);
            if (index !== -1) {
                const existingEntity = entities.find(e => e.value === verb);
                if (!existingEntity && !this.isStopWord(verb)) {
                    entities.push({
                        type: 'action_intent',
                        value: verb,
                        start: index,
                        end: index + verb.length,
                        confidence: 0.80,
                        context: context
                    });
                }
            }
        }
        
        return entities;
    }

    isLikelyPersonName(value) {
        if (value.length < 2 || value.length > 4) return false;
        if (this.isStopWord(value)) return false;
        
        const startsWithSurname = this.chineseSurnames.some(s => value.startsWith(s));
        const allChinese = /^[\u4e00-\u9fa5]+$/.test(value);
        
        return startsWithSurname && allChinese;
    }

    removeOverlappingEntities(entities) {
        if (entities.length === 0) return [];
        
        entities.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            return b.end - a.end;
        });
        
        const result = [];
        let lastEnd = -1;
        
        for (const entity of entities) {
            if (entity.start >= lastEnd) {
                result.push(entity);
                lastEnd = entity.end;
            } else {
                const lastEntity = result[result.length - 1];
                const currentPriority = this.entityTypes[entity.type]?.priority || 99;
                const lastPriority = this.entityTypes[lastEntity.type]?.priority || 99;
                
                if (currentPriority < lastPriority && entity.confidence >= lastEntity.confidence) {
                    result[result.length - 1] = entity;
                    lastEnd = entity.end;
                }
            }
        }
        
        return result;
    }

    groupEntities(entities) {
        const grouped = {};
        
        for (const type of Object.keys(this.entityTypes)) {
            grouped[type] = [];
        }
        
        const seen = new Set();
        
        for (const entity of entities) {
            const key = `${entity.type}-${entity.value}`;
            if (!seen.has(key)) {
                seen.add(key);
                if (grouped[entity.type]) {
                    grouped[entity.type].push({
                        value: entity.value,
                        confidence: entity.confidence,
                        unit: entity.unit,
                        context: entity.context
                    });
                }
            }
        }
        
        for (const type of Object.keys(grouped)) {
            grouped[type].sort((a, b) => b.confidence - a.confidence);
        }
        
        return grouped;
    }

    async extractWithModel(text) {
        const entities = [];
        
        if (this.model) {
            const words = this.tokenize(text);
            const tokens = words.map(w => this.hashWord(w) % 10000);
            const padded = this.padSequence(tokens, 100);
            
            const tensor = tf.tensor2d([padded], [1, 100]);
            const prediction = this.model.predict(tensor);
            const predictions = await prediction.array();
            
            tensor.dispose();
            prediction.dispose();
        }
        
        return entities;
    }

    tokenize(text) {
        return text.split(/[\s,，.。!！?？;；:：]+/).filter(w => w.length > 0);
    }

    hashWord(word) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    padSequence(sequence, maxLength) {
        if (sequence.length >= maxLength) {
            return sequence.slice(0, maxLength);
        }
        return [...new Array(maxLength - sequence.length).fill(0), ...sequence];
    }

    getEntityLabel(type) {
        return this.entityTypes[type]?.label || type;
    }
}

window.EntityExtractor = EntityExtractor;