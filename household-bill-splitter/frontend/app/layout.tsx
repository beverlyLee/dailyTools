import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Household Bill Splitter',
  description: '智能家庭/合租账单分摊与结算系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-primary-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold">
                    账单分摊系统
                  </Link>
                </div>
                <div className="flex space-x-4">
                  <Link 
                    href="/" 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    首页
                  </Link>
                  <Link 
                    href="/bills" 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    账单管理
                  </Link>
                  <Link 
                    href="/ocr" 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    OCR识别
                  </Link>
                  <Link 
                    href="/split" 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    分摊计算
                  </Link>
                  <Link 
                    href="/settlement" 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    债务清算
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
