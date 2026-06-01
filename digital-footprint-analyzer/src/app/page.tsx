'use client';

import Link from 'next/link';
import { BarChart3, FileText, TrendingUp, Wallet, ArrowRight, CheckCircle } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import StatCard from '@/components/StatCard';
import { ParseResult } from '@/types/transaction';
import { calculateSummary, formatCurrency, formatDate } from '@/lib/utils/stats';
import { calculateCategorizationAccuracy } from '@/lib/categorizer';
import { useTransactions } from '@/hooks/useTransactions';

export default function HomePage() {
  const { transactions, isLoaded, setTransactions } = useTransactions();

  const handleParseComplete = (result: ParseResult) => {
    setTransactions(result.transactions);
  };

  const summary = calculateSummary(transactions);
  const accuracy = calculateCategorizationAccuracy(transactions);

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">数字足迹分析器</h1>
                <p className="text-xs text-gray-500">智能账单分析 · 消费画像生成</p>
              </div>
            </div>
            {transactions.length > 0 && (
              <div className="flex gap-3">
                <Link
                  href="/analysis"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  查看分析
                </Link>
                <Link
                  href="/report"
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  生成报告
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {transactions.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              让消费数据说话
            </h2>
            <p className="text-gray-500 text-lg">
              上传微信或支付宝账单CSV文件，自动分类消费行为，
              生成可视化图表和AI消费画像报告
            </p>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">账单解析成功</h2>
                <p className="text-sm text-gray-500">
                  共识别 {transactions.length} 条交易记录，
                  分类准确率 {(accuracy * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                title="交易笔数"
                value={summary.transactionCount}
                color="blue"
              />
              <StatCard
                title="统计周期"
                value={`${formatDate(summary.startDate)} ~ ${formatDate(summary.endDate)}`}
                color="purple"
              />
            </div>

            <div className="flex justify-center">
              <Link
                href="/analysis"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                查看详细分析
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <FileUpload onParseComplete={handleParseComplete} />
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">智能解析</h3>
            <p className="text-sm text-gray-500">
              自动识别微信和支付宝账单格式，无需手动处理
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-green-50 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">自动分类</h3>
            <p className="text-sm text-gray-500">
              基于关键词匹配，智能识别消费类型和品牌
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">消费画像</h3>
            <p className="text-sm text-gray-500">
              AI生成个性化消费报告，洞察消费习惯
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t mt-16 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>数字足迹分析器 · 您的个人消费分析助手</p>
          <p className="mt-1">所有数据仅在本地处理，不会上传到服务器</p>
        </div>
      </footer>
    </main>
  );
}
