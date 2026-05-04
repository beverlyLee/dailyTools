import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          智能家庭账单分摊系统
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          轻松管理合租账单，智能分摊费用，最小化转账次数
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/ocr" className="group">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">OCR 识别</h3>
            <p className="text-gray-600 text-sm">
              上传水电煤账单图片，自动识别金额和明细
            </p>
          </div>
        </Link>

        <Link href="/bills" className="group">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">账单管理</h3>
            <p className="text-gray-600 text-sm">
              查看和管理所有账单，支持拖拽分类
            </p>
          </div>
        </Link>

        <Link href="/split" className="group">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">分摊计算</h3>
            <p className="text-gray-600 text-sm">
              支持平摊、按比例、按用量等多种分摊策略
            </p>
          </div>
        </Link>

        <Link href="/settlement" className="group">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">债务清算</h3>
            <p className="text-gray-600 text-sm">
              最小现金流算法，计算最少转账次数
            </p>
          </div>
        </Link>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">系统功能特性</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              智能 OCR 识别
            </h3>
            <p className="text-gray-600">
              集成 PaddleOCR，自动识别水电煤账单图片中的金额、日期等信息。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              灵活分摊策略
            </h3>
            <p className="text-gray-600">
              采用策略模式设计，支持平摊、按比例、按用量等多种分摊算法。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              最优债务清算
            </h3>
            <p className="text-gray-600">
              最小现金流算法，自动计算出最少的转账次数，简化结算流程。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
