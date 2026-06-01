"use client";

import type { Meeting, ActionItem } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";

interface MeetingSummaryProps {
  meeting: Meeting;
}

function getPriorityColor(priority?: string) {
  switch (priority?.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
}

function getPriorityLabel(priority?: string) {
  switch (priority?.toLowerCase()) {
    case "high":
      return "高优先级";
    case "medium":
      return "中优先级";
    case "low":
      return "低优先级";
    default:
      return "普通";
  }
}

export function MeetingSummary({ meeting }: MeetingSummaryProps) {
  const decisions = meeting.decisions || [];
  const actionItems = meeting.action_items || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                创建于 {formatDate(meeting.created_at)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {meeting.topic && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-700">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-lg">会议主题</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-blue-900 font-medium">{meeting.topic}</p>
          </CardContent>
        </Card>
      )}

      {meeting.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">会议总结</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {meeting.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {decisions.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <CardTitle className="text-lg">关键决策</CardTitle>
              <span className="ml-auto text-sm font-normal text-green-600">
                共 {decisions.length} 项
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {decisions.map((decision, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-green-900">{decision}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {actionItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">待办事项</CardTitle>
              <span className="ml-auto text-sm font-normal text-amber-600">
                共 {actionItems.length} 项
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actionItems.map((item, index) => (
                <ActionItemCard key={index} item={item} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {meeting.transcription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">原始转录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {meeting.transcription}
            </p>
          </CardContent>
        </Card>
      )}

      {!meeting.topic &&
        !meeting.summary &&
        decisions.length === 0 &&
        actionItems.length === 0 &&
        !meeting.transcription && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                该会议还没有生成摘要，请先添加会议内容。
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

function ActionItemCard({ item, index }: { item: ActionItem; index: number }) {
  return (
    <div className="bg-white rounded-lg border border-amber-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-medium">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-900">{item.task}</p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {item.assignee && (
                <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium">
                    {item.assignee.startsWith("@")
                      ? item.assignee
                      : `@${item.assignee}`}
                  </span>
                </div>
              )}

              {item.deadline && (
                <div className="flex items-center gap-1.5 text-sm text-red-700 bg-red-100 px-3 py-1 rounded-full">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{item.deadline}</span>
                </div>
              )}

              <div
                className={`text-xs px-2.5 py-1 rounded-full border ${getPriorityColor(
                  item.priority
                )}`}
              >
                {getPriorityLabel(item.priority)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
