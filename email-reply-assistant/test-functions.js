console.log('=== 测试重构后的智能邮件回复助手核心功能 ===\n');

const testCases = [
    {
        name: '测试1：商业询价邮件',
        email: `您好，我想咨询一下贵公司的「智能办公系统Pro版」的价格是多少？另外是否有年度订阅优惠？
期待您的回复！
--
李明
科技有限公司`,
        expectedIntent: 'commercial_inquiry',
        expectedEntities: ['person', 'product', 'action']
    },
    {
        name: '测试2：投诉邮件',
        email: `您好，我对你们的服务非常不满意！产品出问题已经一周了还没有解决，我要求退款。
--
张经理
不满意客户公司`,
        expectedIntent: 'complaint',
        expectedEntities: ['person', 'company', 'action']
    },
    {
        name: '测试3：进度查询邮件',
        email: `您好，想了解一下我们上次讨论的项目进展如何了？预计什么时候可以完成？
谢谢！
--
王总
ABC科技`,
        expectedIntent: 'status_inquiry',
        expectedEntities: ['person', 'company', 'action']
    },
    {
        name: '测试4：模糊内容（应识别为未知）',
        email: `今天天气不错，吃了吗？`,
        expectedIntent: 'unknown',
        expectedEntities: []
    }
];

function runTests() {
    let allPassed = true;
    
    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`开始: ${testCase.name}`);
        console.log(`${'='.repeat(60)}`);
        
        const result = runSingleTest(testCase);
        if (!result.passed) {
            allPassed = false;
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试汇总：${allPassed ? '全部通过 ✓' : '部分失败 ✗'}`);
    console.log(`${'='.repeat(60)}`);
    
    return allPassed;
}

function runSingleTest(testCase) {
    console.log('\n邮件内容：');
    console.log(testCase.email);
    console.log('');
    
    const intentResult = testIntentClassification(testCase.email);
    const entityResult = testEntityExtraction(testCase.email);
    
    let intentPassed = intentResult.intent === testCase.expectedIntent;
    let entitiesPassed = testCase.expectedEntities.every(type => 
        entityResult[type] && entityResult[type].length > 0
    );
    
    console.log('\n意图识别结果：');
    console.log(`  识别意图: ${intentResult.intent} (${intentResult.label})`);
    console.log(`  置信度: ${(intentResult.confidence * 100).toFixed(1)}%`);
    console.log(`  期望意图: ${testCase.expectedIntent}`);
    console.log(`  测试结果: ${intentPassed ? '✓ 通过' : '✗ 失败'}`);
    
    console.log('\n实体抽取结果：');
    for (const [type, entities] of Object.entries(entityResult)) {
        if (entities && entities.length > 0) {
            console.log(`  ${type}: ${entities.map(e => e.value).join(', ')}`);
        }
    }
    
    const hasEntities = Object.values(entityResult).some(e => e && e.length > 0);
    if (!hasEntities) {
        console.log('  未识别到实体');
    }
    
    console.log(`\n实体测试结果: ${entitiesPassed ? '✓ 通过' : '✗ 失败'}`);
    
    return {
        passed: intentPassed && entitiesPassed,
        intent: intentResult,
        entities: entityResult
    };
}

function testIntentClassification(text) {
    const priorityKeywords = {
        price_related: [
            '价格', '多少钱', '优惠', '折扣', '报价', '费用',
            '定价', '售价', '成本', '费率', '包月', '包年',
            '订阅费', '会员费', '折扣价', '促销价', '特价',
            '砍价', '便宜', '划算', '性价比', '预算',
            'price', 'cost', 'quote', 'discount', 'how much',
            'pricing', 'fee', 'rate', 'cheap', 'budget'
        ]
    };
    
    const keywordPatterns = {
        commercial_inquiry: [
            '价格', '多少钱', '优惠', '折扣', '报价', '费用', '收费', '定价', '售价',
            '订阅', '套餐', '版本', '购买', '采购', '预算', '性价比',
            'price', 'cost', 'quote', 'pricing', 'how much', 'discount', 'buy', 'purchase'
        ],
        complaint: [
            '投诉', '不满', '不满意', '抱怨', '糟糕', '失望', '生气',
            '问题严重', '太差了', '退款', '维权',
            'complain', 'complaint', 'unhappy', 'dissatisfied', 'angry', 'refund'
        ],
        status_inquiry: [
            '进度', '进展', '状态', '怎么样了', '到哪一步了', '什么时候完成',
            '处理得怎么样', '有消息了吗', '结果如何', '更新',
            'status', 'progress', 'update', 'how is it going', 'what is the status'
        ],
        meeting_request: [
            '开会', '会议', '见面', '预约', '安排时间', '抽空',
            '约个时间', '电话沟通', '视频会议', '拜访',
            'meeting', 'schedule', 'appointment', 'meet up', 'call', 'visit'
        ],
        general_inquiry: [
            '咨询', '了解', '想问一下', '关于', '请问', '了解一下',
            'inquiry', 'question', 'about', 'regarding', 'ask'
        ]
    };
    
    const intentPriority = {
        commercial_inquiry: 5,
        complaint: 4,
        status_inquiry: 3,
        meeting_request: 2,
        general_inquiry: 1
    };
    
    const intentLabels = {
        commercial_inquiry: '商业询价',
        complaint: '投诉反馈',
        status_inquiry: '进度查询',
        meeting_request: '会议请求',
        general_inquiry: '一般咨询',
        unknown: '未知'
    };
    
    const highWeightKeywords = {
        commercial_inquiry: ['价格', '多少钱', '报价', '优惠', '折扣', 'price', 'how much', 'quote', 'discount'],
        complaint: ['投诉', '不满', 'complain', 'complaint', '退款', 'refund'],
        status_inquiry: ['进度', '进展', '状态', 'status', 'progress', 'update'],
        meeting_request: ['开会', '会议', 'meeting', 'schedule', 'appointment'],
        general_inquiry: ['咨询', 'inquiry', 'question', 'ask']
    };
    
    const textLower = text.toLowerCase();
    const confidenceThreshold = 0.5;
    
    let priceRelatedCount = 0;
    for (const keyword of priorityKeywords.price_related) {
        const regex = new RegExp(keyword, 'gi');
        const matches = textLower.match(regex);
        if (matches) {
            priceRelatedCount += matches.length;
        }
    }
    
    if (priceRelatedCount > 0) {
        let confidence = 0;
        if (priceRelatedCount >= 3) {
            confidence = 0.95;
        } else if (priceRelatedCount >= 2) {
            confidence = 0.85;
        } else {
            confidence = 0.75;
        }
        
        if (confidence >= confidenceThreshold) {
            return {
                intent: 'commercial_inquiry',
                label: intentLabels['commercial_inquiry'],
                confidence: confidence,
                isPriorityMatch: true
            };
        }
    }
    
    const scores = {};
    for (const [intent, keywords] of Object.entries(keywordPatterns)) {
        scores[intent] = 0;
        const highWeights = highWeightKeywords[intent] || [];
        for (const keyword of keywords) {
            const regex = new RegExp(keyword, 'gi');
            const matches = textLower.match(regex);
            if (matches) {
                const weight = highWeights.includes(keyword) ? 3 : 1;
                scores[intent] += matches.length * weight;
            }
        }
    }
    
    let maxScore = 0;
    let topIntent = 'general_inquiry';
    let maxPriority = intentPriority['general_inquiry'];
    
    for (const [intent, score] of Object.entries(scores)) {
        if (score > 0) {
            const currentPriority = intentPriority[intent] || 0;
            
            if (score > maxScore) {
                maxScore = score;
                topIntent = intent;
                maxPriority = currentPriority;
            } else if (score === maxScore && currentPriority > maxPriority) {
                topIntent = intent;
                maxPriority = currentPriority;
            }
        }
    }
    
    const scoreValues = Object.values(scores);
    const total = scoreValues.reduce((a, b) => a + b, 0);
    
    let confidence = 0.3;
    if (total > 0) {
        const sortedScores = [...scoreValues].sort((a, b) => b - a);
        const secondMaxScore = sortedScores[1] || 0;
        const margin = maxScore - secondMaxScore;
        const ratio = maxScore / total;
        
        confidence = 0.5 + (ratio * 0.3) + (margin / (total + 1) * 0.2);
        
        if (maxScore >= 5) {
            confidence += 0.1;
        } else if (maxScore >= 3) {
            confidence += 0.05;
        }
        
        confidence = Math.min(0.95, Math.max(0.3, confidence));
    }
    
    if (confidence < confidenceThreshold) {
        return {
            intent: 'unknown',
            label: intentLabels['unknown'],
            confidence: confidence
        };
    }
    
    return {
        intent: topIntent,
        label: intentLabels[topIntent],
        confidence: confidence
    };
}

function testEntityExtraction(text) {
    const entities = {
        person: [],
        company: [],
        product: [],
        action: [],
        date: [],
        amount: [],
        email: [],
        phone: []
    };
    
    const productMatch = text.match(/[《「『"]([^《」』"]+?)[》」』"]/);
    if (productMatch) {
        entities.product.push({ value: productMatch[1], confidence: 0.95 });
    }
    
    const commonProducts = ['智能办公系统', 'CRM系统', 'ERP系统', '云服务', '企业版', '专业版', 'Pro版'];
    for (const product of commonProducts) {
        if (text.includes(product)) {
            entities.product.push({ value: product, confidence: 0.90 });
        }
    }
    
    const companyPatterns = [
        /([^\n，,。；;\s]+(?:公司|集团|有限公司|科技|软件|信息技术|咨询|服务))/g,
        /([A-Za-z0-9\s]+(?:Inc|Ltd|LLC|Corporation|Company))/g
    ];
    
    for (const pattern of companyPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const value = match[1].trim();
            if (value.length >= 2) {
                entities.company.push({ value: value, confidence: 0.85 });
            }
        }
    }
    
    const signatureMatch = text.match(/(?:--|—|—-|===)[\s\n]*([^\n]{2,12})/);
    if (signatureMatch) {
        entities.person.push({ value: signatureMatch[1].trim(), confidence: 0.95 });
    }
    
    const nameMatch = text.match(/(?:尊敬的|亲爱的|您好，?\s*)?([李王张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗][氏]?[\u4e00-\u9fa5]{1,2})(?:先生|女士|老师|总|经理|总监|老板)?/);
    if (nameMatch && nameMatch[1] && nameMatch[1].length >= 2 && nameMatch[1].length <= 4) {
        let nameValue = nameMatch[1].replace(/先生|女士|老师|总|经理|总监|老板/g, '');
        entities.person.push({ value: nameValue.trim(), confidence: 0.75 });
    }
    
    const actionKeywords = ['咨询', '了解', '询问', '报价', '购买', '采购', '订阅', '投诉', '反馈', '抱怨', '不满意', '退款', '进度', '进展', '预约', '确认', '取消', '查看', '申请', '提交'];
    for (const action of actionKeywords) {
        if (text.includes(action)) {
            entities.action.push({ value: action, confidence: 0.85 });
        }
    }
    
    const dateMatch = text.match(/\d{4}年\d{1,2}月\d{1,2}日|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:下|上|这)周[一二三四五六日天末]?|(?:明|后|今)天/);
    if (dateMatch) {
        entities.date.push({ value: dateMatch[0], confidence: 0.90 });
    }
    
    const amountMatch = text.match(/[¥￥]\s?\d+(?:\.\d+)?|\d+\s*元|\d+\s*美元|\d+\s*万/);
    if (amountMatch) {
        entities.amount.push({ value: amountMatch[0], confidence: 0.95 });
    }
    
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
        entities.email.push({ value: emailMatch[0], confidence: 0.98 });
    }
    
    const phoneMatch = text.match(/1[3-9]\d{9}/);
    if (phoneMatch) {
        entities.phone.push({ value: phoneMatch[0], confidence: 0.92 });
    }
    
    for (const type of Object.keys(entities)) {
        const seen = new Set();
        entities[type] = entities[type].filter(e => {
            if (seen.has(e.value)) return false;
            seen.add(e.value);
            return true;
        });
    }
    
    return entities;
}

runTests();