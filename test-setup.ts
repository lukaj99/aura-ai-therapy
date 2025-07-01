import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Web Speech API
const mockSpeechRecognition = vi.fn(() => ({
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onresult: null,
  onerror: null,
  onstart: null,
  onend: null,
}))

const mockSpeechGrammarList = vi.fn()
const mockSpeechRecognitionEvent = vi.fn()

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
})

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: mockSpeechRecognition,
})

Object.defineProperty(window, 'SpeechGrammarList', {
  writable: true,
  value: mockSpeechGrammarList,
})

Object.defineProperty(window, 'webkitSpeechGrammarList', {
  writable: true,
  value: mockSpeechGrammarList,
})

Object.defineProperty(window, 'SpeechRecognitionEvent', {
  writable: true,
  value: mockSpeechRecognitionEvent,
})

// Mock Web Audio API
const mockAudioContext = vi.fn(() => ({
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  })),
  destination: {},
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  close: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  resume: vi.fn(() => Promise.resolve()),
  state: 'running',
}))

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: mockAudioContext,
})

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: mockAudioContext,
})

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => 
      Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }],
      })
    ),
    enumerateDevices: vi.fn(() => Promise.resolve([])),
  },
})

// Mock environment variables
vi.stubEnv('API_KEY', 'test-api-key')
vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key')

// Global test utilities
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollIntoView for components that use it
Element.prototype.scrollIntoView = vi.fn()

// Mock fetch for API calls
global.fetch = vi.fn()

// Console suppression for tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('[api]') ||
       args[0].includes('[network]') ||
       args[0].includes('[audio]') ||
       args[0].includes('[speech_recognition]') ||
       args[0].includes('[initialization]') ||
       args[0].includes('[validation]') ||
       args[0].includes('[unknown]'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error reporting service not configured') ||
       args[0].includes('Failed to store error') ||
       args[0].includes('Failed to retrieve stored errors'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})