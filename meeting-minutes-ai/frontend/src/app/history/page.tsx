"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { meetingApi } from "@/lib/api";
import type { Meeting } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, FileText, Clock, Users, Plus, Trash2 } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingApi.list();
      setMeetings(data);
    } catch (err) {
      console.error("加载历史记录失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个会议吗？")) return;

    try {
      setDeleting(id);
      await meetingApi.delete(id);
      await fetchMeetings();
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">历史记录</h1>
          <p className="text-muted-foreground mt-1">
            共 {meetings.length} 条会议记录
          </p>
        </div>
        <Link href="/record">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建会议
          </Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无会议记录</h3>
            <p className="text-muted-foreground mb-6">
              开始您的第一次会议记录吧
            </p>
            <Link href="/record">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建会议
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onDelete={handleDelete}
              deleting={deleting === meeting.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  onDelete,
  deleting,
}: {
  meeting: Meeting;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const router = useRouter();
  const hasSummary = meeting.topic || meeting.summary;
  const actionItemsCount = meeting.action_items?.length ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg cursor-pointer hover:text-blue-600" onClick={() => router.push(`/meetings/${meeting.id}`)}>
            {meeting.title}
          </CardTitle>
          {hasSummary && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
              已摘要
            </span>
          )}
        </div>
        <CardDescription className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(meeting.created_at)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {meeting.topic && (
          <div className="text-sm">
            <span className="text-muted-foreground">主题：</span>
            <span className="font-medium">{meeting.topic}</span>
          </div>
        )}

        {meeting.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {meeting.summary}
          </p>
        )}

        {actionItemsCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-amber-600">
            <Users className="h-4 w-4" />
            <span>{actionItemsCount} 个待办事项</span>
          </div>
        )}

        {!hasSummary && !meeting.transcription && (
          <p className="text-sm text-muted-foreground">
            会议内容为空，点击查看添加内容
          </p>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/meetings/${meeting.id}`)}
        >
          查看详情
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(meeting.id)}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
