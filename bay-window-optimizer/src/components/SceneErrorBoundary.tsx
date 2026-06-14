import { Component, type ErrorInfo, type ReactNode } from 'react'

interface SceneErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface SceneErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    console.error('3D Scene Error Boundary caught an error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          <div className="max-w-md w-full mx-8 bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center text-slate-800 mb-2">3D 场景加载失败</h2>
            <p className="text-sm text-slate-500 text-center mb-4">
              3D 渲染引擎暂时无法正常工作，您仍可使用右侧控制面板调整参数。
            </p>
            {this.state.error && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">错误信息：</p>
                <p className="text-xs text-red-600 font-mono break-words">
                  {this.state.error.message.slice(0, 120)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                🔄 重新加载 3D 场景
              </button>
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <p className="text-xs text-slate-400 text-center">您也可以尝试：</p>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-primary-400">•</span>
                    刷新页面重新初始化
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary-400">•</span>
                    使用控制面板继续操作（功能不受影响）
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
