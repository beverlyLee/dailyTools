import Link from "next/link";
import { Mic, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Mic,
    title: "实时录音",
    description: "一键开始会议录音，实时显示波形图，支持暂停和继续",
  },
  {
    icon: FileText,
    title: "智能转写",
    description: "使用先进的 AI 技术将语音转换为清晰的文字记录",
  },
  {
    icon: Sparkles,
    title: "摘要生成",
    description: "自动提取会议主题、关键决策和行动项，@负责人和截止时间",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
          让会议纪要
          <span className="text-blue-600"> 自动化</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          告别繁琐的手动记录。使用 AI 自动转写会议内容，提取关键决策和行动项，
          让你专注于会议本身。
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/record">
            <Button size="lg" className="text-lg px-8">
              开始会议
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" size="lg" className="text-lg px-8">
              查看历史
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="bg-muted rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">使用方法</h2>
        <ol className="space-y-4 text-lg">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              1
            </span>
            <span>在设置页面配置火山大模型 API Key 并测试连接</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              2
            </span>
            <span>点击「开始会议」，进行录音或手动输入会议内容</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              3
            </span>
            <span>系统自动生成结构化摘要，包括决策、行动项和负责人</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
