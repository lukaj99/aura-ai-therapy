export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error, attempt: number) => boolean
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalDuration: number
}

/**
 * Exponential backoff retry utility
 */
export class RetryManager {
  private static defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
    onRetry: () => {},
    shouldRetry: (error: Error) => {
      // Default retry logic for common retryable errors
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('500') ||
        message.includes('rate limit') ||
        message.includes('too many requests')
      )
    }
  }

  /**
   * Execute a function with retry logic
   */
  public static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultOptions, ...options }
    const startTime = Date.now()
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn()
        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          break
        }

        // Check if we should retry this error
        if (!config.shouldRetry(lastError, attempt)) {
          break
        }

        // Call retry callback
        config.onRetry(attempt, lastError)

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config)
        await this.sleep(delay)
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDuration: Date.now() - startTime
    }
  }

  /**
   * Execute with timeout and retry
   */
  public static async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    retryOptions: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const timeoutFn = () => {
      return Promise.race([
        fn(),
        this.createTimeoutPromise<T>(timeoutMs)
      ])
    }

    return this.execute(timeoutFn, {
      ...retryOptions,
      shouldRetry: (error, attempt) => {
        // Always retry timeout errors
        if (error.message.includes('timeout')) {
          return true
        }
        // Use custom retry logic if provided
        return retryOptions.shouldRetry ? retryOptions.shouldRetry(error, attempt) : true
      }
    })
  }

  private static calculateDelay(attempt: number, config: Required<RetryOptions>): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay)
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5) // Random between 50% and 100% of calculated delay
    }
    
    return Math.floor(delay)
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  }
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private options: {
      failureThreshold: number
      resetTimeout: number
      monitoringPeriod?: number
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): string {
    return this.state
  }

  getFailureCount(): number {
    return this.failures
  }

  reset(): void {
    this.failures = 0
    this.lastFailureTime = 0
    this.state = 'closed'
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.tryConsume()) {
      throw new Error('Rate limit exceeded')
    }
    return fn()
  }

  private tryConsume(): boolean {
    this.refill()
    
    if (this.tokens >= 1) {
      this.tokens--
      return true
    }
    
    return false
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}

// Convenience functions for common retry patterns
export const retryNetworkRequest = <T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<RetryResult<T>> => {
  return RetryManager.execute(fn, {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('503') ||
        message.includes('502')
      )
    },
    ...options
  })
}

export const retryAPICall = <T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<RetryResult<T>> => {
  return RetryManager.execute(fn, {
    maxAttempts: 5,
    baseDelay: 2000,
    backoffMultiplier: 1.5,
    maxDelay: 10000,
    shouldRetry: (error) => {
      const message = error.message.toLowerCase()
      return (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('timeout')
      )
    },
    ...options
  })
}