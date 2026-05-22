'use client'

import { Component, type ReactNode } from 'react'
import Button from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 rounded-full bg-red-100 p-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-gray-600">
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-6 w-full max-w-2xl rounded-lg bg-gray-50 p-4 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Error details (development only)
              </summary>
              <pre className="mt-2 overflow-auto text-xs text-red-600">
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <Button onClick={this.reset} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Wrap components with error boundary for graceful error handling
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export default ErrorBoundary
