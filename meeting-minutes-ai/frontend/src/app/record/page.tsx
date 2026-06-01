"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RecordingControl } from "@/components/RecordingControl";
import { meetingApi } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function RecordPage() {
  const router = useRouter();
  const { config, loaded } = useSettings();
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const hasSettings = loaded && config.apiKey.trim().length > 0;

  const createMeeting = async () => {
    setCreating(true);
    setError(null);

    try {
      const meeting = await meetingApi.create({
        title: meetingTitle || undefined,
      });
      setMeetingId(meeting.id);
    } catch (err) {
      setError("创建会议失败，请检查后端服务是否运行");
    } finally {
      setCreating(false);
    }
  };

  const handleTranscriptionComplete = () => {
    if (meetingId) {
      router.push(`/meetings/${meetingId}`);
    }
  };

  useEffect(() => {
    if (loaded && !config.apiKey.trim()) {
      router.push("/settings");
    }
  }, [loaded, config.apiKey, router]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasSettings) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>开始会议</CardTitle>
          <CardDescription>
            输入会议标题（可选），然后点击创建会议开始录音
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!meetingId ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">会议标题</Label>
                <Input
                  id="title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="例如：产品迭代周会"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button onClick={createMeeting} disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建会议"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center text-muted-foreground">
                会议已创建，会议 ID: <span className="font-mono text-foreground">{meetingId}</span>
              </div>

              <RecordingControl
                meetingId={meetingId}
                onTranscriptionComplete={handleTranscriptionComplete}
              />

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/meetings/${meetingId}`)}
                >
                  跳过录音，手动输入
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-amber-50/50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800">💡 测试提示</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 text-sm">
            点击「手动输入文本」，输入测试内容：
          </p>
          <code className="block mt-2 p-3 bg-amber-100 rounded text-amber-900 text-sm">
            今天我们决定上线新版本，张三负责测试，李四负责文档，截止周五
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
