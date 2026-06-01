import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '实时翻译板',
  description: '跨国会议实时翻译工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
