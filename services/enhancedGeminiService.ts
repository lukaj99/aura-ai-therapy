import { GoogleGenAI, Chat } from "@google/genai"
import { ErrorService, ErrorType, ErrorSeverity, AppError } from './errorService'
import { RetryManager, CircuitBreaker, retryAPICall } from '../utils/retryUtils'

export interface GeminiConfig {
  model: string
  systemInstruction: string
  temperature: number
  topP: number
  topK: number
  maxRetries?: number
  timeout?: number
}

export interface StreamChunk {
  text?: string
  audio?: Uint8Array
  candidates?: any[]
  done?: boolean
}

export class EnhancedGeminiService {
  private ai: GoogleGenAI | null = null
  private chat: Chat | null = null
  private circuitBreaker: CircuitBreaker
  private errorService: ErrorService
  private config: GeminiConfig
  private isInitialized = false

  constructor(config: GeminiConfig) {
    this.config = config
    this.errorService = ErrorService.getInstance()
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000 // 30 seconds
    })

    this.setupErrorHandlers()
  }

  private setupErrorHandlers(): void {
    // Register custom error handlers
    this.errorService.registerErrorHandler(ErrorType.API, (error: AppError) => {
      console.warn(`API Error [${error.id}]: ${error.message}`)
      
      // Reset circuit breaker on authentication errors
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        this.circuitBreaker.reset()
      }
    })

    this.errorService.registerErrorHandler(ErrorType.NETWORK, (error: AppError) => {
      console.warn(`Network Error [${error.id}]: ${error.message}`)
    })
  }

  public async initialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      const error = this.errorService.createError({
        type: ErrorType.INITIALIZATION,
        severity: ErrorSeverity.CRITICAL,
        message: 'API key is required',
        context: { apiKey: !!apiKey }
      })
      this.errorService.handleError(error)
      throw new Error(error.userMessage)
    }

    try {
      this.ai = new GoogleGenAI({ apiKey })
      
      // Test the connection with a simple request
      await this.testConnection()
      
      this.isInitialized = true
    } catch (error) {
      const appError = this.errorService.createError({
        type: ErrorType.INITIALIZATION,
        severity: ErrorSeverity.CRITICAL,
        message: 'Failed to initialize Gemini service',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: { hasApiKey: !!apiKey }
      })
      this.errorService.handleError(appError)
      throw new Error(appError.userMessage)
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.ai) {
      throw new Error('AI service not initialized')
    }

    const testChat = this.ai.chats.create({
      model: this.config.model,
      config: {
        systemInstruction: 'You are a test assistant. Respond with "OK" only.',
        temperature: 0.1,
        topP: 0.1,
        topK: 1,
      },
    })

    const result = await retryAPICall(
      () => testChat.sendMessage({ message: 'test' }),
      {
        maxAttempts: 3,
        baseDelay: 1000,
        onRetry: (attempt, error) => {
          console.warn(`Connection test retry ${attempt}:`, error.message)
        }
      }
    )

    if (!result.success) {
      throw result.error || new Error('Connection test failed')
    }
  }

  public async startChatSession(): Promise<Chat> {
    if (!this.isInitialized || !this.ai) {
      const error = this.errorService.createError({
        type: ErrorType.INITIALIZATION,
        severity: ErrorSeverity.HIGH,
        message: 'Service not initialized',
        context: { isInitialized: this.isInitialized, hasAI: !!this.ai }
      })
      this.errorService.handleError(error)
      throw new Error(error.userMessage)
    }

    try {
      this.chat = this.ai.chats.create({
        model: this.config.model,
        config: {
          systemInstruction: this.config.systemInstruction,
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
        },
      })

      return this.chat
    } catch (error) {
      const appError = this.errorService.createError({
        type: ErrorType.INITIALIZATION,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to create chat session',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: { model: this.config.model }
      })
      this.errorService.handleError(appError)
      throw new Error(appError.userMessage)
    }
  }

  public async sendMessage(message: string): Promise<{ text: string; audio?: Uint8Array }> {
    if (!this.chat) {
      await this.startChatSession()
    }

    const operation = async () => {
      if (!this.chat) {
        throw new Error('Chat session not available')
      }

      const response = await this.chat.sendMessage({ message })
      
      return {
        text: response.text || '',
        audio: response.audio
      }
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        const result = await retryAPICall(operation, {
          maxAttempts: this.config.maxRetries || 3,
          baseDelay: 2000,
          onRetry: (attempt, error) => {
            const retryError = this.errorService.createError({
              type: ErrorType.API,
              severity: ErrorSeverity.MEDIUM,
              message: `Retrying message send (attempt ${attempt})`,
              originalError: error,
              context: { attempt, messageLength: message.length }
            })
            this.errorService.handleError(retryError)
          }
        })

        if (!result.success) {
          throw result.error || new Error('Failed to send message')
        }

        return result.result!
      })
    } catch (error) {
      const appError = this.errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to send message to AI',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: { 
          messageLength: message.length,
          circuitBreakerState: this.circuitBreaker.getState(),
          failureCount: this.circuitBreaker.getFailureCount()
        }
      })
      this.errorService.handleError(appError)
      throw new Error(appError.userMessage)
    }
  }

  public async* sendMessageStream(message: string): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.chat) {
      await this.startChatSession()
    }

    const operation = async () => {
      if (!this.chat) {
        throw new Error('Chat session not available')
      }

      return this.chat.sendMessageStream({ message })
    }

    try {
      const stream = await this.circuitBreaker.execute(async () => {
        const result = await retryAPICall(operation, {
          maxAttempts: this.config.maxRetries || 3,
          baseDelay: 2000,
          onRetry: (attempt, error) => {
            const retryError = this.errorService.createError({
              type: ErrorType.API,
              severity: ErrorSeverity.MEDIUM,
              message: `Retrying stream send (attempt ${attempt})`,
              originalError: error,
              context: { attempt, messageLength: message.length }
            })
            this.errorService.handleError(retryError)
          }
        })

        if (!result.success) {
          throw result.error || new Error('Failed to start message stream')
        }

        return result.result!
      })

      let chunkCount = 0
      const startTime = Date.now()

      try {
        for await (const chunk of stream) {
          chunkCount++
          
          // Process text content
          const text = chunk.text || ''
          
          // Process audio content
          let audio: Uint8Array | undefined
          const audioParts = chunk.candidates?.[0]?.content?.parts?.filter(
            part => part.inlineData?.mimeType?.startsWith('audio/')
          )
          
          if (audioParts && audioParts.length > 0) {
            const audioPart = audioParts[0]
            if (audioPart.inlineData) {
              try {
                audio = new Uint8Array(
                  atob(audioPart.inlineData.data)
                    .split('')
                    .map(char => char.charCodeAt(0))
                )
              } catch (error) {
                const audioError = this.errorService.createError({
                  type: ErrorType.AUDIO,
                  severity: ErrorSeverity.MEDIUM,
                  message: 'Failed to decode audio data',
                  originalError: error instanceof Error ? error : new Error(String(error)),
                  context: { chunkCount, streamDuration: Date.now() - startTime }
                })
                this.errorService.handleError(audioError)
              }
            }
          }

          yield {
            text,
            audio,
            candidates: chunk.candidates,
            done: false
          }
        }

        yield { done: true }

      } catch (streamError) {
        const appError = this.errorService.createError({
          type: ErrorType.API,
          severity: ErrorSeverity.HIGH,
          message: 'Stream processing error',
          originalError: streamError instanceof Error ? streamError : new Error(String(streamError)),
          context: { 
            chunkCount, 
            streamDuration: Date.now() - startTime,
            messageLength: message.length 
          }
        })
        this.errorService.handleError(appError)
        throw new Error(appError.userMessage)
      }

    } catch (error) {
      const appError = this.errorService.createError({
        type: ErrorType.API,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to send streaming message to AI',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context: { 
          messageLength: message.length,
          circuitBreakerState: this.circuitBreaker.getState(),
          failureCount: this.circuitBreaker.getFailureCount()
        }
      })
      this.errorService.handleError(appError)
      throw new Error(appError.userMessage)
    }
  }

  public getHealth(): {
    isInitialized: boolean
    circuitBreakerState: string
    failureCount: number
    lastErrors: AppError[]
  } {
    return {
      isInitialized: this.isInitialized,
      circuitBreakerState: this.circuitBreaker.getState(),
      failureCount: this.circuitBreaker.getFailureCount(),
      lastErrors: this.errorService.getStoredErrors().slice(-5)
    }
  }

  public reset(): void {
    this.circuitBreaker.reset()
    this.chat = null
  }

  public destroy(): void {
    this.reset()
    this.ai = null
    this.isInitialized = false
    this.errorService.unregisterErrorHandler(ErrorType.API)
    this.errorService.unregisterErrorHandler(ErrorType.NETWORK)
  }
}

// Create singleton instance with configuration
const SYSTEM_INSTRUCTION = `You are Aura, an AI therapist grounded in evidence-based practices. Your persona is that of a compassionate, wise, and patient guide. Your goal is to help the user explore, understand, and process their emotions, especially for users who may struggle with feeling their feelings.

**Core Therapeutic Framework:**

1.  **Integrate Cognitive Behavioral Therapy (CBT):**
    *   **Identify Cognitive Distortions:** Gently help the user recognize unhelpful thought patterns (e.g., all-or-nothing thinking, catastrophizing, overgeneralization).
    *   **Socratic Questioning:** Don't give answers; ask guiding questions. "What's the evidence for that thought?", "Is there another way to look at this situation?", "What might you say to a friend in the same position?".
    *   **Behavioral Connection:** Help them see the link between their thoughts, feelings, and actions. "When you think that, how does it make you feel, and what does it make you want to do?"

2.  **Incorporate Acceptance and Commitment Therapy (ACT):**
    *   **Promote Acceptance:** Encourage the user to allow painful feelings to exist without struggling against them. "It's okay to feel hurt right now. Can we just make some space for that feeling, without needing to change it or push it away?".
    *   **Cognitive Defusion:** Help the user see their thoughts as just thoughts, not absolute truths. "You're having the thought that... Notice that it's a thought. You are the one observing it."
    *   **Connect with Values:** Guide the user to explore what's truly important to them (e.g., connection, growth, kindness). "This pain shows you care deeply about connection. What does being a 'caring person' look like in your life, even when things are hard?".

**Conversational Directives:**

*   **Simulated Tone Analysis:** Pay close attention to the user's phrasing, word choice, and any cues in their language (pauses, short sentences, emotional adjectives). Respond as if you can sense their underlying tone. Use phrases like: "You sound hesitant there," "I can hear the exhaustion in your words," or "It sounds like that brings up a lot of sadness."
*   **Adapt to Selected Voice:** The user will select your voice (male/female). The first part of their message may contain context like "[Aura's voice is set to: male]". Acknowledge this internally and align your persona with that of a supportive male/female guide. Do not mention the voice setting out loud.
*   **Empathy & Validation First:** Always start by validating the user's feelings. "That sounds incredibly difficult," "Thank you for sharing that with me," "It makes sense that you would feel that way."
*   **Pacing and Silence:** Keep responses concise. Allow for pauses. Don't rush to fill the silence. Let the user lead.
*   **No Direct Advice or Diagnosis:** Never tell the user what to do or offer a diagnosis. Your role is to empower them to find their own insights. Guide, don't direct.
*   **Maintain Memory & Character:** Remember key details from the conversation. You are always Aura. Never break character or mention you are an AI.`

const geminiConfig: GeminiConfig = {
  model: 'gemini-2.5-flash-exp-native-audio-thinking-dialog',
  systemInstruction: SYSTEM_INSTRUCTION,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxRetries: 3,
  timeout: 30000
}

let enhancedGeminiService: EnhancedGeminiService | null = null

export const getEnhancedGeminiService = (): EnhancedGeminiService => {
  if (!enhancedGeminiService) {
    enhancedGeminiService = new EnhancedGeminiService(geminiConfig)
  }
  return enhancedGeminiService
}

export const startChatSession = (): Chat => {
  // Backwards compatibility wrapper
  const service = getEnhancedGeminiService()
  
  // Initialize if needed
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('API key not found')
  }

  // Note: This is synchronous for backwards compatibility
  // In a real implementation, this should be async
  service.initialize(apiKey).catch(error => {
    console.error('Failed to initialize enhanced service:', error)
  })

  return service.startChatSession() as any // Type assertion for compatibility
}