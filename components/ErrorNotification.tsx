import React, { useState, useEffect } from 'react'
import { AppError, ErrorSeverity, ErrorType } from '../services/errorService'

interface ErrorNotificationProps {
  error: AppError | null
  onDismiss: () => void
  onRetry?: () => void
  autoHideDuration?: number
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  autoHideDuration = 0 // 0 means no auto-hide
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (error) {
      setIsVisible(true)
      setIsLeaving(false)

      // Auto-hide for low severity errors
      if (autoHideDuration > 0 && error.severity === ErrorSeverity.LOW) {
        const timer = setTimeout(() => {
          handleDismiss()
        }, autoHideDuration)

        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [error, autoHideDuration])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsLeaving(false)
      onDismiss()
    }, 300) // Animation duration
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    handleDismiss()
  }

  if (!error || !isVisible) {
    return null
  }

  const getErrorIcon = (type: ErrorType, severity: ErrorSeverity) => {
    const iconClass = "w-5 h-5 flex-shrink-0"
    
    switch (type) {
      case ErrorType.NETWORK:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        )
      case ErrorType.AUDIO:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 6.5v11" />
          </svg>
        )
      case ErrorType.SPEECH_RECOGNITION:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )
      case ErrorType.API:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
    }
  }

  const getErrorColors = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return {
          bg: 'bg-blue-500/10 border-blue-500/20',
          text: 'text-blue-400',
          icon: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
      case ErrorSeverity.MEDIUM:
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/20',
          text: 'text-yellow-400',
          icon: 'text-yellow-400',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case ErrorSeverity.HIGH:
        return {
          bg: 'bg-orange-500/10 border-orange-500/20',
          text: 'text-orange-400',
          icon: 'text-orange-400',
          button: 'bg-orange-600 hover:bg-orange-700'
        }
      case ErrorSeverity.CRITICAL:
        return {
          bg: 'bg-red-500/10 border-red-500/20',
          text: 'text-red-400',
          icon: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-700'
        }
      default:
        return {
          bg: 'bg-gray-500/10 border-gray-500/20',
          text: 'text-gray-400',
          icon: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700'
        }
    }
  }

  const colors = getErrorColors(error.severity)
  const shouldShowRetry = error.retryable && onRetry
  const isTransient = error.severity === ErrorSeverity.LOW

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 ${
      isLeaving ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'
    }`}>
      <div className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${colors.bg}`}>
        <div className="flex items-start space-x-3">
          <div className={colors.icon}>
            {getErrorIcon(error.type, error.severity)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-medium ${colors.text}`}>
                {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' :
                 error.severity === ErrorSeverity.HIGH ? 'Error' :
                 error.severity === ErrorSeverity.MEDIUM ? 'Warning' : 'Notice'}
              </p>
              
              {!isTransient && (
                <button
                  onClick={handleDismiss}
                  className={`${colors.text} hover:opacity-70 transition-opacity`}
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <p className={`text-sm ${colors.text} opacity-90`}>
              {error.userMessage}
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className={`text-xs ${colors.text} opacity-70 cursor-pointer`}>
                  Debug Info
                </summary>
                <div className={`text-xs ${colors.text} opacity-60 mt-1 font-mono`}>
                  <div>ID: {error.id}</div>
                  <div>Type: {error.type}</div>
                  <div>Time: {new Date(error.timestamp).toLocaleTimeString()}</div>
                  {error.context && (
                    <div>Context: {JSON.stringify(error.context, null, 2)}</div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
        
        {shouldShowRetry && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleRetry}
              className={`px-3 py-1 text-xs font-medium text-white rounded-md transition-colors duration-200 ${colors.button}`}
            >
              Try Again
            </button>
            
            {!isTransient && (
              <button
                onClick={handleDismiss}
                className={`px-3 py-1 text-xs font-medium transition-colors duration-200 ${colors.text} hover:opacity-70`}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
        
        {isTransient && (
          <div className="mt-2">
            <div className={`h-1 bg-current opacity-20 rounded-full overflow-hidden`}>
              <div 
                className={`h-full bg-current transition-all duration-100 ease-linear`}
                style={{
                  animation: `shrink ${autoHideDuration}ms linear`,
                  width: '100%'
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export default ErrorNotification