import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

export function formatSimilarity(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function getCaseTypeColor(caseType: string | null): string {
  const colors: Record<string, string> = {
    "合同纠纷": "bg-blue-100 text-blue-800",
    "劳动争议": "bg-purple-100 text-purple-800",
    "交通事故": "bg-orange-100 text-orange-800",
    "民间借贷": "bg-green-100 text-green-800",
    "婚姻家庭": "bg-pink-100 text-pink-800",
    "侵权责任": "bg-red-100 text-red-800",
    "房产纠纷": "bg-yellow-100 text-yellow-800",
    "其他纠纷": "bg-gray-100 text-gray-800",
  };
  
  return colors[caseType || ""] || colors["其他纠纷"];
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    analyzing: "bg-blue-100 text-blue-800",
    analyzed: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
    closed: "bg-gray-100 text-gray-800",
  };
  
  return colors[status] || colors.pending;
}

export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: "待分析",
    analyzing: "分析中",
    analyzed: "已分析",
    completed: "已完成",
    closed: "已关闭",
  };
  
  return texts[status] || "未知";
}

export function getEntityTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    Person: "👤",
    Organization: "🏢",
    Location: "📍",
    Money: "💰",
    Time: "⏰",
  };
  
  return icons[type] || "📄";
}

export function getEntityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    Person: "人物",
    Organization: "机构",
    Location: "地点",
    Money: "金额",
    Time: "时间",
  };
  
  return labels[type] || type;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadAsText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
