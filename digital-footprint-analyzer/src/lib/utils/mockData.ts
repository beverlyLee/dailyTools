import { Transaction } from '@/types/transaction';

export function generateMockTransactions(): Transaction[] {
  const counterparties = [
    { name: '星巴克咖啡', category: { level1: '餐饮美食', level2: '咖啡茶饮', level3: '星巴克' } },
    { name: '瑞幸咖啡', category: { level1: '餐饮美食', level2: '咖啡茶饮', level3: '瑞幸咖啡' } },
    { name: '麦当劳', category: { level1: '餐饮美食', level2: '快餐简餐', level3: '麦当劳' } },
    { name: '肯德基', category: { level1: '餐饮美食', level2: '快餐简餐', level3: '肯德基' } },
    { name: '海底捞火锅', category: { level1: '餐饮美食', level2: '正餐宴请', level3: '海底捞' } },
    { name: '美团外卖', category: { level1: '餐饮美食', level2: '快餐简餐' } },
    { name: '滴滴出行', category: { level1: '交通出行', level2: '打车出行', level3: '滴滴出行' } },
    { name: '地铁运营公司', category: { level1: '交通出行', level2: '公共交通' } },
    { name: '中石化加油站', category: { level1: '交通出行', level2: '私家车' } },
    { name: '京东商城', category: { level1: '购物消费', level2: '数码电子', level3: '京东' } },
    { name: '淘宝', category: { level1: '购物消费', level2: '服饰鞋包', level3: '淘宝' } },
    { name: '优衣库', category: { level1: '购物消费', level2: '服饰鞋包', level3: '优衣库' } },
    { name: 'Apple Store', category: { level1: '购物消费', level2: '数码电子', level3: 'Apple' } },
    { name: '万达影城', category: { level1: '休闲娱乐', level2: '电影演出' } },
    { name: '腾讯视频会员', category: { level1: '休闲娱乐', level2: '视频音乐' } },
    { name: '网易云音乐', category: { level1: '休闲娱乐', level2: '视频音乐' } },
    { name: '健身房年卡', category: { level1: '休闲娱乐', level2: '运动健身' } },
    { name: '美团民宿', category: { level1: '休闲娱乐', level2: '旅游度假' } },
    { name: '医院挂号费', category: { level1: '医疗健康', level2: '看病就医' } },
    { name: '药店购药', category: { level1: '医疗健康', level2: '看病就医' } },
    { name: '房租支出', category: { level1: '居住生活', level2: '房屋租金' } },
    { name: '水电燃气费', category: { level1: '居住生活', level2: '水电燃气' } },
  ];

  const transactions: Transaction[] = [];
  let idCounter = 1;

  for (let i = 0; i < 50; i++) {
    const counterparty = counterparties[Math.floor(Math.random() * counterparties.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    let amount: number;
    if (counterparty.name.includes('星巴克') || counterparty.name.includes('瑞幸')) {
      amount = 20 + Math.random() * 30;
    } else if (counterparty.name.includes('麦当劳') || counterparty.name.includes('肯德基')) {
      amount = 30 + Math.random() * 50;
    } else if (counterparty.name.includes('海底捞')) {
      amount = 200 + Math.random() * 300;
    } else if (counterparty.name.includes('滴滴')) {
      amount = 15 + Math.random() * 50;
    } else if (counterparty.name.includes('地铁')) {
      amount = 3 + Math.random() * 10;
    } else if (counterparty.name.includes('房租')) {
      amount = 3000 + Math.random() * 2000;
    } else if (counterparty.name.includes('Apple')) {
      amount = 500 + Math.random() * 5000;
    } else if (counterparty.name.includes('会员')) {
      amount = 15 + Math.random() * 30;
    } else if (counterparty.name.includes('健身')) {
      amount = 1000 + Math.random() * 2000;
    } else {
      amount = 50 + Math.random() * 200;
    }

    transactions.push({
      id: `mock-${idCounter++}`,
      date,
      type: 'expense',
      amount: Math.round(amount * 100) / 100,
      counterparty: counterparty.name,
      description: `消费于${counterparty.name}`,
      paymentMethod: Math.random() > 0.5 ? '微信支付' : '支付宝',
      category: counterparty.category,
      source: Math.random() > 0.5 ? 'wechat' : 'alipay'
    });
  }

  transactions.push({
    id: `mock-${idCounter++}`,
    date: new Date(),
    type: 'income',
    amount: 15000,
    counterparty: '公司工资',
    description: '12月份工资收入',
    paymentMethod: '银行转账',
    category: { level1: '收入', level2: '工资收入' },
    source: 'wechat'
  });

  transactions.push({
    id: `mock-${idCounter++}`,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    type: 'income',
    amount: 500,
    counterparty: '年终奖',
    description: '年度奖金',
    paymentMethod: '银行转账',
    category: { level1: '收入', level2: '奖金收入' },
    source: 'alipay'
  });

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}
