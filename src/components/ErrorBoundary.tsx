import { Component, type ReactNode } from 'react'

/** Keeps the page alive if WebGL is unavailable — the 3D layers are decorative. */
export default class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children }
}
