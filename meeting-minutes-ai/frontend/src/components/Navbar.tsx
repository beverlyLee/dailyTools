"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, History, Settings, FileText, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/record",
    label: "录音",
    icon: Mic,
  },
  {
    href: "/pronunciation-coach",
    label: "发音教练",
    icon: Volume2,
  },
  {
    href: "/history",
    label: "历史记录",
    icon: History,
  },
  {
    href: "/settings",
    label: "设置",
    icon: Settings,
  },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold">会议纪要 AI</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
