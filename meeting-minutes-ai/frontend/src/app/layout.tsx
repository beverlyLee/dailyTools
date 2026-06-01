import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "会议纪要 AI",
  description: "AI 驱动的会议记录助手，自动转写、摘要和提取行动项",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            <p>会议纪要 AI - 让会议更高效</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
