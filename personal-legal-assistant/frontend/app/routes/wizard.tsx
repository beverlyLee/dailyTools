import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { FileText, Users, AlertCircle } from "lucide-react";
import Layout from "~/components/Layout";
import MultiStepWizard, { WizardStep } from "~/components/MultiStepWizard";
import CaseTypeSelector from "~/components/CaseTypeSelector";
import { caseApi, analysisApi } from "~/lib/api";
import type { AnalysisResult } from "~/lib/api";
import { getCaseTypeColor, truncateText } from "~/lib/utils";

interface Party {
  name: string;
  gender: string;
  birth_date: string;
  ethnicity: string;
  occupation: string;
  address: string;
  phone: string;
}

interface EvidenceItem {
  name: string;
  description: string;
}

interface FormState {
  case_type: string | null;
  plaintiff: Party;
  defendant: Party;
  incident_date: string;
  incident_location: string;
  amount: string;
  description: string;
  demands: string;
  evidence: EvidenceItem[];
}

const initialParty: Party = {
  name: "",
  gender: "男",
  birth_date: "",
  ethnicity: "汉族",
  occupation: "",
  address: "",
  phone: "",
};

const initialFormState: FormState = {
  case_type: null,
  plaintiff: { ...initialParty },
  defendant: { ...initialParty },
  incident_date: "",
  incident_location: "",
  amount: "",
  description: "",
  demands: "",
  evidence: [{ name: "", description: "" }],
};

export default function WizardPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateCaseType = (value: string | null) => {
    setFormData((prev) => ({ ...prev, case_type: value }));
  };

  const updatePlaintiff = (field: keyof Party, value: string) => {
    setFormData((prev) => ({
      ...prev,
      plaintiff: { ...prev.plaintiff, [field]: value },
    }));
  };

  const updateDefendant = (field: keyof Party, value: string) => {
    setFormData((prev) => ({
      ...prev,
      defendant: { ...prev.defendant, [field]: value },
    }));
  };

  const updateCaseDetail = (
    field: "incident_date" | "incident_location" | "amount" | "description" | "demands",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEvidence = (index: number, field: keyof EvidenceItem, value: string) => {
    setFormData((prev) => {
      const newEvidence = [...prev.evidence];
      newEvidence[index] = { ...newEvidence[index], [field]: value };
      return { ...prev, evidence: newEvidence };
    });
  };

  const addEvidenceItem = () => {
    setFormData((prev) => ({
      ...prev,
      evidence: [...prev.evidence, { name: "", description: "" }],
    }));
  };

  const removeEvidenceItem = (index: number) => {
    if (formData.evidence.length > 1) {
      setFormData((prev) => ({
        ...prev,
        evidence: prev.evidence.filter((_, i) => i !== index),
      }));
    }
  };

  const runAnalysis = async () => {
    if (!formData.description) return;

    setIsAnalyzing(true);
    try {
      const response = await analysisApi.analyze(formData.description);
      setAnalysisResult(response.data);
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFullDescription = (): string => {
    let description = formData.description || "";

    if (formData.case_type) {
      description = `案件类型：${formData.case_type}\n\n` + description;
    }

    if (formData.plaintiff.name || formData.defendant.name) {
      description += `\n\n当事人信息：\n`;
      if (formData.plaintiff.name) {
        description += `原告：${formData.plaintiff.name}（${formData.plaintiff.gender}，${formData.plaintiff.occupation}）\n`;
      }
      if (formData.defendant.name) {
        description += `被告：${formData.defendant.name}（${formData.defendant.gender}，${formData.defendant.occupation}）\n`;
      }
    }

    if (formData.amount) {
      description += `\n涉及金额：${formData.amount}元`;
    }

    if (formData.demands) {
      description += `\n\n诉讼请求：\n${formData.demands}`;
    }

    return description;
  };

  const handleComplete = async () => {
    try {
      const fullDescription = generateFullDescription();

      const caseResponse = await caseApi.create({
        title: `${formData.case_type || "法律纠纷"} - ${formData.plaintiff.name || "原告"}诉${formData.defendant.name || "被告"}`,
        description: fullDescription,
        case_type: formData.case_type || undefined,
      });

      await analysisApi.analyze(fullDescription, caseResponse.data.id);

      navigate(`/analysis?caseId=${caseResponse.data.id}`);
    } catch (error) {
      console.error("Error saving case:", error);
    }
  };

  const steps: WizardStep[] = [
    {
      id: "case-type",
      title: "案件类型",
      icon: <FileText className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900">提示</h4>
                <p className="text-sm text-blue-700 mt-1">
                  请选择您遇到的法律纠纷类型，我们将为您提供针对性的法律服务。
                </p>
              </div>
            </div>
          </div>

          <CaseTypeSelector
            value={formData.case_type}
            onChange={updateCaseType}
          />
        </div>
      ),
      isValid: () => !!formData.case_type,
    },
    {
      id: "parties",
      title: "当事人信息",
      icon: <Users className="w-6 h-6" />,
      component: (
        <div className="space-y-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-6 bg-blue-600 rounded mr-3"></span>
              原告信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入原告姓名"
                  value={formData.plaintiff.name}
                  onChange={(e) => updatePlaintiff("name", e.target.value)}
                />
              </div>
              <div>
                <label className="label">性别</label>
                <select
                  className="select"
                  value={formData.plaintiff.gender}
                  onChange={(e) => updatePlaintiff("gender", e.target.value)}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="label">出生日期</label>
                <input
                  type="date"
                  className="input"
                  value={formData.plaintiff.birth_date}
                  onChange={(e) => updatePlaintiff("birth_date", e.target.value)}
                />
              </div>
              <div>
                <label className="label">民族</label>
                <input
                  type="text"
                  className="input"
                  placeholder="汉族"
                  value={formData.plaintiff.ethnicity}
                  onChange={(e) => updatePlaintiff("ethnicity", e.target.value)}
                />
              </div>
              <div>
                <label className="label">职业</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入职业"
                  value={formData.plaintiff.occupation}
                  onChange={(e) => updatePlaintiff("occupation", e.target.value)}
                />
              </div>
              <div>
                <label className="label">联系电话</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="请输入联系电话"
                  value={formData.plaintiff.phone}
                  onChange={(e) => updatePlaintiff("phone", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">住址</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入详细住址"
                  value={formData.plaintiff.address}
                  onChange={(e) => updatePlaintiff("address", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-6 bg-red-600 rounded mr-3"></span>
              被告信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入被告姓名"
                  value={formData.defendant.name}
                  onChange={(e) => updateDefendant("name", e.target.value)}
                />
              </div>
              <div>
                <label className="label">性别</label>
                <select
                  className="select"
                  value={formData.defendant.gender}
                  onChange={(e) => updateDefendant("gender", e.target.value)}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="label">出生日期</label>
                <input
                  type="date"
                  className="input"
                  value={formData.defendant.birth_date}
                  onChange={(e) => updateDefendant("birth_date", e.target.value)}
                />
              </div>
              <div>
                <label className="label">民族</label>
                <input
                  type="text"
                  className="input"
                  placeholder="汉族"
                  value={formData.defendant.ethnicity}
                  onChange={(e) => updateDefendant("ethnicity", e.target.value)}
                />
              </div>
              <div>
                <label className="label">职业</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入职业"
                  value={formData.defendant.occupation}
                  onChange={(e) => updateDefendant("occupation", e.target.value)}
                />
              </div>
              <div>
                <label className="label">联系电话</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="请输入联系电话"
                  value={formData.defendant.phone}
                  onChange={(e) => updateDefendant("phone", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">住址</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入详细住址"
                  value={formData.defendant.address}
                  onChange={(e) => updateDefendant("address", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      ),
      isValid: () => !!formData.plaintiff.name && !!formData.defendant.name,
    },
    {
      id: "case-details",
      title: "案情详情",
      icon: <FileText className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-6 bg-amber-600 rounded mr-3"></span>
              基本信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">事发日期</label>
                <input
                  type="date"
                  className="input"
                  value={formData.incident_date}
                  onChange={(e) => updateCaseDetail("incident_date", e.target.value)}
                />
              </div>
              <div>
                <label className="label">事发地点</label>
                <input
                  type="text"
                  className="input"
                  placeholder="请输入事发地点"
                  value={formData.incident_location}
                  onChange={(e) => updateCaseDetail("incident_location", e.target.value)}
                />
              </div>
              <div>
                <label className="label">涉及金额（元）</label>
                <input
                  type="number"
                  className="input"
                  placeholder="请输入金额"
                  value={formData.amount}
                  onChange={(e) => updateCaseDetail("amount", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-6 bg-green-600 rounded mr-3"></span>
              案情描述
              <span className="ml-auto">
                <button
                  type="button"
                  onClick={runAnalysis}
                  disabled={!formData.description || isAnalyzing}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-medium"
                >
                  {isAnalyzing ? "🔍 分析中..." : "🤖 智能分析"}
                </button>
              </span>
            </h3>
            <textarea
              className="textarea min-h-[200px]"
              placeholder="请详细描述您遇到的法律问题，包括事件经过、您的诉求等..."
              value={formData.description}
              onChange={(e) => updateCaseDetail("description", e.target.value)}
            />
            {formData.description && formData.description.length < 20 && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                案情描述至少20字（当前：{formData.description.length}字）
              </p>
            )}
          </div>

          {analysisResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                智能分析结果
              </h4>

              {analysisResult.case_type && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-green-800">案件类型：</span>
                  <span
                    className={
                      getCaseTypeColor(analysisResult.case_type) +
                      " px-3 py-1 rounded-full text-sm ml-2 font-medium"
                    }
                  >
                    {analysisResult.case_type}
                  </span>
                </div>
              )}

              {analysisResult.entities && analysisResult.entities.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-green-800">识别到的实体：</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysisResult.entities.slice(0, 5).map((entity, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-green-300 text-green-800 px-3 py-1 rounded text-sm"
                      >
                        {entity.text} <span className="text-green-600">({entity.type})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.legal_articles && analysisResult.legal_articles.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-green-800">相关法律条文：</span>
                  <div className="mt-2 space-y-2">
                    {analysisResult.legal_articles.slice(0, 3).map((article, idx) => (
                      <div key={idx} className="bg-white rounded p-3 text-sm border border-green-100">
                        <span className="font-semibold text-green-800">{article.article_name}</span>
                        <p className="text-green-700 text-xs mt-1">
                          {truncateText(article.article_content, 120)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-2 h-6 bg-purple-600 rounded mr-3"></span>
              诉讼请求
            </h3>
            <textarea
              className="textarea min-h-[100px]"
              placeholder="请描述您希望通过法律途径实现的目标，如：要求被告偿还借款本金及利息..."
              value={formData.demands}
              onChange={(e) => updateCaseDetail("demands", e.target.value)}
            />
          </div>
        </div>
      ),
      isValid: () =>
        !!formData.description &&
        formData.description.length >= 20,
    },
    {
      id: "evidence",
      title: "证据材料",
      icon: <FileText className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900">提示</h4>
                <p className="text-sm text-amber-700 mt-1">
                  请列出您拥有的证据材料，如借条、合同、聊天记录、转账凭证等。证据越充分，越有助于您维护合法权益。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {formData.evidence.map((item, index) => (
              <div key={index} className="card p-5">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-800">
                    📄 证据 {index + 1}
                  </span>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeEvidenceItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">证据名称</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="如：借条、合同、转账记录"
                      value={item.name}
                      onChange={(e) => updateEvidence(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">证据说明</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="简要说明该证据的内容和作用"
                      value={item.description}
                      onChange={(e) => updateEvidence(index, "description", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEvidenceItem}
            className="btn btn-outline w-full border-dashed border-2 hover:bg-gray-50"
          >
            + 添加证据
          </button>
        </div>
      ),
      isValid: () => true,
    },
  ];

  return (
    <Layout>
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">📋 案情表单向导</h1>
            <p className="text-blue-100">
              请按步骤填写您的案情信息，我们将为您提供智能分析和法律建议。
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <MultiStepWizard steps={steps} onComplete={handleComplete} />
        </div>
      </div>
    </Layout>
  );
}
