"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic,
  User,
  Lightbulb,
  MessageSquare,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import type { Transcript, Recommendation, ConnectionStatus } from "@/types";

interface CopilotSidebarProps {
  transcripts: Transcript[];
  recommendations: Recommendation[];
  connectionStatus: ConnectionStatus;
}

const INTENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  price_concern: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  product_query: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  competitor: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  objection: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  positive: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  unknown: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export function CopilotSidebar({
  transcripts,
  recommendations,
  connectionStatus,
}: CopilotSidebarProps) {
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, recommendations]);

  const latestRecommendation = recommendations[recommendations.length - 1];

  return (
    <div className="flex flex-col h-full border-l bg-gray-50">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-lg">销售助手</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus.connected
                ? "bg-green-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          {connectionStatus.message || "未连接"}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {latestRecommendation && (
          <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                最新推荐
              </span>
              <span className="text-xs text-muted-foreground">
                {latestRecommendation.intentLabel}
              </span>
            </div>
            <div className="space-y-2">
              {latestRecommendation.scripts.map((script, index) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded-lg border border-purple-200 shadow-sm animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {script}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                <span>触发语："{latestRecommendation.trigger}"</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {transcripts.length === 0 && !latestRecommendation && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">开始录音或输入测试文本</p>
              <p className="text-xs mt-1">助手将实时分析并推荐话术</p>
            </div>
          )}

          {transcripts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Mic className="h-3 w-3" />
                对话记录
              </div>
              {transcripts.map((transcript, index) => (
                <div
                  key={transcript.id}
                  className={`flex gap-2 ${index === 0 ? "" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      transcript.speaker === "customer"
                        ? "bg-blue-100"
                        : "bg-green-100"
                    }`}
                  >
                    <User className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {transcript.speaker === "customer" ? "客户" : "销售"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p
                      className={`text-sm p-2 rounded-lg ${
                        transcript.speaker === "customer"
                          ? "bg-blue-50 text-blue-900"
                          : "bg-green-50 text-green-900"
                      }`}
                    >
                      {transcript.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={transcriptsEndRef} />
            </div>
          )}

          {recommendations.length > 1 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Lightbulb className="h-3 w-3" />
                历史推荐
              </div>
              {recommendations
                .slice(0, -1)
                .reverse()
                .slice(0, 5)
                .map((rec) => {
                  const colors =
                    INTENT_COLORS[rec.intent] || INTENT_COLORS.unknown;
                  return (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${colors.text} bg-white/60`}
                        >
                          {rec.intentLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(rec.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {rec.scripts.slice(0, 2).map((script, idx) => (
                          <p key={idx} className="text-xs text-gray-600 line-clamp-2">
                            {idx + 1}. {script}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
