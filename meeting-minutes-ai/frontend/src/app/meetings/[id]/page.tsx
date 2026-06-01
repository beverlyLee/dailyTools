"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MeetingSummary } from "@/components/MeetingSummary";
import { meetingApi } from "@/lib/api";
import type { Meeting } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: { id: string };
}

export default function MeetingDetailPage({ params }: PageProps) {
  const router = useRouter();
  const meetingId = parseInt(params.id);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const data = await meetingApi.get(meetingId);
      setMeeting(data);
      if (data.transcription) {
        setTranscriptionText(data.transcription);
      }
    } catch (err) {
      setError("获取会议详情失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTranscription = async () => {
    if (!transcriptionText.trim()) return;

    setProcessing(true);
    setError(null);

    try {
      await meetingApi.transcribeText(meetingId, transcriptionText);
      await fetchMeeting();
    } catch (err) {
      setError("保存失败");
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateSummary = async () => {
    setProcessing(true);
    setError(null);

    try {
      await meetingApi.generateSummary(meetingId);
      await fetchMeeting();
    } catch (err) {
      setError("生成摘要失败，请检查 API 配置");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("确定要删除这个会议吗？")) {
      try {
        await meetingApi.delete(meetingId);
        router.push("/history");
      } catch (err) {
        setError("删除失败");
      }
    }
  };

  useEffect(() => {
    fetchMeeting();
  }, [meetingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">会议不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const hasSummary = meeting.topic || meeting.summary || (meeting.decisions?.length ?? 0) > 0 || (meeting.action_items?.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/history")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回历史
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {!hasSummary && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">添加会议内容</CardTitle>
            <CardDescription>
              输入会议内容，然后点击生成摘要
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>会议内容</Label>
              <Textarea
                value={transcriptionText}
                onChange={(e) => setTranscriptionText(e.target.value)}
                placeholder="例如：今天我们决定上线新版本，张三负责测试，李四负责文档，截止周五"
                className="min-h-[150px]"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveTranscription}
                disabled={processing || !transcriptionText.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "保存内容"
                )}
              </Button>

              {meeting.transcription && (
                <Button
                  onClick={handleGenerateSummary}
                  disabled={processing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成 AI 摘要
                </Button>
              )}
            </div>

            <Card className="bg-amber-50/50 border-amber-200 mt-4">
              <CardContent className="py-4">
                <p className="text-amber-700 text-sm">
                  💡 测试输入：
                  <code className="block mt-2 p-2 bg-amber-100 rounded text-amber-900">
                    今天我们决定上线新版本，张三负责测试，李四负责文档，截止周五
                  </code>
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {hasSummary && (
        <MeetingSummary meeting={meeting} />
      )}

      {hasSummary && meeting.transcription && (
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleGenerateSummary}
            disabled={processing}
            variant="outline"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            重新生成摘要
          </Button>
        </div>
      )}
    </div>
  );
}
