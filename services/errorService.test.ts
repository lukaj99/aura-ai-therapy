import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorService, ErrorType, ErrorSeverity } from './errorService'

describe('ErrorService', () => {
  let errorService: ErrorService

  beforeEach(() => {
    errorService = ErrorService.getInstance()
    localStorage.clear()
    // Clear any existing error handlers
    errorService.unregisterErrorHandler(ErrorType.API)
    errorService.unregisterErrorHandler(ErrorType.NETWORK)
    errorService.unregisterErrorHandler(ErrorType.AUDIO)
    errorService.clearStoredErrors()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = ErrorService.getInstance()
      const instance2 = ErrorService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(errorService)
    })
  })

  describe('Error Creation', () => {
    it('creates error with all required fields', () => {
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test API error'
      })

      expect(error).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          type: ErrorType.API,
          severity: ErrorSeverity.HIGH,
          message: 'Test API error',
          timestamp: expect.any(String),
          retryable: expect.any(Boolean),
          userMessage: expect.any(String)
        })
      )
    })

    it('generates unique IDs for different errors', () => {
      const error1 = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Error 1'
      })

      const error2 = errorService.createError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Error 2'
      })

      expect(error1.id).not.toBe(error2.id)
    })

    it('includes context when provided', () => {
      const context = { userId: '123', action: 'test' }
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
        context
      })

      expect(error.context).toEqual(context)
    })

    it('includes original error when provided', () => {
      const originalError = new Error('Original error message')
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
        originalError
      })

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('Retry Logic', () => {
    it('marks network errors as retryable', () => {
      const error = errorService.createError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error'
      })

      expect(error.retryable).toBe(true)
    })

    it('marks timeout API errors as retryable', () => {
      const timeoutError = new Error('Request timeout')
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'API timeout',
        originalError: timeoutError
      })

      expect(error.retryable).toBe(true)
    })

    it('marks rate limit errors as retryable', () => {
      const rateLimitError = new Error('Rate limit exceeded')
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.MEDIUM,
        message: 'Rate limited',
        originalError: rateLimitError
      })

      expect(error.retryable).toBe(true)
    })

    it('marks validation errors as non-retryable', () => {
      const error = errorService.createError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Invalid input'
      })

      expect(error.retryable).toBe(false)
    })

    it('respects custom retryable setting', () => {
      const error = errorService.createError({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Invalid input',
        retryable: true // Override default
      })

      expect(error.retryable).toBe(true)
    })
  })

  describe('User Messages', () => {
    it('generates appropriate messages for different error types and severities', () => {
      const networkError = errorService.createError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error'
      })

      const apiError = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.MEDIUM,
        message: 'API error'
      })

      const audioError = errorService.createError({
        type: ErrorType.AUDIO,
        severity: ErrorSeverity.LOW,
        message: 'Audio error'
      })

      expect(networkError.userMessage).toBe('Unable to connect. Please check your internet connection.')
      expect(apiError.userMessage).toBe('Service temporarily unavailable. Retrying...')
      expect(audioError.userMessage).toBe('Audio playback interrupted. Continuing...')
    })

    it('provides fallback message for unknown combinations', () => {
      // Mock an error type that doesn't exist in the messages map
      const error = errorService.createError({
        type: 'unknown_type' as ErrorType,
        severity: ErrorSeverity.HIGH,
        message: 'Unknown error'
      })

      expect(error.userMessage).toBe('An error occurred. Please try again.')
    })
  })

  describe('Error Handling', () => {
    it('logs error details to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      errorService.handleError(error)

      expect(consoleSpy).toHaveBeenCalledWith(
        `[${error.type}] ${error.message}`,
        expect.objectContaining({
          id: error.id,
          severity: error.severity,
          timestamp: error.timestamp
        })
      )
    })

    it('stores error in localStorage', () => {
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      errorService.handleError(error)

      const storedErrors = errorService.getStoredErrors()
      expect(storedErrors).toHaveLength(1)
      expect(storedErrors[0].id).toBe(error.id)
    })

    it('calls registered error handler', () => {
      const mockHandler = vi.fn()
      errorService.registerErrorHandler(ErrorType.API, mockHandler)

      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      errorService.handleError(error)

      expect(mockHandler).toHaveBeenCalledWith(error)
    })

    it('handles error handler failures gracefully', () => {
      const failingHandler = vi.fn(() => {
        throw new Error('Handler failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      errorService.registerErrorHandler(ErrorType.API, failingHandler)

      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      expect(() => errorService.handleError(error)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Error handler failed:', expect.any(Error))
    })
  })

  describe('Error Storage', () => {
    it('stores multiple errors', () => {
      const error1 = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Error 1'
      })

      const error2 = errorService.createError({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Error 2'
      })

      errorService.handleError(error1)
      errorService.handleError(error2)

      const storedErrors = errorService.getStoredErrors()
      expect(storedErrors).toHaveLength(2)
    })

    it('limits stored errors to 50 entries', () => {
      // Create 55 errors
      for (let i = 0; i < 55; i++) {
        const error = errorService.createError({
          type: ErrorType.API,
          severity: ErrorSeverity.LOW,
          message: `Error ${i}`
        })
        errorService.handleError(error)
      }

      const storedErrors = errorService.getStoredErrors()
      expect(storedErrors).toHaveLength(50)
      
      // Should keep the most recent 50 errors
      expect(storedErrors[0].message).toBe('Error 5') // First 5 were removed
      expect(storedErrors[49].message).toBe('Error 54')
    })

    it('clears stored errors', () => {
      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      errorService.handleError(error)
      expect(errorService.getStoredErrors()).toHaveLength(1)

      errorService.clearStoredErrors()
      expect(errorService.getStoredErrors()).toHaveLength(0)
    })

    it('handles localStorage failures gracefully', () => {
      // Mock localStorage.setItem to fail
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      expect(() => errorService.handleError(error)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store error:', expect.any(Error))

      // Restore localStorage
      localStorage.setItem = originalSetItem
    })
  })

  describe('Error Handler Registration', () => {
    it('registers and unregisters error handlers', () => {
      const mockHandler = vi.fn()
      
      // Register handler
      errorService.registerErrorHandler(ErrorType.API, mockHandler)

      const error = errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Test error'
      })

      errorService.handleError(error)
      expect(mockHandler).toHaveBeenCalledWith(error)

      // Unregister handler
      mockHandler.mockClear()
      errorService.unregisterErrorHandler(ErrorType.API)

      errorService.handleError(error)
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('Static Helper Methods', () => {
    it('creates network errors with correct properties', () => {
      const error = ErrorService.createNetworkError('Connection failed')

      expect(error.type).toBe(ErrorType.NETWORK)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.message).toBe('Connection failed')
      expect(error.retryable).toBe(true)
    })

    it('creates API errors with correct properties', () => {
      const originalError = new Error('API failed')
      const error = ErrorService.createAPIError('API request failed', originalError)

      expect(error.type).toBe(ErrorType.API)
      expect(error.severity).toBe(ErrorSeverity.HIGH)
      expect(error.message).toBe('API request failed')
      expect(error.originalError).toBe(originalError)
    })

    it('creates audio errors with correct properties', () => {
      const error = ErrorService.createAudioError('Playback failed')

      expect(error.type).toBe(ErrorType.AUDIO)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.message).toBe('Playback failed')
    })

    it('creates speech recognition errors with correct properties', () => {
      const error = ErrorService.createSpeechRecognitionError('Microphone access denied')

      expect(error.type).toBe(ErrorType.SPEECH_RECOGNITION)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.message).toBe('Microphone access denied')
    })
  })

  describe('Global Error Handlers', () => {
    it('handles uncaught window errors', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate uncaught error
      const errorEvent = new ErrorEvent('error', {
        message: 'Uncaught error',
        filename: 'test.js',
        lineno: 42,
        colno: 10,
        error: new Error('Test error')
      })

      window.dispatchEvent(errorEvent)

      // Check if error was handled (stored)
      const storedErrors = errorService.getStoredErrors()
      expect(storedErrors.length).toBeGreaterThan(0)
      
      const lastError = storedErrors[storedErrors.length - 1]
      expect(lastError.type).toBe(ErrorType.UNKNOWN)
      expect(lastError.message).toBe('Uncaught error')
    })

    it('handles unhandled promise rejections', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate unhandled promise rejection
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Promise rejection')),
        reason: new Error('Promise rejection')
      })

      window.dispatchEvent(rejectionEvent)

      // Check if error was handled (stored)
      const storedErrors = errorService.getStoredErrors()
      expect(storedErrors.length).toBeGreaterThan(0)
      
      const lastError = storedErrors[storedErrors.length - 1]
      expect(lastError.type).toBe(ErrorType.UNKNOWN)
      expect(lastError.message).toBe('Unhandled promise rejection')
    })
  })
})