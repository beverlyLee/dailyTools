import { useState } from "react";
import { useSearchParams } from "@remix-run/react";
import { Search, AlertCircle, FileText, Users, DollarSign, BookOpen, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import Layout from "~/components/Layout";
import { analysisApi, caseApi } from "~/lib/api";
import type { AnalysisResult, Case } from "~/lib/api";
import { getCaseTypeColor, getEntityTypeIcon, getEntityTypeLabel, truncateText, copyToClipboard } from "~/lib/utils";

interface FormData {
  description: string;
}

export default function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get("caseId");
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const description = watch("description");

  const onSubmit = async (data: FormData) => {
    if (!data.description || data.description.length < 20) return;
    
    setIsAnalyzing(true);
    try {
      const response = await analysisApi.analyze(data.description);
      setAnalysisResult(response.data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyText = (text: string) => {
    copyToClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">案情智能分析</h1>
          <p className="text-gray-600">
            输入您的案情描述，系统将自动进行实体识别、关系抽取、法律条文匹配。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2 text-primary-600" />
                案情描述
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <textarea
                    className="textarea min-h-[300px]"
                    placeholder="请详细描述您遇到的法律问题。例如：\n\n张三于2023年1月15日借给李四人民币10万元，约定月利率1.5%，借款期限6个月。李四出具了借条，但借款到期后，李四未偿还借款本息，张三多次催讨未果。"
                    {...register("description", {
                      required: "请描述您的案情",
                      minLength: { value: 20, message: "案情描述至少20字" },
                    })}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={isAnalyzing || !description || description.length < 20}
                  className="btn btn-primary w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      分析中...
                    </>
                  ) : (
                    "开始智能分析"
                  )}
                </button>
              </form>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">分析提示</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• 请尽量详细描述事件经过、时间、地点、涉及金额等关键信息</li>
                    <li>• 说明您与对方当事人的关系</li>
                    <li>• 提及您拥有的证据材料（如合同、借条、聊天记录等）</li>
                    <li>• 明确您的诉求或期望的解决方案</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {analysisResult ? (
              <>
                {analysisResult.case_type && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-primary-600" />
                      案件类型识别
                    </h3>
                    <div className="flex items-center">
                      <span className={getCaseTypeColor(analysisResult.case_type) + " px-4 py-2 rounded-full text-base font-medium"}>
                        {analysisResult.case_type}
                      </span>
                    </div>
                  </div>
                )}

                {analysisResult.entities && analysisResult.entities.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-primary-600" />
                      识别到的法律实体
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.entities.map((entity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <span className="text-xl mr-3">{getEntityTypeIcon(entity.type)}</span>
                            <div>
                              <div className="font-medium text-gray-900">{entity.text}</div>
                              <div className="text-sm text-gray-500">{getEntityTypeLabel(entity.type)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.relations && analysisResult.relations.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-primary-600" />
                      法律关系抽取
                    </h3>
                    <div className="space-y-3">
                      {analysisResult.relations.map((relation, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center mb-2">
                            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                              {relation.relation_type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium text-gray-900">{relation.subject}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium text-gray-900">{relation.object}</span>
                          </div>
                          {relation.sentence && (
                            <div className="text-xs text-gray-500 mt-2 italic">
                              "{truncateText(relation.sentence, 80)}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.legal_articles && analysisResult.legal_articles.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-primary-600" />
                        匹配的法律条文
                      </h3>
                      <button
                        onClick={() => handleCopyText(
                          analysisResult.legal_articles?.map(a => `${a.article_name}\n${a.article_content}`).join('\n\n') || ''
                        )}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        {copied ? (
                          <><Check className="w-4 h-4 mr-1" />已复制</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-1" />复制全部</>
                        )}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {analysisResult.legal_articles.map((article, idx) => (
                        <div key={idx} className="border-l-4 border-primary-500 pl-4 py-2">
                          <div className="font-medium text-gray-900 mb-1">
                            {article.article_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {article.article_content}
                          </div>
                          <div className="flex items-center mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {article.law_type}
                            </span>
                            {article.relevance_score !== undefined && (
                              <span className="text-xs text-green-600 ml-2">
                                相关度: {(article.relevance_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  等待分析
                </h3>
                <p className="text-gray-500">
                  请在左侧输入案情描述并点击"开始智能分析"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
