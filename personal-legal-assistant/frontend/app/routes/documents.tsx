import { useState } from "react";
import { FileText, Copy, Download, AlertCircle, ChevronRight, Check, FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import Layout from "~/components/Layout";
import { documentApi } from "~/lib/api";
import type { Template, GeneratedDocument } from "~/lib/api";
import { truncateText, copyToClipboard, downloadAsText } from "~/lib/utils";

export default function DocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<Record<string, unknown>>({
    defaultValues: {},
  });

  const loadTemplates = async () => {
    try {
      const response = await documentApi.listTemplates();
      setTemplates(response.data.templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    try {
      const response = await documentApi.generate({
        template_name: selectedTemplate.template_file,
        context: data,
      });
      setGeneratedDocument(response.data);
    } catch (error) {
      console.error("Failed to generate document:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDocument = () => {
    if (generatedDocument) {
      copyToClipboard(generatedDocument.content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleDownloadDocument = () => {
    if (generatedDocument) {
      downloadAsText(generatedDocument.content, `${generatedDocument.document_name}.txt`);
    }
  };

  const handleDownloadWordDocument = async () => {
    if (!selectedTemplate) return;
    
    setIsGeneratingWord(true);
    try {
      const formData = watch();
      const blob = await documentApi.generateWord({
        template_name: selectedTemplate.template_file,
        context: formData,
        document_name: generatedDocument?.document_name,
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = generatedDocument?.document_name || "法律文书";
      link.setAttribute("download", `${filename}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate Word document:", error);
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setGeneratedDocument(null);
    reset();
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setGeneratedDocument(null);
    reset();
  };

  if (templates.length === 0) {
    loadTemplates();
  }

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case "诉讼文书": return "⚖️";
      case "合同文书": return "📄";
      case "商务文书": return "💼";
      case "授权文书": return "📋";
      default: return "📄";
    }
  };

  const getTemplateCategoryColor = (category: string) => {
    switch (category) {
      case "诉讼文书": return "bg-red-50 border-red-200 text-red-800";
      case "合同文书": return "bg-blue-50 border-blue-200 text-blue-800";
      case "商务文书": return "bg-amber-50 border-amber-200 text-amber-800";
      case "授权文书": return "bg-green-50 border-green-200 text-green-800";
      default: return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">法律文书生成</h1>
              <p className="text-slate-300 mt-1">
                选择文书模板，填写相关信息，一键生成专业的法律文书（支持 Word 文档下载）
              </p>
            </div>
          </div>
        </div>

        {!selectedTemplate ? (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-6 bg-blue-600 rounded mr-3"></span>
                选择文书类型
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.template_file}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-6 hover:shadow-lg hover:border-blue-300 transition-all text-left border-2 rounded-xl bg-white ${getTemplateCategoryColor(template.category)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl">
                        {getTemplateIcon(template.category)}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 bg-white/50 rounded-full border">
                        {template.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center text-blue-600 text-sm font-medium hover:text-blue-700">
                      开始使用
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">使用提示</h4>
                  <div className="grid md:grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      根据您的需求选择合适的文书模板
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      填写模板所需的相关信息，带 * 号为必填项
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      点击"生成文书"即可获得格式化的法律文书
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      可下载 Word 文档（.docx 格式）
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : generatedDocument ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToTemplates}
                className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
              >
                <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                返回模板选择
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyDocument}
                  className="btn btn-outline flex items-center"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" />已复制</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" />复制</>
                  )}
                </button>
                <button
                  onClick={handleDownloadDocument}
                  className="btn btn-outline flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载 TXT
                </button>
                <button
                  onClick={handleDownloadWordDocument}
                  disabled={isGeneratingWord}
                  className="btn btn-primary flex items-center bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingWord ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" />下载 Word 文档</>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {generatedDocument.document_name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      文书类型: {generatedDocument.document_type}
                    </p>
                  </div>
                  <div className="text-4xl">
                    {getTemplateIcon(generatedDocument.document_type)}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white">
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 text-base leading-7 p-6 bg-gray-50 rounded-lg border border-gray-100">
                    {generatedDocument.content}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={() => {
                  setGeneratedDocument(null);
                }}
                className="btn btn-outline"
              >
                修改信息重新生成
              </button>
              <button
                onClick={handleBackToTemplates}
                className="btn btn-primary"
              >
                选择其他模板
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleBackToTemplates}
              className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium mb-6"
            >
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
              返回模板选择
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="text-4xl mr-4">
                    {getTemplateIcon(selectedTemplate.category)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedTemplate.description}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${getTemplateCategoryColor(selectedTemplate.category)}`}>
                      {selectedTemplate.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <FileCheck className="w-5 h-5 mr-2" />
                      请填写以下信息（带 <span className="text-red-500 mx-1">*</span> 为必填项）
                    </h3>
                    <p className="text-sm text-blue-700">
                      填写完整信息后，系统将为您生成标准格式的法律文书，并支持下载 Word 文档。
                    </p>
                  </div>
                  
                  {selectedTemplate.template_file === "complaint_template.jinja2" && (
                    <>
                      <div className="border-l-4 border-blue-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">原告信息</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div>
                          <label className="label">姓名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入原告姓名"
                            {...register("plaintiff_name", { required: "请输入原告姓名" })}
                          />
                        </div>
                        <div>
                          <label className="label">性别</label>
                          <select className="select" {...register("plaintiff_gender")}>
                            <option value="男">男</option>
                            <option value="女">女</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">出生日期</label>
                          <input
                            type="date"
                            className="input"
                            {...register("plaintiff_birth_date")}
                          />
                        </div>
                        <div>
                          <label className="label">民族</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="汉族"
                            {...register("plaintiff_ethnicity")}
                          />
                        </div>
                        <div>
                          <label className="label">职业</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入职业"
                            {...register("plaintiff_occupation")}
                          />
                        </div>
                        <div>
                          <label className="label">联系电话</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="请输入联系电话"
                            {...register("plaintiff_phone")}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">住址 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入详细住址"
                            {...register("plaintiff_address", { required: "请输入原告住址" })}
                          />
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">被告信息</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div>
                          <label className="label">姓名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入被告姓名"
                            {...register("defendant_name", { required: "请输入被告姓名" })}
                          />
                        </div>
                        <div>
                          <label className="label">性别</label>
                          <select className="select" {...register("defendant_gender")}>
                            <option value="男">男</option>
                            <option value="女">女</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">出生日期</label>
                          <input
                            type="date"
                            className="input"
                            {...register("defendant_birth_date")}
                          />
                        </div>
                        <div>
                          <label className="label">民族</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="汉族"
                            {...register("defendant_ethnicity")}
                          />
                        </div>
                        <div>
                          <label className="label">职业</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入职业"
                            {...register("defendant_occupation")}
                          />
                        </div>
                        <div>
                          <label className="label">联系电话</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="请输入联系电话"
                            {...register("defendant_phone")}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">住址 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入详细住址"
                            {...register("defendant_address", { required: "请输入被告住址" })}
                          />
                        </div>
                      </div>

                      <div className="border-l-4 border-amber-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">案件信息</h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="label">案由 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="如：民间借贷纠纷、买卖合同纠纷"
                            {...register("cause_of_action", { required: "请输入案由" })}
                          />
                        </div>
                        <div>
                          <label className="label">诉讼请求 <span className="text-red-500">*</span></label>
                          <textarea
                            className="textarea min-h-[120px]"
                            placeholder="请逐条列出您的诉讼请求，例如：&#10;1. 判令被告偿还借款本金人民币100,000元&#10;2. 判令被告支付借款利息&#10;3. 判令被告承担本案诉讼费用"
                            {...register("claims", { required: "请输入诉讼请求" })}
                          />
                        </div>
                        <div>
                          <label className="label">事实与理由 <span className="text-red-500">*</span></label>
                          <textarea
                            className="textarea min-h-[200px]"
                            placeholder="请详细描述案件事实和您的理由..."
                            {...register("facts_and_reasons", { required: "请输入事实与理由" })}
                          />
                        </div>
                        <div>
                          <label className="label">证据材料</label>
                          <textarea
                            className="textarea min-h-[100px]"
                            placeholder="请列出您拥有的证据材料，如借条、合同、聊天记录、转账凭证等..."
                            {...register("evidence_list")}
                          />
                        </div>
                        <div>
                          <label className="label">受理法院 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="如：北京市朝阳区人民法院"
                            {...register("court_name", { required: "请输入受理法院" })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {selectedTemplate.template_file === "contract_template.jinja2" && (
                    <>
                      <div className="border-l-4 border-blue-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">甲方（出借人）信息</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div>
                          <label className="label">姓名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入出借人姓名"
                            {...register("party_a_name", { required: "请输入出借人姓名" })}
                          />
                        </div>
                        <div>
                          <label className="label">住址</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入住址"
                            {...register("party_a_address")}
                          />
                        </div>
                        <div>
                          <label className="label">联系电话</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="请输入联系电话"
                            {...register("party_a_contact")}
                          />
                        </div>
                        <div>
                          <label className="label">身份证号</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入身份证号"
                            {...register("party_a_id_number")}
                          />
                        </div>
                      </div>

                      <div className="border-l-4 border-red-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">乙方（借款人）信息</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div>
                          <label className="label">姓名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入借款人姓名"
                            {...register("party_b_name", { required: "请输入借款人姓名" })}
                          />
                        </div>
                        <div>
                          <label className="label">住址</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入住址"
                            {...register("party_b_address")}
                          />
                        </div>
                        <div>
                          <label className="label">联系电话</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="请输入联系电话"
                            {...register("party_b_contact")}
                          />
                        </div>
                        <div>
                          <label className="label">身份证号</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="请输入身份证号"
                            {...register("party_b_id_number")}
                          />
                        </div>
                      </div>

                      <div className="border-l-4 border-amber-500 pl-4 mb-6">
                        <h4 className="font-bold text-gray-900 text-lg">借款详情</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">合同编号</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="如：JK2024001"
                            {...register("contract_number")}
                          />
                        </div>
                        <div>
                          <label className="label">借款金额（元） <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            className="input"
                            placeholder="请输入借款金额"
                            {...register("principal_amount", { required: "请输入借款金额" })}
                          />
                        </div>
                        <div>
                          <label className="label">年利率（如 0.154 表示 15.4%）</label>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            placeholder="0.154"
                            {...register("interest_rate")}
                          />
                        </div>
                        <div>
                          <label className="label">借款期限</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="如：6个月、1年"
                            {...register("borrowing_term")}
                          />
                        </div>
                        <div>
                          <label className="label">借款起始日期</label>
                          <input
                            type="date"
                            className="input"
                            {...register("start_date")}
                          />
                        </div>
                        <div>
                          <label className="label">借款到期日期</label>
                          <input
                            type="date"
                            className="input"
                            {...register("end_date")}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">借款用途</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="如：资金周转、购房、创业"
                            {...register("purpose")}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">还款方式</label>
                          <textarea
                            className="textarea min-h-[80px]"
                            placeholder="如：到期一次性还本付息、按月付息到期还本等"
                            {...register("repayment_method")}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(selectedTemplate.template_file === "claim_letter_template.jinja2" || selectedTemplate.template_file === "power_of_attorney_template.jinja2") && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">模板开发中</h4>
                      <p className="text-gray-500">
                        该模板的表单字段正在开发中，请先选择"民事起诉状"或"借款合同"模板使用。
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 -mx-6 -mb-6 rounded-b-xl">
                  <button
                    type="button"
                    onClick={handleBackToTemplates}
                    className="btn btn-outline"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="btn btn-primary bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        生成中...
                      </>
                    ) : (
                      "生成文书"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
