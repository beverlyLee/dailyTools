"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { settingsApi } from "@/lib/api";
import type { ModelOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Link2,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { config, saveConfig, clearConfig, loaded } = useSettings();

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const loadModels = async () => {
    try {
      const data = await settingsApi.getModels();
      setModels(data.models);
    } catch (err) {
      setModels([
        {
          id: "doubao-seed-1-8-250328",
          name: "豆包 Seed 1.8",
          description: "适合通用对话和文本处理",
        },
      ]);
    }
  };

  useEffect(() => {
    if (loaded) {
      setApiKey(config.apiKey);
      setBaseUrl(config.baseUrl);
      setModel(config.model);
    }
    loadModels();
  }, [loaded, config]);

  const handleSave = () => {
    saveConfig({
      apiKey,
      baseUrl,
      model,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await settingsApi.testConnection({
        apiKey,
        baseUrl,
        model,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: "无法连接到后端服务，请确认后端已启动",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    if (confirm("确定要清除所有配置吗？")) {
      clearConfig();
      setApiKey("");
      setBaseUrl("https://ark.cn-beijing.volces.com/api/v3");
      setModel("doubao-seed-1-8-250328");
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-1">
          配置火山大模型 API 以启用 AI 摘要功能
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            火山大模型配置
          </CardTitle>
          <CardDescription>
            在火山引擎控制台获取 API Key 和端点信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="volc-xxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Base URL
            </Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ark.cn-beijing.volces.com/api/v3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              模型选择
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {model && (
              <p className="text-xs text-muted-foreground">
                {models.find((m) => m.id === model)?.description}
              </p>
            )}
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                testResult.success
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-md text-sm bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>配置已保存</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={testing}>
              保存配置
            </Button>
            <Button onClick={handleTest} variant="outline" disabled={testing || !apiKey.trim()}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                "测试连接"
              )}
            </Button>
            <Button onClick={handleClear} variant="destructive">
              清除配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">📝 配置说明</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm space-y-2">
          <p>
            <strong>1. 获取 API Key：</strong>登录火山引擎控制台 → 智能方舟(Ark) → API Key 管理 → 新建 API Key
          </p>
          <p>
            <strong>2. 获取模型端点：</strong>智能方舟 → 模型推理 → 在线推理 → 创建端点
          </p>
          <p>
            <strong>3. 配置 Base URL：</strong>通常为 https://ark.cn-beijing.volces.com/api/v3
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
