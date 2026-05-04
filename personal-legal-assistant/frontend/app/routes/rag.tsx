import { useState } from "react";
import { Search, BookOpen, FileText, AlertCircle, Copy, Check, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import Layout from "~/components/Layout";
import { ragApi } from "~/lib/api";
import type { RAGSearchResult, SimilarCaseResult, LegalArticle } from "~/lib/api";
import { formatSimilarity, truncateText, copyToClipboard } from "~/lib/utils";

interface FormData {
  query: string;
}

export default function RAGPage() {
  const [searchResult, setSearchResult] = useState<RAGSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'articles'>('cases');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const query = watch("query");

  const onSubmit = async (data: FormData) => {
    if (!data.query || data.query.trim().length < 5) return;
    
    setIsSearching(true);
    try {
      const response = await ragApi.search(data.query);
      setSearchResult(response.data);
      setActiveTab('cases');
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyText = (text: string) => {
    copyToClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const quickSearches = [
    "民间借贷纠纷，借款人逾期未还",
    "劳动合同纠纷，公司违法辞退",
    "交通事故赔偿，对方全责",
    "离婚诉讼，财产分割和抚养权",
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">判例智能检索</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            输入您的案情描述，系统将使用RAG向量检索技术，为您匹配相似判例和相关法律条文。
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <textarea
                className="textarea pl-12 min-h-[120px] text-base"
                placeholder="请输入您的案情描述，例如：\n\n张三借给李四10万元，约定半年后归还，但是到期后李四一直不还钱，还拉黑了张三的联系方式..."
                {...register("query", {
                  required: "请输入搜索关键词",
                  minLength: { value: 5, message: "搜索内容至少5个字" },
                })}
              />
            </div>
            {errors.query && (
              <p className="text-red-500 text-sm">{errors.query.message}</p>
            )}
            <button
              type="submit"
              disabled={isSearching || !query || query.trim().length < 5}
              className="btn btn-primary w-full py-3 text-base"
            >
              {isSearching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  正在检索相似判例...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  智能检索
                </>
              )}
            </button>
          </form>

          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">快速搜索示例：</p>
            <div className="flex flex-wrap gap-2">
              {quickSearches.map((search, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (window) {
                      const textarea = document.querySelector('textarea[name="query"]') as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.value = search;
                        const event = new Event('input', { bubbles: true });
                        textarea.dispatchEvent(event);
                      }
                    }
                  }}
                  className="text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  {truncateText(search, 25)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {searchResult ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  检索结果
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  共找到 {searchResult.similar_cases.length} 个相似判例，{searchResult.legal_articles.length} 条相关法律条文
                </p>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('cases')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'cases'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    相似判例 ({searchResult.similar_cases.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'articles'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    法律条文 ({searchResult.legal_articles.length})
                  </div>
                </button>
              </div>
            </div>

            {activeTab === 'cases' && (
              <div className="space-y-4">
                {searchResult.similar_cases.length > 0 ? (
                  searchResult.similar_cases.map((caseItem: SimilarCaseResult, idx: number) => (
                    <div key={idx} className="card p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {caseItem.title}
                          </h3>
                          <p className="text-gray-600">
                            {caseItem.description}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="text-right">
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {formatSimilarity(caseItem.similarity_score)} 匹配
                            </div>
                          </div>
                          {caseItem.source && (
                            <p className="text-xs text-gray-500 mt-2 text-right">
                              来源: {caseItem.source}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      未找到相似判例
                    </h3>
                    <p className="text-gray-500">
                      请尝试使用不同的关键词或更详细的案情描述进行搜索
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'articles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={() => handleCopyText(
                      searchResult.legal_articles.map(a => `${a.article_name}\n${a.article_content}`).join('\n\n')
                    )}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-1" />已复制全部</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-1" />复制全部条文</>
                    )}
                  </button>
                </div>

                {searchResult.legal_articles.length > 0 ? (
                  searchResult.legal_articles.map((article: LegalArticle, idx: number) => (
                    <div key={idx} className="card p-6 border-l-4 border-primary-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {article.article_name}
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {article.article_content}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                            {article.law_type}
                          </span>
                          {article.relevance_score !== undefined && (
                            <div className="text-right mt-2">
                              <span className="text-sm text-green-600">
                                相关度: {formatSimilarity(article.relevance_score)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card p-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      未找到相关法律条文
                    </h3>
                    <p className="text-gray-500">
                      请尝试使用不同的关键词进行搜索
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  开始智能检索
                </h3>
                <p className="text-gray-600 max-w-lg mx-auto">
                  输入您的案情描述，系统将使用向量检索技术，为您匹配相似判例和相关法律条文，帮助您更好地了解案件情况。
                </p>
              </div>

              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <FileText className="w-5 h-5 text-primary-600 mr-2" />
                    <h4 className="font-medium text-gray-900">相似判例检索</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    基于语义相似度，查找与您案情相似的历史判例，了解类似案件的判决结果。
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <BookOpen className="w-5 h-5 text-primary-600 mr-2" />
                    <h4 className="font-medium text-gray-900">法律条文匹配</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    根据案情关键词，智能匹配相关法律条文，明确您的法律依据。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
