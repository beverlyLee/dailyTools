class ActionItemExtractor {
    constructor() {
        this.strongActionVerbs = [
            '负责', '提交', '完成', '准备', '跟进',
            '制定', '整理', '采购', '修复'
        ];

        this.taskKeywords = [
            '性能优化', '测试计划', '功能测试', '推广方案', '宣传材料',
            '用户需求', '工作汇报', '监控方案', '预算审批', '服务器',
            '初稿', '问题', '反馈', '文档', '材料', '方案', '计划',
            '灰度发布', '正式上线', '修复', '整理', '采购'
        ];

        this.timeKeywords = [
            '明天', '明天下午', '明天上午', '今晚', '今天',
            '下周一', '下周二', '下周三', '下周四', '下周五',
            '本周', '本周五', '本周内', '下周', '下周内',
            '尽快', '立刻', '马上', '立即'
        ];

        this.noisePhrases = [
            '大家好', '今天我们来开这个周会', '先回顾一下上周的工作进展吧',
            '你那边的用户反馈处理得怎么样了', '你这边有什么问题吗',
            '用户那边催得比较紧', '用户体验很重要',
            '方便开发团队参考', '这样我们才能', '之前要有结果',
            '确保系统稳定运行', '大家记得', '也需要配合',
            '给大家审核', '需要的', '必须在',
            '关于用户反馈的那个 bug', '经过大家的讨论', '决定在', '然后'
        ];

        this.greetingPhrases = [
            '大家好', '早上好', '下午好', '晚上好', '你好', '您好',
            '散会', '会议就到这里', '今天的会议到此结束',
            '谢谢大家', '感谢大家', '辛苦了', '再见', '拜拜',
            '还有什么问题', '有没有其他问题', '没有问题了',
            '今天我们来开这个周会', '先回顾一下上周的工作进展吧',
            '你那边的用户反馈处理得怎么样了', '你这边有什么问题吗',
            '经过大家的讨论', '关于用户反馈的那个 bug'
        ];
    }

    extract(text) {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const sentences = this.splitIntoSentences(text);
        const rawItems = [];

        for (const sentence of sentences) {
            if (this.isGreetingOnly(sentence)) {
                continue;
            }

            const cleanedSentence = this.cleanSentence(sentence);
            if (!cleanedSentence || cleanedSentence.length < 10) {
                continue;
            }

            const actionItems = this.extractActionItemsFromSentence(cleanedSentence);
            for (const item of actionItems) {
                if (this.isValidActionItem(item)) {
                    rawItems.push(item);
                }
            }
        }

        return this.deduplicateAndFilter(rawItems);
    }

    splitIntoSentences(text) {
        return text
            .split(/[。！？；!;\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 5);
    }

    isGreetingOnly(sentence) {
        const hasActionVerb = this.strongActionVerbs.some(v => sentence.includes(v));
        if (hasActionVerb) {
            return false;
        }

        for (const phrase of this.greetingPhrases) {
            if (sentence.includes(phrase)) {
                return true;
            }
        }

        return false;
    }

    cleanSentence(sentence) {
        let cleaned = sentence;

        for (const noise of this.noisePhrases) {
            cleaned = cleaned.split(noise).join('');
        }

        cleaned = cleaned.replace(/^[嗯啊哦呃，,好的所以那么对了还有另外不过但是而且以及首先其次最后接下来我觉得我认为应该必须需要可以要请\s]+/, '');
        cleaned = cleaned.replace(/[嗯啊哦呃，,\s]+$/, '');

        cleaned = cleaned.trim();

        if (cleaned.length < 10) {
            return null;
        }

        return cleaned;
    }

    extractActionItemsFromSentence(sentence) {
        const items = [];

        const sentenceContext = this.buildSentenceContext(sentence);

        const clauses = this.splitIntoClauses(sentence);

        for (const clause of clauses) {
            const item = this.extractFromClause(clause, sentence, sentenceContext);
            if (item) {
                items.push(item);
            }
        }

        return items;
    }

    splitIntoClauses(sentence) {
        const clauses = [];
        let currentClause = '';

        for (let i = 0; i < sentence.length; i++) {
            const char = sentence[i];
            if (char === '，' || char === ',') {
                const trimmed = currentClause.trim();
                const hasActionVerb = this.strongActionVerbs.some(v => trimmed.includes(v));
                
                if (hasActionVerb && trimmed.length >= 4) {
                    clauses.push(trimmed);
                } else if (trimmed.length >= 6) {
                    clauses.push(trimmed);
                }
                currentClause = '';
            } else {
                currentClause += char;
            }
        }

        const trimmed = currentClause.trim();
        const hasActionVerb = this.strongActionVerbs.some(v => trimmed.includes(v));
        
        if (hasActionVerb && trimmed.length >= 4) {
            clauses.push(trimmed);
        } else if (trimmed.length >= 6) {
            clauses.push(trimmed);
        }

        return clauses;
    }

    extractFromClause(clause, fullSentence, sentenceContext) {
        const hasActionVerb = this.strongActionVerbs.some(v => clause.includes(v));
        if (!hasActionVerb) {
            return null;
        }

        const assignee = this.extractAssigneeFromClause(clause, fullSentence);
        const time = this.extractTimeForAssignee(clause, fullSentence, assignee, sentenceContext);
        const task = this.extractTask(clause);

        if (!task || task.length < 5) {
            return null;
        }

        const hasAssignee = assignee !== null;
        const hasTime = time !== null;

        if (!hasAssignee && !hasTime) {
            return null;
        }

        const taskCore = this.extractTaskCore(task);

        return {
            action: task,
            assignee: assignee || '待定',
            deadline: time || '待定',
            priority: this.determinePriority(time),
            taskCore: taskCore,
            originalSentence: fullSentence
        };
    }

    extractAssigneeFromClause(clause, fullSentence) {
        const patterns = [
            /(产品经理|项目经理|技术经理|测试经理|运营经理|市场经理)/,
            /(测试团队|开发团队|运营团队|市场团队|产品团队)/,
            /(产品部门|测试部门|开发部门|运营部门|市场部门|财务部门)/,
            /由\s*([\u4e00-\u9fa5]{1,3}[工师总])/,
            /请\s*([\u4e00-\u9fa5]{1,3}[工师总])/,
            /([\u4e00-\u9fa5]{1,3}[工师总])\s*(负责|来做|跟进|处理|完成|提交|准备|来负责|需要|来)/,
            /([\u4e00-\u9fa5]{1,3}[工师总])(?!队|门|理)/
        ];

        for (const regex of patterns) {
            const match = clause.match(regex);
            if (match) {
                const name = match[1] ? match[1].trim() : match[0].trim();
                if (this.isValidAssigneeName(name)) {
                    return name;
                }
            }
        }

        for (const regex of patterns) {
            const match = fullSentence.match(regex);
            if (match) {
                const name = match[1] ? match[1].trim() : match[0].trim();
                if (this.isValidAssigneeName(name)) {
                    return name;
                }
            }
        }

        return null;
    }

    isValidAssigneeName(name) {
        if (!name || name.length === 0) {
            return false;
        }

        if (name.length < 2 || name.length > 10) {
            return false;
        }

        const isTeamOrDept = name.endsWith('团队') || name.endsWith('部门') || name.endsWith('经理');

        const invalidKeywords = [
            '今天', '明天', '后天', '本周', '下周', '本', '下',
            '周一', '周二', '周三', '周四', '周五', '周六', '周日',
            '之前', '以后', '现在', '然后', '还有', '那个', '这个',
            '用户', '问题', '反馈', '计划', '方案', '任务', '项目',
            '需要', '必须', '应该', '可以', '可能', '一定',
            '各自的', '的工', '各自'
        ];

        for (const keyword of invalidKeywords) {
            if (name.includes(keyword) && !isTeamOrDept) {
                return false;
            }
        }

        const chineseOnly = /^[\u4e00-\u9fa5]+$/;
        return chineseOnly.test(name);
    }

    extractTimeForAssignee(clause, fullSentence, assignee, sentenceContext) {
        const timePatterns = [
            '明天下午', '明天上午', '明天晚上', '今天下午', '今天晚上',
            '下周三', '下周五', '下周二', '下周一', '下周四',
            '本周五', '本周内', '下周内', '尽快', '立刻', '马上',
            '明天', '今天', '本周', '下周'
        ];

        for (const pattern of timePatterns) {
            if (clause.includes(pattern)) {
                return pattern;
            }
        }

        if (!assignee) {
            return null;
        }

        if (!sentenceContext || !sentenceContext.assigneeTimeMap) {
            return null;
        }

        const mappedTime = sentenceContext.assigneeTimeMap.get(assignee);
        if (mappedTime) {
            return mappedTime;
        }

        if (sentenceContext.sentenceHasSingleAssignee && sentenceContext.sentenceTimes.length > 0) {
            return sentenceContext.sentenceTimes[0];
        }

        return null;
    }

    buildSentenceContext(fullSentence) {
        const context = {
            allAssignees: this.findAllAssigneesInSentence(fullSentence),
            sentenceTimes: this.findAllTimesInSentence(fullSentence),
            assigneeTimeMap: new Map(),
            sentenceHasSingleAssignee: false
        };

        context.sentenceHasSingleAssignee = context.allAssignees.length === 1;

        if (context.allAssignees.length === 1 && context.sentenceTimes.length > 0) {
            const assignee = context.allAssignees[0];
            const time = this.findClosestTimeToAssignee(fullSentence, assignee, context.sentenceTimes);
            if (time) {
                context.assigneeTimeMap.set(assignee, time);
            }
        } else if (context.allAssignees.length > 1 && context.sentenceTimes.length > 0) {
            this.buildAssigneeTimeMap(fullSentence, context);
        }

        return context;
    }

    findAllAssigneesInSentence(fullSentence) {
        const assignees = [];
        const seen = new Set();

        const patterns = [
            /(产品经理|项目经理|技术经理|测试经理|运营经理|市场经理)/g,
            /(测试团队|开发团队|运营团队|市场团队|产品团队)/g,
            /(产品部门|测试部门|开发部门|运营部门|市场部门|财务部门)/g,
            /由\s*([\u4e00-\u9fa5]{1,3}[工师总])/g,
            /请\s*([\u4e00-\u9fa5]{1,3}[工师总])/g,
            /([\u4e00-\u9fa5]{1,3}[工师总])\s*(负责|来做|跟进|处理|完成|提交|准备|来负责|需要|来)/g,
            /([\u4e00-\u9fa5]{1,3}[工师总])(?!队|门|理)/g
        ];

        for (const regex of patterns) {
            let match;
            while ((match = regex.exec(fullSentence)) !== null) {
                const name = match[1] ? match[1].trim() : match[0].trim();
                if (this.isValidAssigneeName(name) && !seen.has(name)) {
                    seen.add(name);
                    assignees.push(name);
                }
            }
        }

        return assignees;
    }

    findAllTimesInSentence(fullSentence) {
        const times = [];
        const seen = new Set();

        const timePatterns = [
            '明天下午', '明天上午', '明天晚上', '今天下午', '今天晚上',
            '下周三', '下周五', '下周二', '下周一', '下周四',
            '本周五', '本周内', '下周内', '尽快', '立刻', '马上',
            '明天', '今天', '本周', '下周'
        ];

        for (const pattern of timePatterns) {
            let startIndex = 0;
            while (startIndex < fullSentence.length) {
                const idx = fullSentence.indexOf(pattern, startIndex);
                if (idx === -1) break;
                
                const key = `${pattern}_${idx}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    times.push({ text: pattern, start: idx });
                }
                startIndex = idx + pattern.length;
            }
        }

        return times.sort((a, b) => a.start - b.start);
    }

    findClosestTimeToAssignee(fullSentence, assignee, times) {
        const assigneeIndex = fullSentence.indexOf(assignee);
        if (assigneeIndex === -1) {
            return times.length > 0 ? times[0].text : null;
        }

        let closestTime = null;
        let minDistance = Infinity;

        for (const time of times) {
            const distance = Math.abs(time.start - assigneeIndex);
            if (distance < minDistance) {
                minDistance = distance;
                closestTime = time.text;
            }
        }

        return closestTime;
    }

    buildAssigneeTimeMap(fullSentence, context) {
        const assignees = context.allAssignees;
        const times = context.sentenceTimes;

        for (const assignee of assignees) {
            const assigneeIndex = fullSentence.indexOf(assignee);
            if (assigneeIndex === -1) continue;

            let closestTime = null;
            let minDistance = Infinity;
            const MAX_DISTANCE = 60;

            for (const time of times) {
                if (time.start < assigneeIndex) {
                    continue;
                }
                
                const distance = time.start - assigneeIndex;
                if (distance < minDistance && distance <= MAX_DISTANCE) {
                    minDistance = distance;
                    closestTime = time.text;
                }
            }

            if (closestTime) {
                context.assigneeTimeMap.set(assignee, closestTime);
            }
        }
    }

    extractTask(clause) {
        let task = clause;

        for (const noise of this.noisePhrases) {
            task = task.split(noise).join('');
        }

        const timePatterns = [
            '明天下午', '明天上午', '明天晚上', '今天下午', '今天晚上',
            '下周三', '下周五', '下周二', '下周一', '下周四',
            '本周五', '本周内', '下周内', '尽快', '立刻', '马上',
            '明天', '今天', '本周', '下周'
        ];

        for (const pattern of timePatterns) {
            const regex = new RegExp(`[，,]*[需要]?${pattern}[，,]*([之]?[前后内]?)[，,]*`);
            task = task.replace(regex, '');
        }

        task = task.replace(/[。！？；!;\s]+$/, '');
        task = task.replace(/[，,\s]+$/, '');
        task = task.replace(/^[，,\s]+/, '');
        task = task.replace(/需要在\s*/g, '');
        task = task.trim();

        if (task.length < 5) {
            return null;
        }

        const hasKeyword = this.taskKeywords.some(k => task.includes(k));
        const hasActionVerb = this.strongActionVerbs.some(v => task.includes(v));
        
        if (!hasKeyword && !hasActionVerb) {
            return null;
        }

        return task;
    }

    extractTaskCore(task) {
        if (!task) return '';

        let core = task;

        for (const verb of this.strongActionVerbs) {
            if (core.startsWith(verb)) {
                core = core.substring(verb.length);
                break;
            }
            if (core.includes(verb)) {
                const idx = core.indexOf(verb);
                core = core.substring(idx + verb.length);
                break;
            }
        }

        core = core.trim();
        core = core.replace(/^[的了着过在]+/, '');
        core = core.trim();

        const noiseWords = ['那个', '这个', '这些', '那些', '完整的', '相关的', '各自的', '的', '好', '好的', '来'];
        for (const noise of noiseWords) {
            core = core.replace(noise, '');
        }

        return core.substring(0, 20);
    }

    isValidActionItem(item) {
        if (!item.action || item.action.length < 5) {
            return false;
        }

        const hasAssignee = item.assignee !== '待定';
        const hasDeadline = item.deadline !== '待定';

        if (!hasAssignee && !hasDeadline) {
            return false;
        }

        if (hasAssignee && !this.isValidAssigneeName(item.assignee)) {
            return false;
        }

        const hasActionVerb = this.strongActionVerbs.some(v => 
            item.action.startsWith(v) || item.action.includes(v)
        );
        if (!hasActionVerb) {
            return false;
        }

        return true;
    }

    determinePriority(time) {
        if (!time) {
            return '中';
        }

        const highPriority = ['今天', '明天', '明天下午', '明天上午', '明天晚上', 
                              '今天下午', '今天晚上', '今晚', '尽快', '立刻', '马上'];
        for (const t of highPriority) {
            if (time.includes(t)) {
                return '高';
            }
        }

        return '中';
    }

    deduplicateAndFilter(items) {
        const hashMap = new Map();
        const unique = [];

        for (const item of items) {
            const hashKey = this.generateHashKey(item);

            if (hashMap.has(hashKey)) {
                const existing = hashMap.get(hashKey);
                this.mergeIntoExisting(existing, item);
            } else {
                hashMap.set(hashKey, item);
                unique.push(item);
            }
        }

        const filtered = unique.filter(item => {
            const hasAssignee = item.assignee !== '待定';
            const hasDeadline = item.deadline !== '待定';
            
            if (!item.action || item.action.length < 5) return false;
            if (!hasAssignee && !hasDeadline) return false;
            return true;
        });

        return filtered.map((item, index) => ({
            ...item,
            id: index + 1
        }));
    }

    generateHashKey(item) {
        let actionText = item.action;

        const noiseWords = ['那个', '这个', '这些', '那些', '完整的', '相关的', '各自的', '的', '所有的', '好', '好的', '来', '一下'];
        for (const noise of noiseWords) {
            actionText = actionText.replace(noise, '');
        }

        let foundNouns = [];
        for (const noun of this.taskKeywords) {
            if (actionText.includes(noun)) {
                foundNouns.push(noun);
            }
        }

        if (foundNouns.length === 0) {
            let verbFound = '';
            let verbIndex = -1;
            for (const verb of this.strongActionVerbs) {
                const idx = actionText.indexOf(verb);
                if (idx !== -1 && (verbIndex === -1 || idx < verbIndex)) {
                    verbFound = verb;
                    verbIndex = idx;
                }
            }
            if (verbIndex !== -1) {
                foundNouns = [actionText.substring(verbIndex + verbFound.length)];
            }
        }

        const assignee = item.assignee === '待定' ? '' : item.assignee;
        const key = `${assignee}|${foundNouns.join(',')}`
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[，。！？、；：]+/g, '');

        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return Math.abs(hash).toString();
    }

    mergeIntoExisting(existing, newItem) {
        if (existing.assignee === '待定' && newItem.assignee !== '待定') {
            existing.assignee = newItem.assignee;
        }

        if (existing.deadline === '待定' && newItem.deadline !== '待定') {
            existing.deadline = newItem.deadline;
        }

        if (newItem.priority === '高' && existing.priority !== '高') {
            existing.priority = '高';
        }

        if (newItem.action.length > existing.action.length) {
            const existingCore = this.extractTaskCore(existing.action);
            const newCore = this.extractTaskCore(newItem.action);
            
            if (newCore.length > existingCore.length) {
                existing.action = newItem.action;
                existing.taskCore = newItem.taskCore;
            }
        }
    }

    formatActionItems(items) {
        if (items.length === 0) {
            return '未检测到明确的行动项。';
        }

        return items.map((item, index) => {
            let formatted = `${index + 1}. ${item.action}`;

            if (item.assignee !== '待定') {
                formatted += `\n   负责人: ${item.assignee}`;
            }

            if (item.deadline !== '待定') {
                formatted += `\n   截止时间: ${item.deadline}`;
            }

            formatted += `\n   优先级: ${item.priority}`;

            return formatted;
        }).join('\n\n');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActionItemExtractor;
}
