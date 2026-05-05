import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-full">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            企业知识库与问答助手
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            智能文档管理与语义搜索，企业级知识问答系统
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link
              href="/documents"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              进入文档知识库
            </Link>
            <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              查看演示
            </button>
          </div>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    文档知识库
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    支持上传 PDF、Word、Markdown 格式文档，自动解析内容并建立索引。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-green-500 rounded-md shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    语义搜索
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    基于向量数据库实现智能语义搜索，不仅匹配关键词，更理解查询意图。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-purple-500 rounded-md shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    智能问答
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    基于本地 LLM 的专属问答助手，限定在知识库范围内回答，提供引用来源。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                为什么选择我们的企业知识库？
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">
                    完全本地化部署，数据安全有保障
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">
                    支持多种文档格式，自动解析和索引
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">
                    智能语义搜索，精准定位所需信息
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-700">
                    对话历史管理，支持分享和导出
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">快速开始</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium mr-3">1</span>
                  <p className="text-base text-gray-700">上传企业文档到知识库</p>
                </div>
                <div className="flex items-center">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium mr-3">2</span>
                  <p className="text-base text-gray-700">系统自动解析并建立索引</p>
                </div>
                <div className="flex items-center">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium mr-3">3</span>
                  <p className="text-base text-gray-700">使用语义搜索或问答功能</p>
                </div>
                <div className="flex items-center">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium mr-3">4</span>
                  <p className="text-base text-gray-700">获取精准答案和引用来源</p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/documents"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  开始使用
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
