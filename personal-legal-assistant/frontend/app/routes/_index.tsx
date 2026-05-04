import { Link } from "@remix-run/react";
import { Scale, FileText, Search, BookOpen, ArrowRight, CheckCircle } from "lucide-react";
import Layout from "~/components/Layout";

export default function Index() {
  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "智能表单向导",
      description: "多步表单引导您清晰描述案情，智能提示必填信息",
      path: "/wizard",
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "案情智能分析",
      description: "使用HanLP NLP技术识别法律实体、抽取关系、匹配条文",
      path: "/analysis",
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "判例智能检索",
      description: "RAG向量检索技术，快速找到相似判例和法律依据",
      path: "/rag",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "法律文书生成",
      description: "Jinja2模板引擎，一键生成起诉状、合同等法律文书",
      path: "/documents",
    },
  ];

  const caseTypes = [
    "民间借贷纠纷",
    "劳动合同争议",
    "交通事故赔偿",
    "婚姻家庭纠纷",
    "合同违约纠纷",
    "房产交易纠纷",
    "侵权损害赔偿",
    "其他法律问题",
  ];

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
              <Scale className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              普惠法律服务助手
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              面向普通人的智能法律助手，帮您分析案情、检索判例、生成文书，
              让法律不再遥不可及。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/wizard"
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
              >
                开始描述案情
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/rag"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                搜索相似判例
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            我们能帮您解决
          </h2>
          <p className="text-gray-600 text-lg">
            涵盖常见法律纠纷类型，提供专业的法律分析和建议
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {caseTypes.map((type, index) => (
            <div
              key={index}
              className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-700 font-medium">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              核心功能
            </h2>
            <p className="text-gray-600 text-lg">
              智能技术驱动，让法律服务更普惠
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.path}
                className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-xl mb-6 group-hover:bg-primary-600 transition-colors">
                  <div className="text-primary-600 group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="inline-flex items-center text-primary-600 font-medium">
                  开始使用
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好开始了吗？
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            无论您遇到什么法律问题，我们都在这里为您提供帮助。
            只需几步，即可获得专业的法律分析和建议。
          </p>
          <Link
            to="/wizard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
          >
            立即开始
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </Layout>
  );
}
