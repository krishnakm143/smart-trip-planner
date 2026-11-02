import { Component } from 'react'

/**
 * React Error Boundary – catches render-time errors in its subtree and
 * shows a friendly fallback UI instead of a blank / broken page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console in development; replace with a real error reporting
    // service (e.g. Sentry) in production by checking import.meta.env.PROD.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-ui, system-ui, sans-serif)',
          }}
        >
          <p
            style={{
              fontSize: '3rem',
              lineHeight: 1,
              margin: '0 0 1rem',
            }}
            aria-hidden="true"
          >
            🗺️
          </p>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              margin: '0 0 0.5rem',
              color: 'var(--ink, #1b2a2b)',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: 'var(--ink-soft, #4b595a)',
              maxWidth: '32rem',
              marginBottom: '1.5rem',
            }}
          >
            An unexpected error occurred in this part of the page. You can try
            reloading or go back to the home page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'var(--accent, #0e5e5a)',
                color: 'var(--on-accent, #fbf8f1)',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9375rem',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.5rem 1.25rem',
                background: 'transparent',
                color: 'var(--ink, #1b2a2b)',
                border: '1px solid var(--line, #d6ccb9)',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details
              style={{
                marginTop: '2rem',
                textAlign: 'left',
                maxWidth: '48rem',
                fontSize: '0.8125rem',
                color: '#64748b',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error details (development only)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
