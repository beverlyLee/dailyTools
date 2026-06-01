'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Wallet, BarChart3, Sparkles, 
  Coffee, ShoppingBag, Home, Car, Film, Heart, GraduationCap, Gift
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import { Transaction, CategoryStats } from '@/types/transaction';
import { calculateSummary, calculateCategoryStats, formatCurrency, formatDate } from '@/lib/utils/stats';
import { generateMockTransactions } from '@/lib/utils/mockData';

interface Insight {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
}

export default function ReportPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const mockData = generateMockTransactions();
    setTransactions(mockData);
    setCategoryStats(calculateCategoryStats(mockData));
    
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  }, []);

  const summary = calculateSummary(transactions);

  const getTopCategory = () => {
    const expenses = categoryStats.filter(c => c.name !== '收入');
    return expenses.length > 0 ? expenses[0] : null;
  };

  const topCategory = getTopCategory();

  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    if (topCategory) {
      const categoryIcons: Record<string, { icon: React.ReactNode; color: string }> = {
        '餐饮美食': { icon: <Coffee className="w-5 h-5" />, color: 'orange' },
        '购物消费': { icon: <ShoppingBag className="w-5 h-5" />, color: 'purple' },
        '居住生活': { icon: <Home className="w-5 h-5" />, color: 'blue' },
        '交通出行': { icon: <Car className="w-5 h-5" />, color: 'green' },
        '休闲娱乐': { icon: <Film className="w-5 h-5" />, color: 'pink' },
        '医疗健康': { icon: <Heart className="w-5 h-5" />, color: 'red' },
        '教育培训': { icon: <GraduationCap className="w-5 h-5" />, color: 'indigo' },
        '人情往来': { icon: <Gift className="w-5 h-5" />, color: 'yellow' },
      };

      const categoryInfo = categoryIcons[topCategory.name] || { icon: <Sparkles className="w-5 h-5" />, color: 'blue' };
      
      insights.push({
        icon: categoryInfo.icon,
        title: `您是${topCategory.name}达人`,
        content: `统计周期内，您在${topCategory.name}上共花费${formatCurrency(topCategory.amount)}，占总支出的${topCategory.percentage.toFixed(1)}%，是您最大的消费支出项。建议您可以适当关注此方面的支出控制。`,
        color: categoryInfo.color
      });
    }

    const coffeeCount = transactions.filter(t => 
      t.category.level3 === '星巴克' || t.category.level3 === '瑞幸咖啡'
    ).length;

    if (coffeeCount > 5) {
      insights.push({
        icon: <Coffee className="w-5 h-5" />,
        title: '咖啡爱好者',
        content: `您一共购买了${coffeeCount}次咖啡，咖啡已经成为您生活中不可或缺的一部分。按平均30元计算，咖啡月消费约${Math.round(coffeeCount * 30 / 3)}元。`,
        color: 'amber'
      });
    }

    const dailyExpense = summary.totalExpense / 90;
    insights.push({
      icon: <Sparkles className="w-5 h-5" />,
      title: '日均消费水平',
      content: `您的日均消费为${formatCurrency(dailyExpense)}，超过了大约${Math.min(70, Math.round(dailyExpense / 300 * 100))}%的同龄人。保持理性消费，让每一分钱都花得有价值。`,
      color: 'blue'
    });

    const diningCount = transactions.filter(t => t.category.level1 === '餐饮美食').length;
    insights.push({
      icon: <Sparkles className="w-5 h-5" />,
      title: '外食频率分析',
      content: `统计期间您共有${diningCount}笔餐饮消费，平均每${Math.round(90 / diningCount)}天就会在外用餐一次。享受美食的同时，也可以尝试自己做饭，更健康更省钱哦！`,
      color: 'green'
    });

    const savingRate = summary.totalIncome > 0 ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome * 100) : 0;
    if (savingRate > 20) {
      insights.push({
        icon: <Sparkles className="w-5 h-5" />,
        title: '储蓄小能手',
        content: `您的储蓄率达到${savingRate.toFixed(1)}%，超过了大多数人！继续保持良好的储蓄习惯，您的财务状况会越来越健康。`,
        color: 'green'
      });
    } else if (savingRate > 0) {
      insights.push({
        icon: <Sparkles className="w-5 h-5" />,
        title: '收支平衡达人',
        content: `您的储蓄率为${savingRate.toFixed(1)}%，收支基本平衡。建议您可以适当控制非必要支出，提高储蓄比例。`,
        color: 'yellow'
      });
    } else {
      insights.push({
        icon: <Sparkles className="w-5 h-5" />,
        title: '消费预警提醒',
        content: `您的支出已超过收入，建议您尽快审视消费结构，削减非必要开支，避免陷入债务困境。`,
        color: 'red'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">数字足迹分析器</h1>
                <p className="text-xs text-gray-500">AI消费画像报告</p>
              </div>
            </Link>
            <div className="flex gap-3">
              <Link
                href="/analysis"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                数据分析
              </Link>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">AI正在生成您的消费画像报告...</p>
            <p className="text-sm text-gray-500 mt-2">分析您的消费习惯，提供个性化建议</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-primary">AI智能分析报告</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">您的专属消费画像</h2>
              <p className="text-gray-500">
                基于 {formatDate(summary.startDate)} 至 {formatDate(summary.endDate)} 的消费数据生成
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <StatCard
                title="总支出"
                value={formatCurrency(summary.totalExpense)}
                color="red"
              />
              <StatCard
                title="总收入"
                value={formatCurrency(summary.totalIncome)}
                color="green"
              />
              <StatCard
                title="结余"
                value={formatCurrency(summary.totalIncome - summary.totalExpense)}
                color={summary.totalIncome >= summary.totalExpense ? 'green' : 'red'}
              />
            </div>

            <div className="mb-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                AI消费洞察
              </h3>
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-5 rounded-2xl border ${colorClasses[insight.color] || colorClasses.blue}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0">
                        {insight.icon}
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">{insight.title}</h4>
                        <p className="text-sm opacity-80 leading-relaxed">{insight.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm mb-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6">消费分类排行</h3>
              <div className="space-y-4">
                {categoryStats.filter(c => c.name !== '收入').slice(0, 6).map((category, index) => (
                  <div key={category.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">{category.name}</span>
                        <span className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                          style={{ width: `${Math.min(category.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-bold text-gray-800 w-24 text-right">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">💡 理财小贴士</h3>
              <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
                合理的财务规划是实现财务自由的第一步。建议您按照"50-30-20"原则分配收入：
                50%用于必要支出，30%用于个人发展和享受，20%用于储蓄投资。
                坚持记账，定期复盘，让每一分钱都发挥最大价值！
              </p>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>本报告仅供参考，不构成投资建议</p>
              <p className="mt-1">所有数据仅在本地处理，您的隐私安全有保障</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
