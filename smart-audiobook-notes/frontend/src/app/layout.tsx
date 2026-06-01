import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Audiobook Notes",
  description: "智能有声书笔记生成系统 - 解决长音频信息密度低、回顾困难的痛点",
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
          <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Smart Audiobook Notes</h1>
                    <p className="text-sm text-gray-500">智能有声书笔记生成系统</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t border-gray-200 py-6">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
              <p>Smart Audiobook Notes - 让长音频回顾更高效</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
