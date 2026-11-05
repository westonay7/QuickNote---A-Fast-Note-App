import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from './ui'

interface Props {
  children: ReactNode
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}
interface State {
  error: Error | null
}

/** App-level error boundary — keeps one broken screen from blanking the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Development-only diagnostics. Never log note contents or tokens.
    if (import.meta.env.DEV) {
      console.error('[QuickNote] render error:', error.message, info.componentStack)
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) {
      return this.props.fallback(this.state.error, () => this.setState({ error: null }))
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 dark:bg-canvas-dark">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            QuickNote hit an unexpected error. Your saved notes are safe — try reloading the page.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reload
            </Button>
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
