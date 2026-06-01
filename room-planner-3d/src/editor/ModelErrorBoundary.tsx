import { Component, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ModelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  private alerted = false

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[room-planner-3d] 模型加载失败，已回退到占位几何体:', error.message)
    if (!this.alerted) {
      this.alerted = true
      alert(
        '模型加载失败，已自动回退到占位几何体。\n' +
        '请检查 /public/models/ 下的 .glb 文件是否存在且格式正确。\n\n' +
        '错误信息: ' + error.message,
      )
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
