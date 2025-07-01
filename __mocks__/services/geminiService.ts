import { vi } from 'vitest'

// Mock streaming response
const createMockStreamingResponse = (responses: string[]) => {
  return {
    async *[Symbol.asyncIterator]() {
      for (const response of responses) {
        yield {
          text: response,
          audio: new Uint8Array([1, 2, 3, 4]), // Mock audio data
          done: false,
        }
      }
      return { done: true }
    }
  }
}

// Mock chat session
const mockChatSession = {
  sendMessage: vi.fn(),
  sendMessageStream: vi.fn(),
  sendAudioMessage: vi.fn(),
  sendAudioMessageStream: vi.fn(),
  history: [],
}

// Default mock responses
const defaultTextResponses = [
  "I understand you're going through a difficult time.",
  "That sounds really challenging.",
  "How are you feeling about that situation?",
]

// Configure mock responses
mockChatSession.sendMessage.mockImplementation(async (_message: string) => {
  return {
    text: defaultTextResponses[0],
    audio: new Uint8Array([1, 2, 3, 4]),
  }
})

mockChatSession.sendMessageStream.mockImplementation((_message: string) => {
  return createMockStreamingResponse(defaultTextResponses)
})

mockChatSession.sendAudioMessage.mockImplementation(async (_audioData: Uint8Array) => {
  return {
    text: "I can hear you, thanks for sharing.",
    audio: new Uint8Array([5, 6, 7, 8]),
  }
})

mockChatSession.sendAudioMessageStream.mockImplementation((_audioData: Uint8Array) => {
  return createMockStreamingResponse(["I can hear you, thanks for sharing."])
})

// Mock the startChatSession function
export const startChatSession = vi.fn(() => mockChatSession)

// Export mock helpers for tests
export const mockHelpers = {
  mockChatSession,
  setMockTextResponse: (responses: string | string[]) => {
    const responseArray = Array.isArray(responses) ? responses : [responses]
    mockChatSession.sendMessage.mockResolvedValue({
      text: responseArray[0],
      audio: new Uint8Array([1, 2, 3, 4]),
    })
    mockChatSession.sendMessageStream.mockReturnValue(
      createMockStreamingResponse(responseArray)
    )
  },
  setMockAudioResponse: (responses: string | string[]) => {
    const responseArray = Array.isArray(responses) ? responses : [responses]
    mockChatSession.sendAudioMessage.mockResolvedValue({
      text: responseArray[0],
      audio: new Uint8Array([5, 6, 7, 8]),
    })
    mockChatSession.sendAudioMessageStream.mockReturnValue(
      createMockStreamingResponse(responseArray)
    )
  },
  setMockError: (error: Error) => {
    mockChatSession.sendMessage.mockRejectedValue(error)
    mockChatSession.sendMessageStream.mockImplementation(() => {
      throw error
    })
    mockChatSession.sendAudioMessage.mockRejectedValue(error)
    mockChatSession.sendAudioMessageStream.mockImplementation(() => {
      throw error
    })
  },
  resetMocks: () => {
    mockChatSession.sendMessage.mockClear()
    mockChatSession.sendMessageStream.mockClear()
    mockChatSession.sendAudioMessage.mockClear()
    mockChatSession.sendAudioMessageStream.mockClear()
    startChatSession.mockClear()
  }
}