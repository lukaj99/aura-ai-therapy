import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startChatSession, mockHelpers } from '../__mocks__/services/geminiService'

// Mock the actual module
vi.mock('./geminiService', () => import('../__mocks__/services/geminiService'))

describe('GeminiService', () => {
  beforeEach(() => {
    mockHelpers.resetMocks()
  })

  describe('startChatSession', () => {
    it('creates a chat session successfully', () => {
      const chatSession = startChatSession()
      
      expect(startChatSession).toHaveBeenCalledTimes(1)
      expect(chatSession).toBeDefined()
      expect(chatSession.sendMessage).toBeDefined()
      expect(chatSession.sendMessageStream).toBeDefined()
      expect(chatSession.sendAudioMessage).toBeDefined()
      expect(chatSession.sendAudioMessageStream).toBeDefined()
    })

    it('returns consistent chat session object', () => {
      const session1 = startChatSession()
      const session2 = startChatSession()
      
      expect(session1).toBe(session2) // Should return the same mock instance
    })
  })

  describe('Chat Session - Text Messages', () => {
    let chatSession: ReturnType<typeof startChatSession>

    beforeEach(() => {
      chatSession = startChatSession()
    })

    it('sends text message successfully', async () => {
      mockHelpers.setMockTextResponse('Thank you for sharing that with me.')
      
      const response = await chatSession.sendMessage('I feel anxious about work.')
      
      expect(chatSession.sendMessage).toHaveBeenCalledWith('I feel anxious about work.')
      expect(response.text).toBe('Thank you for sharing that with me.')
      expect(response.audio).toBeInstanceOf(Uint8Array)
    })

    it('handles streaming text messages', async () => {
      const mockResponses = [
        'I understand your concerns.',
        'Let\'s explore this feeling together.',
        'What specific aspects of work make you feel anxious?'
      ]
      mockHelpers.setMockTextResponse(mockResponses)
      
      const stream = chatSession.sendMessageStream('Tell me about my anxiety.')
      const responses = []
      
      for await (const chunk of stream) {
        responses.push(chunk.text)
      }
      
      expect(chatSession.sendMessageStream).toHaveBeenCalledWith('Tell me about my anxiety.')
      expect(responses).toEqual(mockResponses)
    })

    it('handles text message errors', async () => {
      const error = new Error('API rate limit exceeded')
      mockHelpers.setMockError(error)
      
      await expect(chatSession.sendMessage('Hello')).rejects.toThrow('API rate limit exceeded')
    })
  })

  describe('Chat Session - Audio Messages', () => {
    let chatSession: ReturnType<typeof startChatSession>

    beforeEach(() => {
      chatSession = startChatSession()
    })

    it('sends audio message successfully', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5])
      mockHelpers.setMockAudioResponse('I can hear the emotion in your voice.')
      
      const response = await chatSession.sendAudioMessage(audioData)
      
      expect(chatSession.sendAudioMessage).toHaveBeenCalledWith(audioData)
      expect(response.text).toBe('I can hear the emotion in your voice.')
      expect(response.audio).toBeInstanceOf(Uint8Array)
    })

    it('handles streaming audio messages', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5])
      const mockResponses = ['I can hear you clearly.', 'Thank you for sharing your feelings.']
      mockHelpers.setMockAudioResponse(mockResponses)
      
      const stream = chatSession.sendAudioMessageStream(audioData)
      const responses = []
      
      for await (const chunk of stream) {
        responses.push(chunk.text)
      }
      
      expect(chatSession.sendAudioMessageStream).toHaveBeenCalledWith(audioData)
      expect(responses).toEqual(mockResponses)
    })

    it('handles audio message errors', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4, 5])
      const error = new Error('Audio processing failed')
      mockHelpers.setMockError(error)
      
      await expect(chatSession.sendAudioMessage(audioData)).rejects.toThrow('Audio processing failed')
    })
  })

  describe('Mock Helpers', () => {
    let chatSession: ReturnType<typeof startChatSession>

    beforeEach(() => {
      chatSession = startChatSession()
    })

    it('allows setting custom text responses', async () => {
      const customResponse = 'This is a custom therapeutic response.'
      mockHelpers.setMockTextResponse(customResponse)
      
      const response = await chatSession.sendMessage('Test message')
      expect(response.text).toBe(customResponse)
    })

    it('allows setting multiple text responses for streaming', async () => {
      const customResponses = ['First response', 'Second response', 'Final response']
      mockHelpers.setMockTextResponse(customResponses)
      
      const stream = chatSession.sendMessageStream('Test message')
      const responses = []
      
      for await (const chunk of stream) {
        responses.push(chunk.text)
      }
      
      expect(responses).toEqual(customResponses)
    })

    it('allows setting custom audio responses', async () => {
      const customResponse = 'Custom audio response.'
      mockHelpers.setMockAudioResponse(customResponse)
      
      const audioData = new Uint8Array([1, 2, 3])
      const response = await chatSession.sendAudioMessage(audioData)
      expect(response.text).toBe(customResponse)
    })

    it('allows setting custom errors', async () => {
      const customError = new Error('Custom test error')
      mockHelpers.setMockError(customError)
      
      await expect(chatSession.sendMessage('Test')).rejects.toThrow('Custom test error')
      expect(() => chatSession.sendMessageStream('Test')).toThrow('Custom test error')
    })

    it('resets mocks properly', async () => {
      // Set up some mock state
      mockHelpers.setMockTextResponse('Test response')
      
      // Call some methods
      await chatSession.sendMessage('test')
      const stream = chatSession.sendMessageStream('test')
      
      // Consume the stream to avoid hanging
      for await (const _ of stream) {
        // Just consume
      }
      
      // Verify methods were called
      expect(chatSession.sendMessage).toHaveBeenCalled()
      expect(chatSession.sendMessageStream).toHaveBeenCalled()
      
      // Reset mocks
      mockHelpers.resetMocks()
      
      // Verify mocks are cleared
      expect(chatSession.sendMessage).not.toHaveBeenCalled()
      expect(chatSession.sendMessageStream).not.toHaveBeenCalled()
      expect(startChatSession).not.toHaveBeenCalled()
    })
  })
})