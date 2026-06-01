import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '老人居家安全声音监护系统',
  description: '独居老人突发意外求助系统 - 实时声音监测与告警通知',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#030712',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '老人安全监护',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
