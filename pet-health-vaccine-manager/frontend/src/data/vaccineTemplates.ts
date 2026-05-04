interface VaccineDetail {
  label: string
  value: string
}

interface VaccineTemplate {
  id: number
  name: string
  age: string
  details: VaccineDetail[]
  petType: string
}

interface VaccineTemplatesByType {
  [key: string]: VaccineTemplate[]
}

export const vaccineTemplatesData: VaccineTemplatesByType = {
  dog: [
    {
      id: 1,
      name: '幼犬基础疫苗套餐（首免）',
      age: '6-8周龄',
      petType: 'dog',
      details: [
        { label: '疫苗名称', value: '犬二联疫苗（幼犬专用）' },
        { label: '预防疾病', value: '犬瘟热、犬细小病毒' },
        { label: '接种次数', value: '1针（首免）' },
        { label: '间隔时间', value: '2-3周后接种第二针' },
        { label: '注意事项', value: '确保幼犬健康，无发烧、腹泻等症状' }
      ]
    },
    {
      id: 2,
      name: '幼犬强化疫苗套餐',
      age: '8-12周龄',
      petType: 'dog',
      details: [
        { label: '疫苗名称', value: '犬四联疫苗' },
        { label: '预防疾病', value: '犬瘟热、犬细小病毒、犬传染性肝炎、犬副流感' },
        { label: '接种次数', value: '1针' },
        { label: '间隔时间', value: '2-3周后接种第三针' },
        { label: '注意事项', value: '可同时接种狂犬疫苗（需满3月龄）' }
      ]
    },
    {
      id: 3,
      name: '幼犬完成免疫套餐',
      age: '12-16周龄',
      petType: 'dog',
      details: [
        { label: '疫苗名称', value: '犬六联疫苗 + 狂犬疫苗' },
        { label: '预防疾病', value: '犬瘟热、犬细小病毒、犬传染性肝炎、犬副流感、犬冠状病毒、犬钩端螺旋体 + 狂犬病' },
        { label: '接种次数', value: '1针（完成基础免疫）' },
        { label: '间隔时间', value: '11个月后加强免疫' },
        { label: '注意事项', value: '基础免疫完成后，每年加强一次' }
      ]
    },
    {
      id: 4,
      name: '成犬年度加强免疫',
      age: '1岁以上',
      petType: 'dog',
      details: [
        { label: '疫苗名称', value: '犬四联/六联疫苗 + 狂犬疫苗' },
        { label: '预防疾病', value: '核心传染病 + 狂犬病' },
        { label: '接种次数', value: '1针/年' },
        { label: '间隔时间', value: '每隔11个月接种一次' },
        { label: '注意事项', value: '可根据当地疫情调整疫苗种类' }
      ]
    },
    {
      id: 5,
      name: '犬钩端螺旋体疫苗',
      age: '3月龄以上',
      petType: 'dog',
      details: [
        { label: '疫苗名称', value: '犬钩端螺旋体疫苗' },
        { label: '预防疾病', value: '犬钩端螺旋体病（人畜共患病）' },
        { label: '接种次数', value: '首免2针，间隔2-3周；之后每年1针' },
        { label: '间隔时间', value: '首免两针间隔2-3周' },
        { label: '注意事项', value: '户外活动较多的犬只建议接种' }
      ]
    }
  ],
  cat: [
    {
      id: 6,
      name: '幼猫基础疫苗套餐（首免）',
      age: '8-9周龄',
      petType: 'cat',
      details: [
        { label: '疫苗名称', value: '猫三联疫苗' },
        { label: '预防疾病', value: '猫瘟热、猫鼻气管炎、猫杯状病毒感染' },
        { label: '接种次数', value: '1针（首免）' },
        { label: '间隔时间', value: '3-4周后接种第二针' },
        { label: '注意事项', value: '确保幼猫健康，无发烧、腹泻等症状' }
      ]
    },
    {
      id: 7,
      name: '幼猫强化疫苗套餐',
      age: '12-16周龄',
      petType: 'cat',
      details: [
        { label: '疫苗名称', value: '猫三联疫苗 + 狂犬疫苗' },
        { label: '预防疾病', value: '猫瘟热、猫鼻气管炎、猫杯状病毒感染 + 狂犬病' },
        { label: '接种次数', value: '1针（完成基础免疫）' },
        { label: '间隔时间', value: '11个月后加强免疫' },
        { label: '注意事项', value: '狂犬疫苗需满3月龄接种' }
      ]
    },
    {
      id: 8,
      name: '成猫年度加强免疫',
      age: '1岁以上',
      petType: 'cat',
      details: [
        { label: '疫苗名称', value: '猫三联疫苗 + 狂犬疫苗' },
        { label: '预防疾病', value: '核心传染病 + 狂犬病' },
        { label: '接种次数', value: '1针/年' },
        { label: '间隔时间', value: '每隔11个月接种一次' },
        { label: '注意事项', value: '可根据猫咪生活方式调整' }
      ]
    },
    {
      id: 9,
      name: '猫白血病疫苗',
      age: '8周龄以上',
      petType: 'cat',
      details: [
        { label: '疫苗名称', value: '猫白血病病毒疫苗' },
        { label: '预防疾病', value: '猫白血病病毒感染' },
        { label: '接种次数', value: '首免2针，间隔3-4周；之后每年1针' },
        { label: '间隔时间', value: '首免两针间隔3-4周' },
        { label: '注意事项', value: '户外活动猫、多猫家庭建议接种' }
      ]
    },
    {
      id: 10,
      name: '猫衣原体疫苗',
      age: '8周龄以上',
      petType: 'cat',
      details: [
        { label: '疫苗名称', value: '猫衣原体疫苗' },
        { label: '预防疾病', value: '猫衣原体感染（呼吸道疾病）' },
        { label: '接种次数', value: '首免2针，间隔3-4周；之后每年1针' },
        { label: '间隔时间', value: '首免两针间隔3-4周' },
        { label: '注意事项', value: '多猫家庭、猫舍建议接种' }
      ]
    }
  ],
  other: [
    {
      id: 11,
      name: '兔子基础疫苗套餐',
      age: '8周龄以上',
      petType: 'other',
      details: [
        { label: '疫苗名称', value: '兔瘟疫苗' },
        { label: '预防疾病', value: '兔病毒性出血症（兔瘟）' },
        { label: '接种次数', value: '首免1针，之后每年1-2针' },
        { label: '间隔时间', value: '首免后6个月加强，之后每年1-2次' },
        { label: '注意事项', value: '确保兔子健康，应激反应后暂缓接种' }
      ]
    },
    {
      id: 12,
      name: '豚鼠健康管理方案',
      age: '全年龄段',
      petType: 'other',
      details: [
        { label: '管理项目', value: '定期健康检查' },
        { label: '检查内容', value: '体重监测、牙齿检查、皮肤检查、粪便检查' },
        { label: '检查频率', value: '每3-6个月一次' },
        { label: '特殊注意', value: '豚鼠无法自身合成维生素C，需日常补充' },
        { label: '建议', value: '提供充足的干草和新鲜蔬菜水果' }
      ]
    },
    {
      id: 13,
      name: '仓鼠健康管理方案',
      age: '全年龄段',
      petType: 'other',
      details: [
        { label: '管理项目', value: '日常健康观察' },
        { label: '观察内容', value: '食欲、活动量、粪便、被毛状态' },
        { label: '检查频率', value: '每周自行检查，每年兽医体检一次' },
        { label: '特殊注意', value: '仓鼠牙齿会不断生长，需提供磨牙物品' },
        { label: '环境要求', value: '保持干燥清洁，避免温度骤变' }
      ]
    }
  ]
}
