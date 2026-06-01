'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, BarChart3, FileText, AlertTriangle } from 'lucide-react';
import ClientSunburstChart from '@/components/charts/ClientSunburstChart';
import ClientPieChart from '@/components/charts/ClientPieChart';
import StatCard from '@/components/StatCard';
import { CategoryStats } from '@/types/transaction';
import { calculateSummary, calculateCategoryStats, formatCurrency, formatDate } from '@/lib/utils/stats';
import { useTransactions } from '@/hooks/useTransactions';

export default function AnalysisPage() {
  const { transactions, isLoaded } = useTransactions();
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || transactions.length === 0) {
      return;
    }
    setCategoryStats(calculateCategoryStats(transactions));
  }, [transactions, isLoaded]);

  const summary = calculateSummary(transactions);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">数字足迹分析器</h1>
                <p className="text-xs text-gray-500">消费分析</p>
              </div>
            </Link>
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回首页
              </Link>
              <Link
                href="/report"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <FileText className="w-4 h-4" />
                生成报告
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {transactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">暂无数据</h2>
            <p className="text-gray-500 mb-8">请先在首页上传您的账单CSV文件</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              去上传账单
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">数据分析概览</h2>
              <p className="text-gray-500">
                统计周期：{formatDate(summary.startDate)} ~ {formatDate(summary.endDate)}
              </p>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
          <StatCard
            title="交易笔数"
            value={summary.transactionCount}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClientSunburstChart transactions={transactions} />
          <ClientPieChart transactions={transactions} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            消费分类明细
          </h3>
          <div className="space-y-4">
            {categoryStats.map((category) => (
              <div key={category.name} className="border rounded-xl overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.name ? null : category.name
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                        <span className="font-bold text-primary">{category.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{category.name}</p>
                        <p className="text-sm text-gray-500">
                          {category.count} 笔交易
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{formatCurrency(category.amount)}</p>
                      <p className="text-sm text-gray-500">
                        占比 {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
                
                {expandedCategory === category.name && category.children && (
                  <div className="border-t bg-gray-50">
                    {category.children.map((subCategory) => (
                      <div
                        key={subCategory.name}
                        className="px-6 py-3 flex items-center justify-between border-b last:border-b-0"
                      >
                        <span className="text-gray-600">{subCategory.name}</span>
                        <div className="text-right">
                          <span className="font-medium text-gray-800">
                            {formatCurrency(subCategory.amount)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({subCategory.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </div>
    </main>
  );
}
