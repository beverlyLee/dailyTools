interface Symptom {
  id: string
  name: string
  keywords: string[]
  category: string
  severity: 'mild' | 'moderate' | 'severe'
}

interface SymptomCategory {
  id: string
  name: string
  symptoms: Symptom[]
}

interface SymptomDecisionTree {
  [key: string]: SymptomCategory[]
}

export const symptomDecisionTree: SymptomDecisionTree = {
  dog: [
    {
      id: 'digestive',
      name: '消化系统症状',
      symptoms: [
        {
          id: 'vomiting',
          name: '呕吐',
          keywords: ['呕吐', '吐', '反胃', '干呕'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'diarrhea',
          name: '腹泻',
          keywords: ['腹泻', '拉肚子', '拉稀', '软便'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'constipation',
          name: '便秘',
          keywords: ['便秘', '排便困难', '拉不出'],
          category: 'digestive',
          severity: 'mild'
        },
        {
          id: 'loss_of_appetite',
          name: '食欲不振',
          keywords: ['食欲不振', '不吃东西', '食欲下降', '拒食'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'excessive_hunger',
          name: '食欲异常增加',
          keywords: ['食欲增加', '吃太多', '总是饿', '暴饮暴食'],
          category: 'digestive',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'respiratory',
      name: '呼吸系统症状',
      symptoms: [
        {
          id: 'coughing',
          name: '咳嗽',
          keywords: ['咳嗽', '干咳', '咳痰', '喘咳'],
          category: 'respiratory',
          severity: 'moderate'
        },
        {
          id: 'sneezing',
          name: '打喷嚏',
          keywords: ['打喷嚏', '喷嚏', '感冒'],
          category: 'respiratory',
          severity: 'mild'
        },
        {
          id: 'nasal_discharge',
          name: '流鼻涕',
          keywords: ['流鼻涕', '鼻塞', '鼻涕', '鼻水'],
          category: 'respiratory',
          severity: 'mild'
        },
        {
          id: 'difficulty_breathing',
          name: '呼吸困难',
          keywords: ['呼吸困难', '喘', '气喘', '呼吸急促', '憋气'],
          category: 'respiratory',
          severity: 'severe'
        }
      ]
    },
    {
      id: 'skin',
      name: '皮肤和被毛症状',
      symptoms: [
        {
          id: 'itching',
          name: '瘙痒',
          keywords: ['瘙痒', '抓痒', '挠痒', '皮肤痒'],
          category: 'skin',
          severity: 'mild'
        },
        {
          id: 'hair_loss',
          name: '脱毛',
          keywords: ['脱毛', '掉毛', '毛发稀疏', '秃'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'rash',
          name: '皮疹',
          keywords: ['皮疹', '红疹', '皮肤发红', '起疙瘩'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'dandruff',
          name: '皮屑增多',
          keywords: ['皮屑', '头皮屑', '皮肤干燥'],
          category: 'skin',
          severity: 'mild'
        },
        {
          id: 'odor',
          name: '异常体味',
          keywords: ['体味重', '臭', '异味', '体臭'],
          category: 'skin',
          severity: 'mild'
        }
      ]
    },
    {
      id: 'behavioral',
      name: '行为和精神症状',
      symptoms: [
        {
          id: 'lethargy',
          name: '精神萎靡',
          keywords: ['精神不好', '没精神', '萎靡不振', '嗜睡'],
          category: 'behavioral',
          severity: 'moderate'
        },
        {
          id: 'anxiety',
          name: '焦虑不安',
          keywords: ['焦虑', '不安', '烦躁', '坐立不安'],
          category: 'behavioral',
          severity: 'mild'
        },
        {
          id: 'aggression',
          name: '攻击性增强',
          keywords: ['攻击性', '咬人', '乱叫', '脾气暴躁'],
          category: 'behavioral',
          severity: 'moderate'
        },
        {
          id: 'excessive_licking',
          name: '过度舔舐',
          keywords: ['舔自己', '过度舔舐', '舔爪子'],
          category: 'behavioral',
          severity: 'mild'
        }
      ]
    },
    {
      id: 'urinary',
      name: '泌尿系统症状',
      symptoms: [
        {
          id: 'frequent_urination',
          name: '尿频',
          keywords: ['尿频', '尿多', '频繁尿尿'],
          category: 'urinary',
          severity: 'moderate'
        },
        {
          id: 'difficulty_urinating',
          name: '排尿困难',
          keywords: ['排尿困难', '尿不出', '尿痛', '血尿'],
          category: 'urinary',
          severity: 'severe'
        },
        {
          id: 'incontinence',
          name: '尿失禁',
          keywords: ['尿失禁', '漏尿', '尿床'],
          category: 'urinary',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'severe',
      name: '严重症状（需立即就医）',
      symptoms: [
        {
          id: 'seizures',
          name: '抽搐/癫痫',
          keywords: ['抽搐', '癫痫', '痉挛', '口吐白沫'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'unconscious',
          name: '昏迷/意识不清',
          keywords: ['昏迷', '意识不清', '晕倒', '休克'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'severe_bleeding',
          name: '严重出血',
          keywords: ['大出血', '流血不止', '严重出血'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'collapse',
          name: '虚脱/ collapse',
          keywords: ['虚脱', '倒下', '站不起来', '瘫软'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'severe_pain',
          name: '剧烈疼痛',
          keywords: ['剧烈疼痛', '惨叫', '一碰就叫'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'bloating',
          name: '腹胀（胃扭转风险）',
          keywords: ['腹胀', '肚子胀', '胃扭转', '腹部膨胀'],
          category: 'severe',
          severity: 'severe'
        }
      ]
    }
  ],
  cat: [
    {
      id: 'digestive',
      name: '消化系统症状',
      symptoms: [
        {
          id: 'vomiting',
          name: '呕吐',
          keywords: ['呕吐', '吐', '反胃', '干呕', '吐毛球'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'diarrhea',
          name: '腹泻',
          keywords: ['腹泻', '拉肚子', '拉稀', '软便'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'constipation',
          name: '便秘',
          keywords: ['便秘', '排便困难', '拉不出', '巨结肠'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'loss_of_appetite',
          name: '食欲不振',
          keywords: ['食欲不振', '不吃东西', '食欲下降', '拒食'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'excessive_hunger',
          name: '食欲异常增加',
          keywords: ['食欲增加', '吃太多', '总是饿', '暴饮暴食'],
          category: 'digestive',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'respiratory',
      name: '呼吸系统症状',
      symptoms: [
        {
          id: 'coughing',
          name: '咳嗽',
          keywords: ['咳嗽', '干咳', '咳痰', '喘咳', '猫鼻支'],
          category: 'respiratory',
          severity: 'moderate'
        },
        {
          id: 'sneezing',
          name: '打喷嚏',
          keywords: ['打喷嚏', '喷嚏', '感冒', '猫鼻支'],
          category: 'respiratory',
          severity: 'mild'
        },
        {
          id: 'nasal_discharge',
          name: '流鼻涕',
          keywords: ['流鼻涕', '鼻塞', '鼻涕', '鼻水', '脓性鼻涕'],
          category: 'respiratory',
          severity: 'moderate'
        },
        {
          id: 'eye_discharge',
          name: '眼睛分泌物增多',
          keywords: ['眼屎多', '眼睛分泌物', '结膜炎', '猫鼻支'],
          category: 'respiratory',
          severity: 'moderate'
        },
        {
          id: 'difficulty_breathing',
          name: '呼吸困难',
          keywords: ['呼吸困难', '喘', '气喘', '呼吸急促', '憋气', '腹式呼吸'],
          category: 'respiratory',
          severity: 'severe'
        }
      ]
    },
    {
      id: 'skin',
      name: '皮肤和被毛症状',
      symptoms: [
        {
          id: 'itching',
          name: '瘙痒',
          keywords: ['瘙痒', '抓痒', '挠痒', '皮肤痒', '过度舔毛'],
          category: 'skin',
          severity: 'mild'
        },
        {
          id: 'hair_loss',
          name: '脱毛',
          keywords: ['脱毛', '掉毛', '毛发稀疏', '秃', '猫癣'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'rash',
          name: '皮疹',
          keywords: ['皮疹', '红疹', '皮肤发红', '起疙瘩', '猫癣'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'dandruff',
          name: '皮屑增多',
          keywords: ['皮屑', '头皮屑', '皮肤干燥', '猫癣'],
          category: 'skin',
          severity: 'mild'
        },
        {
          id: 'odor',
          name: '异常体味',
          keywords: ['体味重', '臭', '异味', '体臭', '口臭'],
          category: 'skin',
          severity: 'mild'
        }
      ]
    },
    {
      id: 'behavioral',
      name: '行为和精神症状',
      symptoms: [
        {
          id: 'lethargy',
          name: '精神萎靡',
          keywords: ['精神不好', '没精神', '萎靡不振', '嗜睡', '不爱动'],
          category: 'behavioral',
          severity: 'moderate'
        },
        {
          id: 'anxiety',
          name: '焦虑不安',
          keywords: ['焦虑', '不安', '烦躁', '坐立不安', '应激'],
          category: 'behavioral',
          severity: 'mild'
        },
        {
          id: 'aggression',
          name: '攻击性增强',
          keywords: ['攻击性', '咬人', '哈人', '脾气暴躁'],
          category: 'behavioral',
          severity: 'moderate'
        },
        {
          id: 'hiding',
          name: '躲起来',
          keywords: ['躲起来', '藏起来', '不见人', '害怕'],
          category: 'behavioral',
          severity: 'mild'
        },
        {
          id: 'excessive_grooming',
          name: '过度梳理',
          keywords: ['过度舔毛', '过度梳理', '舔秃', '精神性脱毛'],
          category: 'behavioral',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'urinary',
      name: '泌尿系统症状',
      symptoms: [
        {
          id: 'frequent_urination',
          name: '尿频',
          keywords: ['尿频', '尿多', '频繁尿尿', '乱尿', '泌尿系统问题'],
          category: 'urinary',
          severity: 'moderate'
        },
        {
          id: 'difficulty_urinating',
          name: '排尿困难',
          keywords: ['排尿困难', '尿不出', '尿痛', '血尿', '闭尿', '尿闭'],
          category: 'urinary',
          severity: 'severe'
        },
        {
          id: 'inappropriate_urination',
          name: '乱排尿',
          keywords: ['乱尿', '不在猫砂盆尿', '尿床', '标记行为'],
          category: 'urinary',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'severe',
      name: '严重症状（需立即就医）',
      symptoms: [
        {
          id: 'seizures',
          name: '抽搐/癫痫',
          keywords: ['抽搐', '癫痫', '痉挛', '口吐白沫'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'unconscious',
          name: '昏迷/意识不清',
          keywords: ['昏迷', '意识不清', '晕倒', '休克'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'severe_bleeding',
          name: '严重出血',
          keywords: ['大出血', '流血不止', '严重出血'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'collapse',
          name: '虚脱/ collapse',
          keywords: ['虚脱', '倒下', '站不起来', '瘫软'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'severe_pain',
          name: '剧烈疼痛',
          keywords: ['剧烈疼痛', '惨叫', '一碰就叫'],
          category: 'severe',
          severity: 'severe'
        }
      ]
    }
  ],
  other: [
    {
      id: 'general',
      name: '一般健康症状',
      symptoms: [
        {
          id: 'lethargy',
          name: '精神萎靡',
          keywords: ['精神不好', '没精神', '萎靡不振', '嗜睡', '不爱动'],
          category: 'general',
          severity: 'moderate'
        },
        {
          id: 'loss_of_appetite',
          name: '食欲不振',
          keywords: ['食欲不振', '不吃东西', '食欲下降', '拒食'],
          category: 'general',
          severity: 'moderate'
        },
        {
          id: 'weight_loss',
          name: '体重下降',
          keywords: ['体重下降', '消瘦', '变瘦'],
          category: 'general',
          severity: 'moderate'
        },
        {
          id: 'abnormal_behavior',
          name: '行为异常',
          keywords: ['行为异常', '不正常', '奇怪行为'],
          category: 'general',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'digestive',
      name: '消化系统症状',
      symptoms: [
        {
          id: 'diarrhea',
          name: '腹泻',
          keywords: ['腹泻', '拉肚子', '拉稀', '软便'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'constipation',
          name: '便秘',
          keywords: ['便秘', '排便困难', '拉不出'],
          category: 'digestive',
          severity: 'moderate'
        },
        {
          id: 'abnormal_feces',
          name: '粪便异常',
          keywords: ['粪便异常', '便便不正常', '颜色异常'],
          category: 'digestive',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'skin',
      name: '皮肤和被毛症状',
      symptoms: [
        {
          id: 'hair_loss',
          name: '脱毛',
          keywords: ['脱毛', '掉毛', '毛发稀疏', '秃'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'rash',
          name: '皮疹',
          keywords: ['皮疹', '红疹', '皮肤发红', '起疙瘩'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'scabs',
          name: '结痂',
          keywords: ['结痂', '伤口', '皮肤破损'],
          category: 'skin',
          severity: 'moderate'
        },
        {
          id: 'parasites',
          name: '寄生虫',
          keywords: ['寄生虫', '虱子', '跳蚤', '螨虫'],
          category: 'skin',
          severity: 'moderate'
        }
      ]
    },
    {
      id: 'respiratory',
      name: '呼吸系统症状',
      symptoms: [
        {
          id: 'sneezing',
          name: '打喷嚏',
          keywords: ['打喷嚏', '喷嚏', '感冒'],
          category: 'respiratory',
          severity: 'mild'
        },
        {
          id: 'nasal_discharge',
          name: '流鼻涕',
          keywords: ['流鼻涕', '鼻塞', '鼻涕', '鼻水'],
          category: 'respiratory',
          severity: 'moderate'
        },
        {
          id: 'difficulty_breathing',
          name: '呼吸困难',
          keywords: ['呼吸困难', '喘', '气喘', '呼吸急促'],
          category: 'respiratory',
          severity: 'severe'
        }
      ]
    },
    {
      id: 'severe',
      name: '严重症状（需立即就医）',
      symptoms: [
        {
          id: 'seizures',
          name: '抽搐',
          keywords: ['抽搐', '痉挛', '颤抖'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'unconscious',
          name: '昏迷/意识不清',
          keywords: ['昏迷', '意识不清', '晕倒', '休克'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'severe_bleeding',
          name: '严重出血',
          keywords: ['大出血', '流血不止', '严重出血'],
          category: 'severe',
          severity: 'severe'
        },
        {
          id: 'collapse',
          name: '虚脱',
          keywords: ['虚脱', '倒下', '站不起来', '瘫软'],
          category: 'severe',
          severity: 'severe'
        }
      ]
    }
  ]
}
