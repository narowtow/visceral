import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
interface Props {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error) => void
}
export default class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Visceral] Rendering failed:', error, info.componentStack)
    this.props.onError?.(error)
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
