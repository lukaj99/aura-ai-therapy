import { vi } from 'vitest'

// Mock enhanced Gemini service
const mockEnhancedGeminiService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  startChatSession: vi.fn().mockResolvedValue({
    sendMessage: vi.fn().mockResolvedValue({
      text: 'Mock response',
      audio: new Uint8Array([1, 2, 3, 4])
    }),
    sendMessageStream: vi.fn().mockImplementation(async function* () {
      yield {
        text: 'Mock streaming response',
        audio: new Uint8Array([1, 2, 3, 4]),
        done: false
      }
      yield { done: true }
    })
  }),
  sendMessage: vi.fn().mockResolvedValue({
    text: 'Mock response',
    audio: new Uint8Array([1, 2, 3, 4])
  }),
  sendMessageStream: vi.fn().mockImplementation(async function* () {
    yield {
      text: 'Mock streaming response',
      audio: new Uint8Array([1, 2, 3, 4]),
      done: false
    }
    yield { done: true }
  }),
  getHealth: vi.fn().mockReturnValue({
    isInitialized: true,
    circuitBreakerState: 'closed',
    failureCount: 0,
    lastErrors: []
  }),
  reset: vi.fn(),
  destroy: vi.fn()
}

export const getEnhancedGeminiService = vi.fn(() => mockEnhancedGeminiService)

export const startChatSession = vi.fn(() => mockEnhancedGeminiService.startChatSession())

export const mockHelpers = {
  mockService: mockEnhancedGeminiService,
  setMockResponse: (response: string) => {
    mockEnhancedGeminiService.sendMessage.mockResolvedValue({
      text: response,
      audio: new Uint8Array([1, 2, 3, 4])
    })
  },
  setMockStreamResponse: (responses: string[]) => {
    mockEnhancedGeminiService.sendMessageStream.mockImplementation(async function* () {
      for (const response of responses) {
        yield {
          text: response,
          audio: new Uint8Array([1, 2, 3, 4]),
          done: false
        }
      }
      yield { done: true }
    })
  },
  setMockError: (error: Error) => {
    mockEnhancedGeminiService.sendMessage.mockRejectedValue(error)
    mockEnhancedGeminiService.sendMessageStream.mockImplementation(async function* () {
      throw error
    })
  },
  resetMocks: () => {
    Object.values(mockEnhancedGeminiService).forEach(mock => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear()
      }
    })
    getEnhancedGeminiService.mockClear()
    startChatSession.mockClear()
  }
}