// Error types and classifications
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  AUDIO = 'audio',
  SPEECH_RECOGNITION = 'speech_recognition',
  INITIALIZATION = 'initialization',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: string
  retryable: boolean
  userMessage: string
}

export class ErrorService {
  private static instance: ErrorService
  private errorHandlers: Map<ErrorType, (error: AppError) => void> = new Map()

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = this.createError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.message || 'Uncaught error',
        originalError: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
      this.handleError(error)
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: 'Unhandled promise rejection',
        originalError: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: {
          reason: event.reason
        }
      })
      this.handleError(error)
    })
  }

  public createError(config: {
    type: ErrorType
    severity: ErrorSeverity
    message: string
    originalError?: Error
    context?: Record<string, any>
    retryable?: boolean
  }): AppError {
    const error: AppError = {
      id: crypto.randomUUID(),
      type: config.type,
      severity: config.severity,
      message: config.message,
      originalError: config.originalError,
      context: config.context,
      timestamp: new Date().toISOString(),
      retryable: config.retryable ?? this.isRetryableError(config.type, config.originalError),
      userMessage: this.generateUserMessage(config.type, config.severity)
    }

    return error
  }

  private isRetryableError(type: ErrorType, originalError?: Error): boolean {
    // Network errors are usually retryable
    if (type === ErrorType.NETWORK) return true
    
    // API errors might be retryable depending on status
    if (type === ErrorType.API && originalError) {
      const message = originalError.message.toLowerCase()
      return message.includes('timeout') || 
             message.includes('503') || 
             message.includes('502') ||
             message.includes('rate limit')
    }

    // Audio and speech recognition errors might be temporary
    if (type === ErrorType.AUDIO || type === ErrorType.SPEECH_RECOGNITION) return true

    // Validation and initialization errors are usually not retryable
    return false
  }

  private generateUserMessage(type: ErrorType, severity: ErrorSeverity): string {
    const messages = {
      [ErrorType.NETWORK]: {
        [ErrorSeverity.LOW]: "Connection is a bit slow. Please wait...",
        [ErrorSeverity.MEDIUM]: "Network connection issue. Trying to reconnect...",
        [ErrorSeverity.HIGH]: "Unable to connect. Please check your internet connection.",
        [ErrorSeverity.CRITICAL]: "No network connection. Please check your internet and try again."
      },
      [ErrorType.API]: {
        [ErrorSeverity.LOW]: "Service is responding slowly. Please wait...",
        [ErrorSeverity.MEDIUM]: "Service temporarily unavailable. Retrying...",
        [ErrorSeverity.HIGH]: "Unable to reach the AI service. Please try again.",
        [ErrorSeverity.CRITICAL]: "AI service is currently unavailable. Please try again later."
      },
      [ErrorType.AUDIO]: {
        [ErrorSeverity.LOW]: "Audio playback interrupted. Continuing...",
        [ErrorSeverity.MEDIUM]: "Audio issue detected. Switching to text mode...",
        [ErrorSeverity.HIGH]: "Unable to play audio. Please check your speakers.",
        [ErrorSeverity.CRITICAL]: "Audio system unavailable. Text mode only."
      },
      [ErrorType.SPEECH_RECOGNITION]: {
        [ErrorSeverity.LOW]: "Having trouble hearing you. Please speak clearly...",
        [ErrorSeverity.MEDIUM]: "Speech recognition interrupted. Please try again...",
        [ErrorSeverity.HIGH]: "Unable to access microphone. Please check permissions.",
        [ErrorSeverity.CRITICAL]: "Speech recognition unavailable. Please use text input."
      },
      [ErrorType.INITIALIZATION]: {
        [ErrorSeverity.LOW]: "Starting up... Please wait.",
        [ErrorSeverity.MEDIUM]: "Setup taking longer than expected...",
        [ErrorSeverity.HIGH]: "Unable to start session. Please refresh the page.",
        [ErrorSeverity.CRITICAL]: "Startup failed. Please check your API key and refresh."
      },
      [ErrorType.VALIDATION]: {
        [ErrorSeverity.LOW]: "Please check your input.",
        [ErrorSeverity.MEDIUM]: "Invalid input detected. Please try again.",
        [ErrorSeverity.HIGH]: "Unable to process request. Please check your input.",
        [ErrorSeverity.CRITICAL]: "Request blocked due to invalid input."
      },
      [ErrorType.UNKNOWN]: {
        [ErrorSeverity.LOW]: "Minor issue detected. Continuing...",
        [ErrorSeverity.MEDIUM]: "Something went wrong. Trying to recover...",
        [ErrorSeverity.HIGH]: "Unexpected error occurred. Please try again.",
        [ErrorSeverity.CRITICAL]: "Critical error. Please refresh the page."
      }
    }

    return messages[type]?.[severity] || "An error occurred. Please try again."
  }

  public handleError(error: AppError): void {
    // Log error details
    console.error(`[${error.type}] ${error.message}`, {
      id: error.id,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      originalError: error.originalError
    })

    // Store error for debugging
    this.storeError(error)

    // Call registered error handler if exists
    const handler = this.errorHandlers.get(error.type)
    if (handler) {
      try {
        handler(error)
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError)
      }
    }

    // Report critical errors immediately
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.reportError(error)
    }
  }

  private storeError(error: AppError): void {
    try {
      const errors = this.getStoredErrors()
      errors.push({
        ...error,
        // Don't store the original error object as it may not be serializable
        originalError: error.originalError ? {
          name: error.originalError.name,
          message: error.originalError.message,
          stack: error.originalError.stack
        } : undefined
      })

      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50)
      }

      localStorage.setItem('app_errors', JSON.stringify(errors))
    } catch (e) {
      console.warn('Failed to store error:', e)
    }
  }

  private reportError(error: AppError): void {
    // In production, this would send to monitoring service
    console.warn('Error reporting service not configured for error:', error.id)
    
    // Placeholder for error reporting
    // Example: Sentry, LogRocket, Rollbar, etc.
  }

  public getStoredErrors(): AppError[] {
    try {
      const stored = localStorage.getItem('app_errors')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      console.warn('Failed to retrieve stored errors:', e)
      return []
    }
  }

  public clearStoredErrors(): void {
    try {
      localStorage.removeItem('app_errors')
    } catch (e) {
      console.warn('Failed to clear stored errors:', e)
    }
  }

  public registerErrorHandler(type: ErrorType, handler: (error: AppError) => void): void {
    this.errorHandlers.set(type, handler)
  }

  public unregisterErrorHandler(type: ErrorType): void {
    this.errorHandlers.delete(type)
  }

  // Helper methods for creating specific error types
  public static createNetworkError(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return ErrorService.getInstance().createError({
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message,
      originalError,
      context
    })
  }

  public static createAPIError(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return ErrorService.getInstance().createError({
      type: ErrorType.API,
      severity: ErrorSeverity.HIGH,
      message,
      originalError,
      context
    })
  }

  public static createAudioError(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return ErrorService.getInstance().createError({
      type: ErrorType.AUDIO,
      severity: ErrorSeverity.MEDIUM,
      message,
      originalError,
      context
    })
  }

  public static createSpeechRecognitionError(message: string, originalError?: Error, context?: Record<string, any>): AppError {
    return ErrorService.getInstance().createError({
      type: ErrorType.SPEECH_RECOGNITION,
      severity: ErrorSeverity.MEDIUM,
      message,
      originalError,
      context
    })
  }
}