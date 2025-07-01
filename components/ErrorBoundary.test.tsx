import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('does not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Working component</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Working component')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    })

    it('calls custom error handler when provided', () => {
      const mockErrorHandler = vi.fn()
      
      render(
        <ErrorBoundary onError={mockErrorHandler}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })

    it('stores error details in localStorage', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      expect(storedErrors).toHaveLength(1)
      expect(storedErrors[0]).toEqual(
        expect.objectContaining({
          message: 'Test error message',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      )
    })

    it('limits stored errors to 10 entries', () => {
      // Pre-fill localStorage with 10 errors
      const existingErrors = Array.from({ length: 10 }, (_, i) => ({
        message: `Error ${i}`,
        timestamp: new Date().toISOString(),
        userAgent: 'test',
        url: 'test'
      }))
      localStorage.setItem('app_errors', JSON.stringify(existingErrors))

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      expect(storedErrors).toHaveLength(10)
      expect(storedErrors[9].message).toBe('Test error message')
      expect(storedErrors[0].message).toBe('Error 1') // First error was removed
    })
  })

  describe('User Interactions', () => {
    it('resets error state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(tryAgainButton)

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('reloads page when Reload Page is clicked', () => {
      // Mock window.location.reload
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /reload page/i })
      fireEvent.click(reloadButton)

      expect(mockReload).toHaveBeenCalledTimes(1)
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Development Mode', () => {
    beforeEach(() => {
      // Mock development environment
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('shows error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
      
      // Click to expand details
      fireEvent.click(screen.getByText('Error Details (Development)'))
      
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })
  })

  describe('Error Recovery', () => {
    it('allows recovery after error is fixed', () => {
      let shouldThrow = true
      
      const TestComponent = () => (
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )

      const { rerender } = render(<TestComponent />)

      // Error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the error and try again
      shouldThrow = false
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      rerender(<TestComponent />)

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      const reloadButton = screen.getByRole('button', { name: /reload page/i })

      expect(tryAgainButton).toBeInTheDocument()
      expect(reloadButton).toBeInTheDocument()
    })

    it('maintains keyboard navigation', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      const reloadButton = screen.getByRole('button', { name: /reload page/i })

      tryAgainButton.focus()
      expect(tryAgainButton).toHaveFocus()

      // Tab to next button
      fireEvent.keyDown(tryAgainButton, { key: 'Tab' })
      reloadButton.focus()
      expect(reloadButton).toHaveFocus()
    })
  })
})