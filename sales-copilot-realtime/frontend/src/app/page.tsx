"use client";

import { useState, useCallback } from "react";
import { Headphones, Sparkles, Phone } from "lucide-react";
import { AudioCapture } from "@/components/AudioCapture";
import { CopilotSidebar } from "@/components/CopilotSidebar";
import type { Transcript, Recommendation, ConnectionStatus } from "@/types";

export default function Home() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    message: "未连接",
  });

  const handleTranscript = useCallback((transcript: Transcript) => {
    setTranscripts((prev) => [...prev, transcript]);
  }, []);

  const handleRecommendation = useCallback((recommendation: Recommendation) => {
    setRecommendations((prev) => [...prev, recommendation]);
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">销售助手</h1>
                <p className="text-sm text-muted-foreground">
                  实时识别客户意图，智能推荐应对话术
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Headphones className="h-4 w-4" />
                <span>实时模式</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <div>
                    <h2 className="font-semibold text-lg">通话控制</h2>
                    <p className="text-sm text-muted-foreground">
                      开始录音或使用测试模式进行验证
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <AudioCapture
                  onTranscript={handleTranscript}
                  onRecommendation={handleRecommendation}
                  onStatus={handleStatusChange}
                />
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {recommendations.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      推荐次数
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {transcripts.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      对话记录
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {connectionStatus.connected ? "在线" : "离线"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      连接状态
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-900">验证方法</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    点击"试：太贵了"按钮，或手动输入"太贵了"并发送。系统应在 1-2 秒内推荐 3 条应对话术。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="w-96 flex-shrink-0">
        <CopilotSidebar
          transcripts={transcripts}
          recommendations={recommendations}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
}
