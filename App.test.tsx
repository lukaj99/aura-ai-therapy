import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import App from './App'

// Mock the enhanced Gemini service
vi.mock('./services/enhancedGeminiService', () => import('./__mocks__/services/enhancedGeminiService'))

describe('App Component', () => {
  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('API_KEY', 'test-api-key')
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key')
    
    // Clear localStorage
    localStorage.clear()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders the main application', async () => {
    await act(async () => {
      render(<App />)
    })
    
    expect(screen.getByText('Aura')).toBeInTheDocument()
    expect(screen.getByText('Your AI therapy companion')).toBeInTheDocument()
  })

  it('shows initial greeting message', async () => {
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByText(/Hello, I'm Aura/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders without crashing when wrapped in ErrorBoundary', async () => {
    await act(async () => {
      expect(() => render(<App />)).not.toThrow()
    })
  })

  it('has proper accessibility structure', async () => {
    await act(async () => {
      render(<App />)
    })
    
    // Check for main landmarks
    expect(screen.getByRole('main')).toBeInTheDocument()
    
    // Wait for content to load before checking for other elements
    await waitFor(() => {
      expect(screen.getByText('Aura')).toBeInTheDocument()
    })
  })

  it('includes status indicator component', async () => {
    await act(async () => {
      render(<App />)
    })
    
    // Wait for the app to initialize and show the status indicator
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})