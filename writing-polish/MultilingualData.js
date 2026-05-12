export const LANGUAGES = {
    en: {
        name: 'English',
        nativeName: 'English',
        code: 'en',
        flag: '🇬🇧',
        description: 'English',
        examples: [
            'He is a very good man',
            'This is a nice place',
            'She don\'t like the book'
        ]
    },
    zh: {
        name: 'Chinese',
        nativeName: '中文',
        code: 'zh',
        flag: '🇨🇳',
        description: '中文（简体）',
        examples: [
            '他是一个很好的人',
            '这个地方很美丽',
            '我觉得这个电影很棒'
        ]
    },
    ko: {
        name: 'Korean',
        nativeName: '한국어',
        code: 'ko',
        flag: '🇰🇷',
        description: '한국어',
        examples: [
            '그는 정말 좋은 사람입니다',
            '이 영화는 정말 재미있어요',
            '오늘 날씨가 아주 좋네요'
        ]
    },
    ja: {
        name: 'Japanese',
        nativeName: '日本語',
        code: 'ja',
        flag: '🇯🇵',
        description: '日本語',
        examples: [
            '彼はとても良い人です',
            'この映画はとても面白いです',
            '今日は天気がいいですね'
        ]
    },
    de: {
        name: 'German',
        nativeName: 'Deutsch',
        code: 'de',
        flag: '🇩🇪',
        description: 'Deutsch',
        examples: [
            'Er ist ein sehr guter Mann',
            'Das ist eine schöne Stadt',
            'Ich habe sehr viel Spaß'
        ]
    },
    fr: {
        name: 'French',
        nativeName: 'Français',
        code: 'fr',
        flag: '🇫🇷',
        description: 'Français',
        examples: [
            'Il est un très bon homme',
            'C\'est une très belle ville',
            'Je suis très content aujourd\'hui'
        ]
    }
};

export const VOCAB_DATA = {
    en: {
        adjectives: {
            "good": {
                replacements: [
                    { word: "excellent", score: 0.95, context: "general" },
                    { word: "outstanding", score: 0.93, context: "achievement" },
                    { word: "exceptional", score: 0.92, context: "quality" },
                    { word: "superb", score: 0.90, context: "general" },
                    { word: "remarkable", score: 0.88, context: "impressive" },
                    { word: "splendid", score: 0.85, context: "formal" },
                    { word: "magnificent", score: 0.83, context: "grandeur" },
                    { word: "wonderful", score: 0.82, context: "positive" }
                ],
                explanation: "描述品质或表现出色"
            },
            "bad": {
                replacements: [
                    { word: "detrimental", score: 0.95, context: "harmful" },
                    { word: "atrocious", score: 0.93, context: "extreme" },
                    { word: "inferior", score: 0.91, context: "quality" },
                    { word: "substandard", score: 0.89, context: "quality" },
                    { word: "dreadful", score: 0.87, context: "negative" },
                    { word: "abysmal", score: 0.85, context: "extreme" },
                    { word: "appalling", score: 0.83, context: "shocking" },
                    { word: "mediocre", score: 0.80, context: "average" }
                ],
                explanation: "描述品质或表现不佳"
            },
            "nice": {
                replacements: [
                    { word: "pleasant", score: 0.92, context: "general" },
                    { word: "charming", score: 0.90, context: "personality" },
                    { word: "delightful", score: 0.88, context: "experience" },
                    { word: "agreeable", score: 0.86, context: "social" },
                    { word: "enjoyable", score: 0.84, context: "experience" }
                ],
                explanation: "描述人或事物令人愉悦"
            },
            "big": {
                replacements: [
                    { word: "substantial", score: 0.94, context: "size/amount" },
                    { word: "considerable", score: 0.92, context: "amount" },
                    { word: "significant", score: 0.90, context: "importance/size" },
                    { word: "massive", score: 0.88, context: "extreme size" },
                    { word: "enormous", score: 0.86, context: "extreme size" },
                    { word: "tremendous", score: 0.78, context: "size/impact" }
                ],
                explanation: "描述尺寸或数量大"
            },
            "small": {
                replacements: [
                    { word: "modest", score: 0.92, context: "size/amount" },
                    { word: "minimal", score: 0.90, context: "amount" },
                    { word: "insignificant", score: 0.88, context: "importance" },
                    { word: "minute", score: 0.84, context: "size" },
                    { word: "compact", score: 0.80, context: "space" }
                ],
                explanation: "描述尺寸或数量小"
            },
            "happy": {
                replacements: [
                    { word: "delighted", score: 0.95, context: "pleasure" },
                    { word: "thrilled", score: 0.93, context: "excitement" },
                    { word: "ecstatic", score: 0.91, context: "extreme" },
                    { word: "elated", score: 0.89, context: "joy" },
                    { word: "overjoyed", score: 0.87, context: "extreme" }
                ],
                explanation: "描述愉悦或满足的情绪"
            },
            "beautiful": {
                replacements: [
                    { word: "stunning", score: 0.95, context: "visual" },
                    { word: "breathtaking", score: 0.93, context: "awe" },
                    { word: "exquisite", score: 0.91, context: "detail" },
                    { word: "gorgeous", score: 0.89, context: "general" },
                    { word: "magnificent", score: 0.87, context: "grandeur" }
                ],
                explanation: "描述视觉上吸引人的"
            },
            "important": {
                replacements: [
                    { word: "crucial", score: 0.96, context: "critical" },
                    { word: "vital", score: 0.94, context: "essential" },
                    { word: "essential", score: 0.92, context: "necessary" },
                    { word: "significant", score: 0.90, context: "general" },
                    { word: "paramount", score: 0.88, context: "supreme" }
                ],
                explanation: "描述具有重大意义或价值"
            },
            "interesting": {
                replacements: [
                    { word: "fascinating", score: 0.95, context: "captivating" },
                    { word: "compelling", score: 0.93, context: "engaging" },
                    { word: "intriguing", score: 0.91, context: "mysterious" },
                    { word: "gripping", score: 0.89, context: "attention" },
                    { word: "absorbing", score: 0.87, context: "immersive" }
                ],
                explanation: "描述引起兴趣或好奇心"
            },
            "difficult": {
                replacements: [
                    { word: "challenging", score: 0.94, context: "effort required" },
                    { word: "arduous", score: 0.92, context: "strenuous" },
                    { word: "demanding", score: 0.90, context: "requires effort" },
                    { word: "formidable", score: 0.88, context: "daunting" },
                    { word: "complex", score: 0.86, context: "intricate" }
                ],
                explanation: "描述需要努力或技能"
            },
            "easy": {
                replacements: [
                    { word: "straightforward", score: 0.94, context: "simple" },
                    { word: "effortless", score: 0.92, context: "no difficulty" },
                    { word: "simple", score: 0.90, context: "general" },
                    { word: "uncomplicated", score: 0.88, context: "clear" },
                    { word: "painless", score: 0.86, context: "smooth" }
                ],
                explanation: "描述不费力"
            },
            "kind": {
                replacements: [
                    { word: "compassionate", score: 0.95, context: "sympathy" },
                    { word: "benevolent", score: 0.93, context: "generous" },
                    { word: "thoughtful", score: 0.91, context: "considerate" },
                    { word: "considerate", score: 0.89, context: "aware of others" },
                    { word: "generous", score: 0.87, context: "giving" }
                ],
                explanation: "描述关心他人福祉"
            }
        },
        adverbs: {
            "very": {
                replacements: [
                    { word: "exceptionally", score: 0.95, context: "degree" },
                    { word: "exceedingly", score: 0.93, context: "formal" },
                    { word: "remarkably", score: 0.91, context: "notable" },
                    { word: "extremely", score: 0.89, context: "degree" },
                    { word: "incredibly", score: 0.87, context: "amazing" }
                ],
                explanation: "加强形容词或副词的程度"
            },
            "really": {
                replacements: [
                    { word: "truly", score: 0.93, context: "sincere" },
                    { word: "genuinely", score: 0.91, context: "authentic" },
                    { word: "actually", score: 0.89, context: "fact" },
                    { word: "indeed", score: 0.87, context: "emphasis" },
                    { word: "certainly", score: 0.85, context: "sure" }
                ],
                explanation: "表示真实性或强调"
            }
        },
        verbs: {
            "go": {
                replacements: [
                    { word: "proceed", score: 0.92, context: "formal" },
                    { word: "advance", score: 0.90, context: "progress" },
                    { word: "journey", score: 0.88, context: "travel" },
                    { word: "travel", score: 0.86, context: "distance" }
                ],
                explanation: "移动或前往某地"
            },
            "get": {
                replacements: [
                    { word: "acquire", score: 0.94, context: "obtain" },
                    { word: "obtain", score: 0.92, context: "formal" },
                    { word: "receive", score: 0.90, context: "given" },
                    { word: "attain", score: 0.88, context: "achieve" }
                ],
                explanation: "获得或取得"
            },
            "make": {
                replacements: [
                    { word: "create", score: 0.94, context: "produce" },
                    { word: "construct", score: 0.92, context: "build" },
                    { word: "develop", score: 0.90, context: "grow" },
                    { word: "establish", score: 0.86, context: "set up" }
                ],
                explanation: "创造或制造"
            },
            "say": {
                replacements: [
                    { word: "state", score: 0.94, context: "declare" },
                    { word: "express", score: 0.92, context: "communicate" },
                    { word: "declare", score: 0.90, context: "announce" },
                    { word: "assert", score: 0.88, context: "confident" }
                ],
                explanation: "用言语表达"
            },
            "think": {
                replacements: [
                    { word: "believe", score: 0.94, context: "opinion" },
                    { word: "consider", score: 0.92, context: "deliberate" },
                    { word: "ponder", score: 0.90, context: "deep thought" },
                    { word: "contemplate", score: 0.88, context: "deep thought" }
                ],
                explanation: "思考或有意见"
            },
            "like": {
                replacements: [
                    { word: "enjoy", score: 0.94, context: "pleasure" },
                    { word: "appreciate", score: 0.92, context: "value" },
                    { word: "prefer", score: 0.90, context: "choice" },
                    { word: "admire", score: 0.86, context: "respect" }
                ],
                explanation: "对某事物有好感"
            },
            "want": {
                replacements: [
                    { word: "desire", score: 0.94, context: "strong" },
                    { word: "wish", score: 0.92, context: "hope" },
                    { word: "aspire", score: 0.90, context: "ambition" },
                    { word: "seek", score: 0.88, context: "actively look" }
                ],
                explanation: "渴望或需要"
            }
        }
    },
    zh: {
        adjectives: {
            "好": {
                replacements: [
                    { word: "优秀", score: 0.95, context: "general" },
                    { word: "出色", score: 0.93, context: "achievement" },
                    { word: "卓越", score: 0.92, context: "quality" },
                    { word: "杰出", score: 0.90, context: "general" },
                    { word: "非凡", score: 0.88, context: "impressive" },
                    { word: "优异", score: 0.85, context: "formal" },
                    { word: "绝佳", score: 0.83, context: "quality" }
                ],
                explanation: "描述品质或表现出色"
            },
            "坏": {
                replacements: [
                    { word: "恶劣", score: 0.95, context: "quality" },
                    { word: "糟糕", score: 0.93, context: "negative" },
                    { word: "低劣", score: 0.91, context: "quality" },
                    { word: "差劲", score: 0.89, context: "informal" },
                    { word: "不堪", score: 0.87, context: "extreme" },
                    { word: "恶劣", score: 0.85, context: "shocking" }
                ],
                explanation: "描述品质或表现不佳"
            },
            "很好": {
                replacements: [
                    { word: "非常优秀", score: 0.95, context: "general" },
                    { word: "极其出色", score: 0.93, context: "achievement" },
                    { word: "格外卓越", score: 0.91, context: "quality" },
                    { word: "相当杰出", score: 0.89, context: "general" },
                    { word: "尤为出色", score: 0.87, context: "impressive" }
                ],
                explanation: "强调品质或表现出色"
            },
            "很坏": {
                replacements: [
                    { word: "极其恶劣", score: 0.95, context: "quality" },
                    { word: "非常糟糕", score: 0.93, context: "negative" },
                    { word: "相当低劣", score: 0.91, context: "quality" },
                    { word: "极为差劲", score: 0.89, context: "informal" }
                ],
                explanation: "强调品质或表现不佳"
            },
            "美丽": {
                replacements: [
                    { word: "绚丽", score: 0.95, context: "visual" },
                    { word: "瑰丽", score: 0.93, context: "awe" },
                    { word: "精致", score: 0.91, context: "detail" },
                    { word: "华美", score: 0.89, context: "general" },
                    { word: "璀璨", score: 0.87, context: "brilliant" },
                    { word: "秀美", score: 0.85, context: "elegant" }
                ],
                explanation: "描述视觉上吸引人的"
            },
            "大": {
                replacements: [
                    { word: "巨大", score: 0.95, context: "size" },
                    { word: "庞大", score: 0.93, context: "extreme" },
                    { word: "宏大", score: 0.91, context: "scale" },
                    { word: "硕大", score: 0.89, context: "size" },
                    { word: "壮阔", score: 0.87, context: "impressive" }
                ],
                explanation: "描述尺寸或数量大"
            },
            "小": {
                replacements: [
                    { word: "微小", score: 0.95, context: "size" },
                    { word: "细微", score: 0.93, context: "detail" },
                    { word: "渺小", score: 0.91, context: "insignificant" },
                    { word: "小巧", score: 0.89, context: "cute" },
                    { word: "迷你", score: 0.87, context: "cute" }
                ],
                explanation: "描述尺寸或数量小"
            },
            "快": {
                replacements: [
                    { word: "迅速", score: 0.95, context: "speed" },
                    { word: "飞快", score: 0.93, context: "extreme" },
                    { word: "迅捷", score: 0.91, context: "efficient" },
                    { word: "飞速", score: 0.89, context: "extreme" },
                    { word: "急速", score: 0.87, context: "urgent" }
                ],
                explanation: "描述速度快"
            },
            "慢": {
                replacements: [
                    { word: "缓慢", score: 0.95, context: "speed" },
                    { word: "迟缓", score: 0.93, context: "sluggish" },
                    { word: "慢悠悠", score: 0.91, context: "relaxed" },
                    { word: "徐徐", score: 0.89, context: "gradual" }
                ],
                explanation: "描述速度慢"
            },
            "重要": {
                replacements: [
                    { word: "至关重要", score: 0.95, context: "critical" },
                    { word: "举足轻重", score: 0.93, context: "influence" },
                    { word: "不可或缺", score: 0.91, context: "essential" },
                    { word: "意义重大", score: 0.89, context: "importance" },
                    { word: "核心", score: 0.87, context: "central" }
                ],
                explanation: "描述具有重大意义或价值"
            },
            "开心": {
                replacements: [
                    { word: "欣喜", score: 0.95, context: "joy" },
                    { word: "愉悦", score: 0.93, context: "pleasure" },
                    { word: "欢欣", score: 0.91, context: "excitement" },
                    { word: "雀跃", score: 0.89, context: "extreme" },
                    { word: "欢欣鼓舞", score: 0.87, context: "enthusiastic" }
                ],
                explanation: "描述愉悦或满足的情绪"
            },
            "难过": {
                replacements: [
                    { word: "悲伤", score: 0.95, context: "grief" },
                    { word: "忧伤", score: 0.93, context: "poetic" },
                    { word: "痛苦", score: 0.91, context: "extreme" },
                    { word: "心碎", score: 0.89, context: "emotional pain" },
                    { word: "沮丧", score: 0.87, context: "disappointment" }
                ],
                explanation: "描述悲伤或沮丧的情绪"
            },
            "有趣": {
                replacements: [
                    { word: "引人入胜", score: 0.95, context: "captivating" },
                    { word: "妙趣横生", score: 0.93, context: "engaging" },
                    { word: "耐人寻味", score: 0.91, context: "mysterious" },
                    { word: "扣人心弦", score: 0.89, context: "attention" },
                    { word: "趣味盎然", score: 0.87, context: "lively" }
                ],
                explanation: "描述引起兴趣或好奇心"
            },
            "困难": {
                replacements: [
                    { word: "艰难", score: 0.95, context: "effort" },
                    { word: "艰巨", score: 0.93, context: "strenuous" },
                    { word: "棘手", score: 0.91, context: "problematic" },
                    { word: "繁杂", score: 0.89, context: "complex" },
                    { word: "艰辛", score: 0.87, context: "hardship" }
                ],
                explanation: "描述需要努力或技能"
            },
            "简单": {
                replacements: [
                    { word: "简易", score: 0.95, context: "simple" },
                    { word: "轻松", score: 0.93, context: "easy" },
                    { word: "简洁", score: 0.91, context: "clear" },
                    { word: "轻而易举", score: 0.89, context: "no difficulty" },
                    { word: "易如反掌", score: 0.87, context: "extremely easy" }
                ],
                explanation: "描述不费力"
            },
            "善良": {
                replacements: [
                    { word: "仁慈", score: 0.95, context: "sympathy" },
                    { word: "仁慈", score: 0.93, context: "generous" },
                    { word: "慈悲", score: 0.91, context: "compassion" },
                    { word: "仁厚", score: 0.89, context: "kind" },
                    { word: "友善", score: 0.87, context: "friendly" }
                ],
                explanation: "描述关心他人福祉"
            }
        },
        adverbs: {
            "很": {
                replacements: [
                    { word: "非常", score: 0.95, context: "degree" },
                    { word: "极其", score: 0.93, context: "extreme" },
                    { word: "格外", score: 0.91, context: "notable" },
                    { word: "尤为", score: 0.89, context: "degree" },
                    { word: "分外", score: 0.87, context: "amazing" }
                ],
                explanation: "加强形容词或副词的程度"
            },
            "非常": {
                replacements: [
                    { word: "极其", score: 0.95, context: "extreme" },
                    { word: "格外", score: 0.93, context: "notable" },
                    { word: "尤为", score: 0.91, context: "degree" },
                    { word: "分外", score: 0.89, context: "amazing" },
                    { word: "异常", score: 0.87, context: "unusual" }
                ],
                explanation: "表示程度高"
            },
            "真的": {
                replacements: [
                    { word: "确实", score: 0.95, context: "fact" },
                    { word: "的确", score: 0.93, context: "emphasis" },
                    { word: "实在", score: 0.91, context: "truth" },
                    { word: "真正", score: 0.89, context: "authentic" }
                ],
                explanation: "表示真实性或强调"
            }
        },
        verbs: {
            "去": {
                replacements: [
                    { word: "前往", score: 0.95, context: "formal" },
                    { word: "行进", score: 0.93, context: "progress" },
                    { word: "奔赴", score: 0.91, context: "urgent" },
                    { word: "造访", score: 0.89, context: "visit" }
                ],
                explanation: "移动或前往某地"
            },
            "得到": {
                replacements: [
                    { word: "获得", score: 0.95, context: "obtain" },
                    { word: "取得", score: 0.93, context: "achieve" },
                    { word: "赢得", score: 0.91, context: "earn" },
                    { word: "获取", score: 0.89, context: "general" }
                ],
                explanation: "获得或取得"
            },
            "做": {
                replacements: [
                    { word: "开展", score: 0.95, context: "formal" },
                    { word: "进行", score: 0.93, context: "execute" },
                    { word: "实施", score: 0.91, context: "implement" },
                    { word: "推进", score: 0.89, context: "progress" }
                ],
                explanation: "执行或完成行动"
            },
            "说": {
                replacements: [
                    { word: "表示", score: 0.95, context: "general" },
                    { word: "指出", score: 0.93, context: "point out" },
                    { word: "阐述", score: 0.91, context: "explain" },
                    { word: "声明", score: 0.89, context: "formal" }
                ],
                explanation: "用言语表达"
            },
            "想": {
                replacements: [
                    { word: "考虑", score: 0.95, context: "think" },
                    { word: "思索", score: 0.93, context: "deep" },
                    { word: "思考", score: 0.91, context: "general" },
                    { word: "琢磨", score: 0.89, context: "informal" }
                ],
                explanation: "思考或有意见"
            },
            "喜欢": {
                replacements: [
                    { word: "喜爱", score: 0.95, context: "general" },
                    { word: "钟爱", score: 0.93, context: "deep" },
                    { word: "欣赏", score: 0.91, context: "appreciate" },
                    { word: "偏爱", score: 0.89, context: "prefer" }
                ],
                explanation: "对某事物有好感"
            },
            "想要": {
                replacements: [
                    { word: "渴望", score: 0.95, context: "strong" },
                    { word: "期望", score: 0.93, context: "hope" },
                    { word: "向往", score: 0.91, context: "ambition" },
                    { word: "希冀", score: 0.89, context: "formal" }
                ],
                explanation: "渴望或需要"
            }
        }
    },
    ko: {
        adjectives: {
            "좋다": {
                replacements: [
                    { word: "훌륭하다", score: 0.95, context: "general" },
                    { word: "뛰어나다", score: 0.93, context: "achievement" },
                    { word: "우수하다", score: 0.92, context: "quality" },
                    { word: "출중하다", score: 0.90, context: "outstanding" },
                    { word: "특출하다", score: 0.88, context: "exceptional" }
                ],
                explanation: "품질이나 성능이 우수함"
            },
            "나쁘다": {
                replacements: [
                    { word: "열등하다", score: 0.95, context: "quality" },
                    { word: "끔찍하다", score: 0.93, context: "negative" },
                    { word: "비열하다", score: 0.91, context: "mean" },
                    { word: "최악이다", score: 0.89, context: "worst" }
                ],
                explanation: "품질이나 성능이 좋지 않음"
            },
            "매우 좋다": {
                replacements: [
                    { word: "아주 훌륭하다", score: 0.95, context: "general" },
                    { word: "매우 뛰어나다", score: 0.93, context: "achievement" },
                    { word: "극히 우수하다", score: 0.91, context: "quality" },
                    { word: "대단히 출중하다", score: 0.89, context: "outstanding" }
                ],
                explanation: "품질이나 성능이 매우 우수함"
            },
            "아름답다": {
                replacements: [
                    { word: "아름답다", score: 0.95, context: "visual" },
                    { word: "화려하다", score: 0.93, context: "splendid" },
                    { word: "정교하다", score: 0.91, context: "detail" },
                    { word: "찬란하다", score: 0.89, context: "brilliant" }
                ],
                explanation: "시각적으로 매력적임"
            },
            "크다": {
                replacements: [
                    { word: "거대하다", score: 0.95, context: "size" },
                    { word: "광대하다", score: 0.93, context: "vast" },
                    { word: "장대하다", score: 0.91, context: "scale" },
                    { word: "웅장하다", score: 0.89, context: "impressive" }
                ],
                explanation: "크기가 큼"
            },
            "작다": {
                replacements: [
                    { word: "미세하다", score: 0.95, context: "tiny" },
                    { word: "조그마하다", score: 0.93, context: "small" },
                    { word: "보잘것없다", score: 0.91, context: "insignificant" },
                    { word: "초소하다", score: 0.89, context: "mini" }
                ],
                explanation: "크기가 작음"
            },
            "빠르다": {
                replacements: [
                    { word: "신속하다", score: 0.95, context: "speed" },
                    { word: "민첩하다", score: 0.93, context: "agile" },
                    { word: "비상하다", score: 0.91, context: "extreme" },
                    { word: "급속하다", score: 0.89, context: "rapid" }
                ],
                explanation: "속도가 빠름"
            },
            "느리다": {
                replacements: [
                    { word: "느릿느릿하다", score: 0.95, context: "speed" },
                    { word: "지체하다", score: 0.93, context: "delayed" },
                    { word: "태만하다", score: 0.91, context: "sluggish" },
                    { word: "완만하다", score: 0.89, context: "gradual" }
                ],
                explanation: "속도가 느림"
            },
            "중요하다": {
                replacements: [
                    { word: "매우 중요하다", score: 0.95, context: "critical" },
                    { word: "핵심적이다", score: 0.93, context: "central" },
                    { word: "결정적이다", score: 0.91, context: "crucial" },
                    { word: "필수적이다", score: 0.89, context: "essential" }
                ],
                explanation: "중요함"
            },
            "기쁘다": {
                replacements: [
                    { word: "희희낙락하다", score: 0.95, context: "joy" },
                    { word: "기쁨이 넘치다", score: 0.93, context: "overflowing" },
                    { word: "희열하다", score: 0.91, context: "ecstasy" },
                    { word: "만족하다", score: 0.89, context: "satisfied" }
                ],
                explanation: "기쁨이나 만족감"
            },
            "슬프다": {
                replacements: [
                    { word: "슬퍼하다", score: 0.95, context: "grief" },
                    { word: "비통하다", score: 0.93, context: "extreme" },
                    { word: "애달프다", score: 0.91, context: "melancholy" },
                    { word: "섭섭하다", score: 0.89, context: "disappointed" }
                ],
                explanation: "슬픔이나 실망감"
            },
            "재미있다": {
                replacements: [
                    { word: "흥미진진하다", score: 0.95, context: "captivating" },
                    { word: "매혹적이다", score: 0.93, context: "fascinating" },
                    { word: "흥미롭다", score: 0.91, context: "interesting" },
                    { word: "매력적이다", score: 0.89, context: "charming" }
                ],
                explanation: "흥미롭거나 매력적임"
            },
            "어렵다": {
                replacements: [
                    { word: "난해하다", score: 0.95, context: "difficult" },
                    { word: "가혹하다", score: 0.93, context: "harsh" },
                    { word: "힘들다", score: 0.91, context: "tough" },
                    { word: "복잡하다", score: 0.89, context: "complex" }
                ],
                explanation: "어렵거나 힘듦"
            },
            "쉽다": {
                replacements: [
                    { word: "간단하다", score: 0.95, context: "simple" },
                    { word: "수월하다", score: 0.93, context: "easy" },
                    { word: "쉬운", score: 0.91, context: "general" },
                    { word: "손쉽다", score: 0.89, context: "effortless" }
                ],
                explanation: "쉽거나 간단함"
            },
            "착하다": {
                replacements: [
                    { word: "인자하다", score: 0.95, context: "kind" },
                    { word: "선량하다", score: 0.93, context: "good" },
                    { word: "자비롭다", score: 0.91, context: "compassionate" },
                    { word: "다정하다", score: 0.89, context: "affectionate" }
                ],
                explanation: "착하거나 친절함"
            }
        },
        adverbs: {
            "매우": {
                replacements: [
                    { word: "아주", score: 0.95, context: "degree" },
                    { word: "극히", score: 0.93, context: "extreme" },
                    { word: "대단히", score: 0.91, context: "greatly" },
                    { word: "몹시", score: 0.89, context: "very" },
                    { word: "지극히", score: 0.87, context: "extremely" }
                ],
                explanation: "정도를 강조함"
            },
            "정말": {
                replacements: [
                    { word: "참", score: 0.95, context: "truly" },
                    { word: "정말로", score: 0.93, context: "really" },
                    { word: "진정", score: 0.91, context: "genuinely" },
                    { word: "과연", score: 0.89, context: "indeed" }
                ],
                explanation: "진실이나 강조"
            }
        },
        verbs: {
            "가다": {
                replacements: [
                    { word: "나아가다", score: 0.95, context: "progress" },
                    { word: "향하다", score: 0.93, context: "toward" },
                    { word: "찾아가다", score: 0.91, context: "visit" },
                    { word: "진출하다", score: 0.89, context: "advance" }
                ],
                explanation: "이동하거나 가다"
            },
            "얻다": {
                replacements: [
                    { word: "획득하다", score: 0.95, context: "obtain" },
                    { word: "취득하다", score: 0.93, context: "acquire" },
                    { word: "얻어내다", score: 0.91, context: "get" },
                    { word: "확보하다", score: 0.89, context: "secure" }
                ],
                explanation: "얻거나 취득하다"
            },
            "하다": {
                replacements: [
                    { word: "실시하다", score: 0.95, context: "execute" },
                    { word: "수행하다", score: 0.93, context: "perform" },
                    { word: "진행하다", score: 0.91, context: "progress" },
                    { word: "추진하다", score: 0.89, context: "promote" }
                ],
                explanation: "실행하거나 수행하다"
            },
            "말하다": {
                replacements: [
                    { word: "언급하다", score: 0.95, context: "mention" },
                    { word: "표현하다", score: 0.93, context: "express" },
                    { word: "진술하다", score: 0.91, context: "state" },
                    { word: "고하다", score: 0.89, context: "declare" }
                ],
                explanation: "말로 표현하다"
            },
            "생각하다": {
                replacements: [
                    { word: "고민하다", score: 0.95, context: "think" },
                    { word: "사고하다", score: 0.93, context: "think deeply" },
                    { word: "숙고하다", score: 0.91, context: "contemplate" },
                    { word: "연구하다", score: 0.89, context: "study" }
                ],
                explanation: "생각하거나 고민하다"
            },
            "좋아하다": {
                replacements: [
                    { word: "애호하다", score: 0.95, context: "love" },
                    { word: "선호하다", score: 0.93, context: "prefer" },
                    { word: "감상하다", score: 0.91, context: "appreciate" },
                    { word: "즐기다", score: 0.89, context: "enjoy" }
                ],
                explanation: "좋아하거나 즐기다"
            },
            "원하다": {
                replacements: [
                    { word: "희망하다", score: 0.95, context: "hope" },
                    { word: "갈망하다", score: 0.93, context: "desire" },
                    { word: "열망하다", score: 0.91, context: "aspire" },
                    { word: "기대하다", score: 0.89, context: "expect" }
                ],
                explanation: "원하거나 기대하다"
            }
        }
    },
    ja: {
        adjectives: {
            "良い": {
                replacements: [
                    { word: "素晴らしい", score: 0.95, context: "general" },
                    { word: "優れている", score: 0.93, context: "achievement" },
                    { word: "秀逸", score: 0.92, context: "quality" },
                    { word: "傑出", score: 0.90, context: "outstanding" },
                    { word: "卓越", score: 0.88, context: "exceptional" }
                ],
                explanation: "品質や性能が優れている"
            },
            "悪い": {
                replacements: [
                    { word: "劣悪", score: 0.95, context: "quality" },
                    { word: "ひどい", score: 0.93, context: "negative" },
                    { word: "最低", score: 0.91, context: "worst" },
                    { word: "粗悪", score: 0.89, context: "inferior" }
                ],
                explanation: "品質や性能が良くない"
            },
            "とても良い": {
                replacements: [
                    { word: "非常に素晴らしい", score: 0.95, context: "general" },
                    { word: "極めて優れている", score: 0.93, context: "achievement" },
                    { word: "非常に秀逸", score: 0.91, context: "quality" },
                    { word: "極めて傑出", score: 0.89, context: "outstanding" }
                ],
                explanation: "品質や性能が非常に優れている"
            },
            "美しい": {
                replacements: [
                    { word: "絢爛", score: 0.95, context: "visual" },
                    { word: "壮麗", score: 0.93, context: "splendid" },
                    { word: "精美", score: 0.91, context: "detail" },
                    { word: "燦然", score: 0.89, context: "brilliant" }
                ],
                explanation: "視覚的に魅力的"
            },
            "大きい": {
                replacements: [
                    { word: "巨大", score: 0.95, context: "size" },
                    { word: "膨大", score: 0.93, context: "vast" },
                    { word: "雄大", score: 0.91, context: "scale" },
                    { word: "壮観", score: 0.89, context: "impressive" }
                ],
                explanation: "サイズが大きい"
            },
            "小さい": {
                replacements: [
                    { word: "微細", score: 0.95, context: "tiny" },
                    { word: "微小", score: 0.93, context: "small" },
                    { word: "些細", score: 0.91, context: "insignificant" },
                    { word: "短小", score: 0.89, context: "mini" }
                ],
                explanation: "サイズが小さい"
            },
            "速い": {
                replacements: [
                    { word: "迅速", score: 0.95, context: "speed" },
                    { word: "敏速", score: 0.93, context: "agile" },
                    { word: "疾走", score: 0.91, context: "extreme" },
                    { word: "急速", score: 0.89, context: "rapid" }
                ],
                explanation: "スピードが速い"
            },
            "遅い": {
                replacements: [
                    { word: "緩慢", score: 0.95, context: "speed" },
                    { word: "遅滞", score: 0.93, context: "delayed" },
                    { word: "悠長", score: 0.91, context: "relaxed" },
                    { word: "緩やか", score: 0.89, context: "gradual" }
                ],
                explanation: "スピードが遅い"
            },
            "重要": {
                replacements: [
                    { word: "極めて重要", score: 0.95, context: "critical" },
                    { word: "決定的", score: 0.93, context: "crucial" },
                    { word: "核心的", score: 0.91, context: "central" },
                    { word: "不可欠", score: 0.89, context: "essential" }
                ],
                explanation: "重要である"
            },
            "嬉しい": {
                replacements: [
                    { word: "喜ばしい", score: 0.95, context: "joy" },
                    { word: "歓喜", score: 0.93, context: "extreme" },
                    { word: "満足", score: 0.91, context: "satisfied" },
                    { word: "愉快", score: 0.89, context: "pleasant" }
                ],
                explanation: "喜びや満足感"
            },
            "悲しい": {
                replacements: [
                    { word: "悲嘆", score: 0.95, context: "grief" },
                    { word: "憂鬱", score: 0.93, context: "melancholy" },
                    { word: "切ない", score: 0.91, context: "sad" },
                    { word: "失意", score: 0.89, context: "disappointed" }
                ],
                explanation: "悲しみや失望感"
            },
            "面白い": {
                replacements: [
                    { word: "興味深い", score: 0.95, context: "captivating" },
                    { word: "魅惑的", score: 0.93, context: "fascinating" },
                    { word: "魅力的", score: 0.91, context: "charming" },
                    { word: "愉快", score: 0.89, context: "enjoyable" }
                ],
                explanation: "興味深いまたは魅力的"
            },
            "難しい": {
                replacements: [
                    { word: "困難", score: 0.95, context: "difficult" },
                    { word: "難解", score: 0.93, context: "hard to understand" },
                    { word: "煩雑", score: 0.91, context: "complex" },
                    { word: "苛酷", score: 0.89, context: "harsh" }
                ],
                explanation: "難しいまたは複雑"
            },
            "簡単": {
                replacements: [
                    { word: "容易", score: 0.95, context: "easy" },
                    { word: "平易", score: 0.93, context: "simple" },
                    { word: "簡便", score: 0.91, context: "convenient" },
                    { word: "手軽", score: 0.89, context: "effortless" }
                ],
                explanation: "簡単または容易"
            },
            "優しい": {
                replacements: [
                    { word: "慈悲深い", score: 0.95, context: "compassionate" },
                    { word: "善良", score: 0.93, context: "good" },
                    { word: "懇切", score: 0.91, context: "kind" },
                    { word: "愛情深い", score: 0.89, context: "affectionate" }
                ],
                explanation: "優しいまたは親切"
            }
        },
        adverbs: {
            "非常に": {
                replacements: [
                    { word: "極めて", score: 0.95, context: "extreme" },
                    { word: "大変", score: 0.93, context: "degree" },
                    { word: "極端に", score: 0.91, context: "extreme" },
                    { word: "甚だ", score: 0.89, context: "very" }
                ],
                explanation: "程度を強調"
            },
            "本当に": {
                replacements: [
                    { word: "実に", score: 0.95, context: "truly" },
                    { word: "全く", score: 0.93, context: "completely" },
                    { word: "誠に", score: 0.91, context: "sincerely" },
                    { word: "本当に", score: 0.89, context: "really" }
                ],
                explanation: "真実または強調"
            }
        },
        verbs: {
            "行く": {
                replacements: [
                    { word: "赴く", score: 0.95, context: "go to" },
                    { word: "進む", score: 0.93, context: "progress" },
                    { word: "訪れる", score: 0.91, context: "visit" },
                    { word: "向かう", score: 0.89, context: "toward" }
                ],
                explanation: "移動または行く"
            },
            "得る": {
                replacements: [
                    { word: "獲得", score: 0.95, context: "obtain" },
                    { word: "取得", score: 0.93, context: "acquire" },
                    { word: "入手", score: 0.91, context: "get" },
                    { word: "確保", score: 0.89, context: "secure" }
                ],
                explanation: "得るまたは取得"
            },
            "する": {
                replacements: [
                    { word: "実施", score: 0.95, context: "execute" },
                    { word: "遂行", score: 0.93, context: "perform" },
                    { word: "実行", score: 0.91, context: "implement" },
                    { word: "推進", score: 0.89, context: "promote" }
                ],
                explanation: "実行または遂行"
            },
            "言う": {
                replacements: [
                    { word: "述べる", score: 0.95, context: "state" },
                    { word: "表現", score: 0.93, context: "express" },
                    { word: "伝える", score: 0.91, context: "convey" },
                    { word: "宣告", score: 0.89, context: "declare" }
                ],
                explanation: "言葉で表現"
            },
            "思う": {
                replacements: [
                    { word: "考える", score: 0.95, context: "think" },
                    { word: "熟考", score: 0.93, context: "deep thought" },
                    { word: "思索", score: 0.91, context: "muse" },
                    { word: "考察", score: 0.89, context: "consider" }
                ],
                explanation: "考えるまたは思う"
            },
            "好き": {
                replacements: [
                    { word: "愛好", score: 0.95, context: "love" },
                    { word: "嗜好", score: 0.93, context: "preference" },
                    { word: "傾倒", score: 0.91, context: "admire" },
                    { word: "楽しむ", score: 0.89, context: "enjoy" }
                ],
                explanation: "好きまたは楽しむ"
            },
            "欲しい": {
                replacements: [
                    { word: "渇望", score: 0.95, context: "desire" },
                    { word: "希求", score: 0.93, context: "hope" },
                    { word: "憧憬", score: 0.91, context: "aspire" },
                    { word: "期待", score: 0.89, context: "expect" }
                ],
                explanation: "欲しいまたは望む"
            }
        }
    },
    de: {
        adjectives: {
            "gut": {
                replacements: [
                    { word: "ausgezeichnet", score: 0.95, context: "general" },
                    { word: "herausragend", score: 0.93, context: "achievement" },
                    { word: "exzellent", score: 0.92, context: "quality" },
                    { word: "hervorragend", score: 0.90, context: "outstanding" },
                    { word: "bemerkenswert", score: 0.88, context: "notable" }
                ],
                explanation: "von guter Qualität oder Leistung"
            },
            "schlecht": {
                replacements: [
                    { word: "schlecht", score: 0.95, context: "quality" },
                    { word: "minderwertig", score: 0.93, context: "inferior" },
                    { word: "schrecklich", score: 0.91, context: "negative" },
                    { word: "unterdurchschnittlich", score: 0.89, context: "below average" }
                ],
                explanation: "von schlechter Qualität"
            },
            "sehr gut": {
                replacements: [
                    { word: "äußerst gut", score: 0.95, context: "general" },
                    { word: "herausragend gut", score: 0.93, context: "achievement" },
                    { word: "exzellent", score: 0.91, context: "quality" },
                    { word: "außergewöhnlich gut", score: 0.89, context: "exceptional" }
                ],
                explanation: "von sehr guter Qualität"
            },
            "schön": {
                replacements: [
                    { word: "wunderschön", score: 0.95, context: "visual" },
                    { word: "herrlich", score: 0.93, context: "splendid" },
                    { word: "prächtig", score: 0.91, context: "magnificent" },
                    { word: "exquisit", score: 0.89, context: "detail" }
                ],
                explanation: "visuell ansprechend"
            },
            "groß": {
                replacements: [
                    { word: "riesig", score: 0.95, context: "size" },
                    { word: "enorm", score: 0.93, context: "extreme" },
                    { word: "gewaltig", score: 0.91, context: "massive" },
                    { word: "imposant", score: 0.89, context: "impressive" }
                ],
                explanation: "von großer Größe"
            },
            "klein": {
                replacements: [
                    { word: "winzig", score: 0.95, context: "tiny" },
                    { word: "geringfügig", score: 0.93, context: "insignificant" },
                    { word: "minimal", score: 0.91, context: "minimal" },
                    { word: "sparsam", score: 0.89, context: "scanty" }
                ],
                explanation: "von kleiner Größe"
            },
            "schnell": {
                replacements: [
                    { word: "rasch", score: 0.95, context: "speed" },
                    { word: "flink", score: 0.93, context: "agile" },
                    { word: "blitzschnell", score: 0.91, context: "extreme" },
                    { word: "zügig", score: 0.89, context: "brisk" }
                ],
                explanation: "von hoher Geschwindigkeit"
            },
            "langsam": {
                replacements: [
                    { word: "langsam", score: 0.95, context: "speed" },
                    { word: "träge", score: 0.93, context: "sluggish" },
                    { word: "gemächlich", score: 0.91, context: "leisurely" },
                    { word: "stockend", score: 0.89, context: "stagnant" }
                ],
                explanation: "von geringer Geschwindigkeit"
            },
            "wichtig": {
                replacements: [
                    { word: "entscheidend", score: 0.95, context: "critical" },
                    { word: "bedeutend", score: 0.93, context: "significant" },
                    { word: "wesentlich", score: 0.91, context: "essential" },
                    { word: "zentral", score: 0.89, context: "central" }
                ],
                explanation: "von großer Bedeutung"
            },
            "glücklich": {
                replacements: [
                    { word: "froh", score: 0.95, context: "joy" },
                    { word: "entzückt", score: 0.93, context: "delighted" },
                    { word: "beglückt", score: 0.91, context: "happy" },
                    { word: "frohsinnig", score: 0.89, context: "cheerful" }
                ],
                explanation: "von Glück erfüllt"
            },
            "traurig": {
                replacements: [
                    { word: "traurig", score: 0.95, context: "sad" },
                    { word: "bedrückend", score: 0.93, context: "depressing" },
                    { word: "betrübt", score: 0.91, context: "melancholy" },
                    { word: "niedergeschlagen", score: 0.89, context: "dejected" }
                ],
                explanation: "von Trauer erfüllt"
            },
            "interessant": {
                replacements: [
                    { word: "faszinierend", score: 0.95, context: "captivating" },
                    { word: "fesselnd", score: 0.93, context: "gripping" },
                    { word: "reizvoll", score: 0.91, context: "charming" },
                    { word: "spannend", score: 0.89, context: "exciting" }
                ],
                explanation: "interessant oder fesselnd"
            },
            "schwierig": {
                replacements: [
                    { word: "schwierig", score: 0.95, context: "difficult" },
                    { word: "komplex", score: 0.93, context: "complex" },
                    { word: "herausfordernd", score: 0.91, context: "challenging" },
                    { word: "mühsam", score: 0.89, context: "laborious" }
                ],
                explanation: "schwierig oder komplex"
            },
            "einfach": {
                replacements: [
                    { word: "einfach", score: 0.95, context: "simple" },
                    { word: "unkompliziert", score: 0.93, context: "uncomplicated" },
                    { word: "leicht", score: 0.91, context: "easy" },
                    { word: "mühelos", score: 0.89, context: "effortless" }
                ],
                explanation: "einfach oder unkompliziert"
            },
            "freundlich": {
                replacements: [
                    { word: "freundlich", score: 0.95, context: "kind" },
                    { word: "gütig", score: 0.93, context: "good" },
                    { word: "barmherzig", score: 0.91, context: "compassionate" },
                    { word: "herzlich", score: 0.89, context: "warm" }
                ],
                explanation: "freundlich oder gütig"
            }
        },
        adverbs: {
            "sehr": {
                replacements: [
                    { word: "äußerst", score: 0.95, context: "extreme" },
                    { word: "außerordentlich", score: 0.93, context: "extraordinary" },
                    { word: "hervorragend", score: 0.91, context: "excellent" },
                    { word: "außergewöhnlich", score: 0.89, context: "unusual" },
                    { word: "besonders", score: 0.87, context: "especially" }
                ],
                explanation: "betont den Grad"
            },
            "wirklich": {
                replacements: [
                    { word: "tatsächlich", score: 0.95, context: "actually" },
                    { word: "wahrhaft", score: 0.93, context: "truly" },
                    { word: "wirklich", score: 0.91, context: "really" },
                    { word: "in der Tat", score: 0.89, context: "indeed" }
                ],
                explanation: "betont die Wahrheit"
            }
        },
        verbs: {
            "gehen": {
                replacements: [
                    { word: "gehen", score: 0.95, context: "go" },
                    { word: "reisen", score: 0.93, context: "travel" },
                    { word: "fortbewegen", score: 0.91, context: "move" },
                    { word: "aufbrechen", score: 0.89, context: "depart" }
                ],
                explanation: "sich bewegen oder gehen"
            },
            "bekommen": {
                replacements: [
                    { word: "erhalten", score: 0.95, context: "receive" },
                    { word: "erwerben", score: 0.93, context: "acquire" },
                    { word: "ergattern", score: 0.91, context: "obtain" },
                    { word: "sichern", score: 0.89, context: "secure" }
                ],
                explanation: "erhalten oder bekommen"
            },
            "machen": {
                replacements: [
                    { word: "machen", score: 0.95, context: "make" },
                    { word: "durchführen", score: 0.93, context: "perform" },
                    { word: "ausführen", score: 0.91, context: "execute" },
                    { word: "vornehmen", score: 0.89, context: "undertake" }
                ],
                explanation: "tun oder machen"
            },
            "sagen": {
                replacements: [
                    { word: "sagen", score: 0.95, context: "say" },
                    { word: "ausdrücken", score: 0.93, context: "express" },
                    { word: "erklären", score: 0.91, context: "explain" },
                    { word: "mitteilen", score: 0.89, context: "inform" }
                ],
                explanation: "sprechen oder sagen"
            },
            "denken": {
                replacements: [
                    { word: "denken", score: 0.95, context: "think" },
                    { word: "überlegen", score: 0.93, context: "consider" },
                    { word: "nachdenken", score: 0.91, context: "contemplate" },
                    { word: "sinngemäß", score: 0.89, context: "muse" }
                ],
                explanation: "nachdenken oder denken"
            },
            "mögen": {
                replacements: [
                    { word: "mögen", score: 0.95, context: "like" },
                    { word: "lieben", score: 0.93, context: "love" },
                    { word: "vorziehen", score: 0.91, context: "prefer" },
                    { word: "schätzen", score: 0.89, context: "appreciate" }
                ],
                explanation: "mögen oder lieben"
            },
            "wollen": {
                replacements: [
                    { word: "wollen", score: 0.95, context: "want" },
                    { word: "begehren", score: 0.93, context: "desire" },
                    { word: "streben", score: 0.91, context: "strive" },
                    { word: "wünschen", score: 0.89, context: "wish" }
                ],
                explanation: "wollen oder wünschen"
            }
        }
    },
    fr: {
        adjectives: {
            "bon": {
                replacements: [
                    { word: "excellent", score: 0.95, context: "general" },
                    { word: "remarquable", score: 0.93, context: "achievement" },
                    { word: "exceptionnel", score: 0.92, context: "quality" },
                    { word: "superbe", score: 0.90, context: "general" },
                    { word: "éminent", score: 0.88, context: "outstanding" }
                ],
                explanation: "de bonne qualité ou performance"
            },
            "mauvais": {
                replacements: [
                    { word: "mauvais", score: 0.95, context: "quality" },
                    { word: "inférieur", score: 0.93, context: "inferior" },
                    { word: "affreux", score: 0.91, context: "horrible" },
                    { word: "médiocre", score: 0.89, context: "average" }
                ],
                explanation: "de mauvaise qualité"
            },
            "très bon": {
                replacements: [
                    { word: "excellent", score: 0.95, context: "general" },
                    { word: "remarquable", score: 0.93, context: "achievement" },
                    { word: "exceptionnel", score: 0.91, context: "quality" },
                    { word: "remarquablement bon", score: 0.89, context: "exceptional" }
                ],
                explanation: "de très bonne qualité"
            },
            "beau": {
                replacements: [
                    { word: "beau", score: 0.95, context: "visual" },
                    { word: "splendide", score: 0.93, context: "splendid" },
                    { word: "magnifique", score: 0.91, context: "magnificent" },
                    { word: "exquis", score: 0.89, context: "detail" }
                ],
                explanation: "visuellement attrayant"
            },
            "grand": {
                replacements: [
                    { word: "grand", score: 0.95, context: "size" },
                    { word: "énorme", score: 0.93, context: "extreme" },
                    { word: "gigantesque", score: 0.91, context: "gigantic" },
                    { word: "imposant", score: 0.89, context: "impressive" }
                ],
                explanation: "de grande taille"
            },
            "petit": {
                replacements: [
                    { word: "petit", score: 0.95, context: "small" },
                    { word: "minuscule", score: 0.93, context: "tiny" },
                    { word: "insignifiant", score: 0.91, context: "insignificant" },
                    { word: "modeste", score: 0.89, context: "modest" }
                ],
                explanation: "de petite taille"
            },
            "rapide": {
                replacements: [
                    { word: "rapide", score: 0.95, context: "speed" },
                    { word: "vite", score: 0.93, context: "fast" },
                    { word: "éclair", score: 0.91, context: "lightning" },
                    { word: "prompt", score: 0.89, context: "prompt" }
                ],
                explanation: "de grande vitesse"
            },
            "lent": {
                replacements: [
                    { word: "lent", score: 0.95, context: "speed" },
                    { word: "paresseux", score: 0.93, context: "sluggish" },
                    { word: "lentement", score: 0.91, context: "slowly" },
                    { word: "tardif", score: 0.89, context: "late" }
                ],
                explanation: "de faible vitesse"
            },
            "important": {
                replacements: [
                    { word: "important", score: 0.95, context: "general" },
                    { word: "crucial", score: 0.93, context: "critical" },
                    { word: "essentiel", score: 0.91, context: "essential" },
                    { word: "vital", score: 0.89, context: "vital" }
                ],
                explanation: "de grande importance"
            },
            "heureux": {
                replacements: [
                    { word: "heureux", score: 0.95, context: "happy" },
                    { word: "ravi", score: 0.93, context: "delighted" },
                    { word: "enchanté", score: 0.91, context: "charmed" },
                    { word: "joyeux", score: 0.89, context: "joyful" }
                ],
                explanation: "de bonne humeur"
            },
            "triste": {
                replacements: [
                    { word: "triste", score: 0.95, context: "sad" },
                    { word: "malheureux", score: 0.93, context: "unhappy" },
                    { word: "chagriné", score: 0.91, context: "grieved" },
                    { word: "désolé", score: 0.89, context: "sorry" }
                ],
                explanation: "de mauvaise humeur"
            },
            "intéressant": {
                replacements: [
                    { word: "intéressant", score: 0.95, context: "interesting" },
                    { word: "fascinant", score: 0.93, context: "fascinating" },
                    { word: "captivant", score: 0.91, context: "captivating" },
                    { word: "attrayant", score: 0.89, context: "attractive" }
                ],
                explanation: "intéressant ou captivant"
            },
            "difficile": {
                replacements: [
                    { word: "difficile", score: 0.95, context: "difficult" },
                    { word: "compliqué", score: 0.93, context: "complex" },
                    { word: "ardu", score: 0.91, context: "hard" },
                    { word: "pénible", score: 0.89, context: "painful" }
                ],
                explanation: "difficile ou complexe"
            },
            "facile": {
                replacements: [
                    { word: "facile", score: 0.95, context: "easy" },
                    { word: "simple", score: 0.93, context: "simple" },
                    { word: "aisé", score: 0.91, context: "easy" },
                    { word: "sans effort", score: 0.89, context: "effortless" }
                ],
                explanation: "facile ou simple"
            },
            "gentil": {
                replacements: [
                    { word: "gentil", score: 0.95, context: "kind" },
                    { word: "aimable", score: 0.93, context: "pleasant" },
                    { word: "bienveillant", score: 0.91, context: "compassionate" },
                    { word: "cordial", score: 0.89, context: "cordial" }
                ],
                explanation: "gentil ou aimable"
            }
        },
        adverbs: {
            "très": {
                replacements: [
                    { word: "très", score: 0.95, context: "degree" },
                    { word: "extrêmement", score: 0.93, context: "extreme" },
                    { word: "particulièrement", score: 0.91, context: "particularly" },
                    { word: "exceptionnellement", score: 0.89, context: "exceptionally" }
                ],
                explanation: "souligne le degré"
            },
            "vraiment": {
                replacements: [
                    { word: "vraiment", score: 0.95, context: "really" },
                    { word: "réellement", score: 0.93, context: "actually" },
                    { word: "vraiment", score: 0.91, context: "truly" },
                    { word: "en effet", score: 0.89, context: "indeed" }
                ],
                explanation: "souligne la vérité"
            }
        },
        verbs: {
            "aller": {
                replacements: [
                    { word: "aller", score: 0.95, context: "go" },
                    { word: "se rendre", score: 0.93, context: "go to" },
                    { word: "voyager", score: 0.91, context: "travel" },
                    { word: "partir", score: 0.89, context: "depart" }
                ],
                explanation: "se déplacer ou aller"
            },
            "avoir": {
                replacements: [
                    { word: "avoir", score: 0.95, context: "have" },
                    { word: "obtenir", score: 0.93, context: "obtain" },
                    { word: "acquérir", score: 0.91, context: "acquire" },
                    { word: "recevoir", score: 0.89, context: "receive" }
                ],
                explanation: "avoir ou obtenir"
            },
            "faire": {
                replacements: [
                    { word: "faire", score: 0.95, context: "do" },
                    { word: "effectuer", score: 0.93, context: "perform" },
                    { word: "réaliser", score: 0.91, context: "achieve" },
                    { word: "exécuter", score: 0.89, context: "execute" }
                ],
                explanation: "faire ou exécuter"
            },
            "dire": {
                replacements: [
                    { word: "dire", score: 0.95, context: "say" },
                    { word: "exprimer", score: 0.93, context: "express" },
                    { word: "déclarer", score: 0.91, context: "declare" },
                    { word: "énoncer", score: 0.89, context: "state" }
                ],
                explanation: "parler ou dire"
            },
            "penser": {
                replacements: [
                    { word: "penser", score: 0.95, context: "think" },
                    { word: "réfléchir", score: 0.93, context: "reflect" },
                    { word: "considérer", score: 0.91, context: "consider" },
                    { word: "méditer", score: 0.89, context: "meditate" }
                ],
                explanation: "penser ou réfléchir"
            },
            "aimer": {
                replacements: [
                    { word: "aimer", score: 0.95, context: "like" },
                    { word: "adorer", score: 0.93, context: "love" },
                    { word: "apprécier", score: 0.91, context: "appreciate" },
                    { word: "préférer", score: 0.89, context: "prefer" }
                ],
                explanation: "aimer ou adorer"
            },
            "vouloir": {
                replacements: [
                    { word: "vouloir", score: 0.95, context: "want" },
                    { word: "désirer", score: 0.93, context: "desire" },
                    { word: "souhaiter", score: 0.91, context: "wish" },
                    { word: "aspirer", score: 0.89, context: "aspire" }
                ],
                explanation: "vouloir ou souhaiter"
            }
        }
    }
};

export const LANGUAGE_DETECTION_RULES = {
    zh: /[\u4e00-\u9fff]/,
    ja: /[\u3040-\u30ff\u31f0-\u31ff]/,
    ko: /[\uac00-\ud7af\u1100-\u11ff]/,
    ar: /[\u0600-\u06ff]/,
    ru: /[\u0400-\u04ff]/,
    th: /[\u0e00-\u0e7f]/,
    hi: /[\u0900-\u097f]/
};

export function detectLanguage(text) {
    const chars = text.replace(/\s+/g, '');
    if (!chars) return 'en';

    const langScores = {};

    for (const [lang, pattern] of Object.entries(LANGUAGE_DETECTION_RULES)) {
        const matches = text.match(pattern);
        if (matches) {
            langScores[lang] = matches.length;
        }
    }

    if (Object.keys(langScores).length > 0) {
        const detected = Object.entries(langScores)
            .sort((a, b) => b[1] - a[1])[0];
        return detected[0];
    }

    const latinPattern = /[a-zA-Z]/;
    if (latinPattern.test(text)) {
        const germanPattern = /ä|ö|ü|ß|der|die|das|ich|du|er/;
        const frenchPattern = /é|è|ê|à|â|ç|ô|û|le|la|les|je|tu/;
        
        if (germanPattern.test(text)) return 'de';
        if (frenchPattern.test(text)) return 'fr';
        
        return 'en';
    }

    return 'en';
}
