import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatusIndicator from './StatusIndicator'
import { SessionStatus } from '../types'

describe('StatusIndicator', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    mockOnClick.mockClear()
  })

  describe('Status Display', () => {
    it('renders idle state correctly', () => {
      render(<StatusIndicator status={SessionStatus.IDLE} onClick={mockOnClick} />)
      
      expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument()
      expect(screen.getByText('Start Session')).toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('renders listening state correctly', () => {
      render(<StatusIndicator status={SessionStatus.LISTENING} onClick={mockOnClick} />)
      
      expect(screen.getByRole('button', { name: /listening/i })).toBeInTheDocument()
      expect(screen.getByText('Listening...')).toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('renders thinking state correctly', () => {
      render(<StatusIndicator status={SessionStatus.THINKING} onClick={mockOnClick} />)
      
      expect(screen.getByRole('button', { name: /thinking/i })).toBeInTheDocument()
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('renders speaking state correctly', () => {
      render(<StatusIndicator status={SessionStatus.SPEAKING} onClick={mockOnClick} />)
      
      expect(screen.getByRole('button', { name: /aura is speaking/i })).toBeInTheDocument()
      expect(screen.getByText('Aura is speaking...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('renders error state correctly', () => {
      render(<StatusIndicator status={SessionStatus.ERROR} onClick={mockOnClick} />)
      
      expect(screen.getByRole('button', { name: /error, click to retry/i })).toBeInTheDocument()
      expect(screen.getByText('Error, Click to Retry')).toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('Button Interaction', () => {
    it('calls onClick when button is clicked in idle state', () => {
      render(<StatusIndicator status={SessionStatus.IDLE} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when button is clicked in listening state', () => {
      render(<StatusIndicator status={SessionStatus.LISTENING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when button is clicked in error state', () => {
      render(<StatusIndicator status={SessionStatus.ERROR} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when button is disabled in thinking state', () => {
      render(<StatusIndicator status={SessionStatus.THINKING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when button is disabled in speaking state', () => {
      render(<StatusIndicator status={SessionStatus.SPEAKING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('CSS Classes', () => {
    it('applies correct classes for idle state', () => {
      render(<StatusIndicator status={SessionStatus.IDLE} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-brand-secondary', 'hover:bg-blue-500')
    })

    it('applies correct classes for listening state', () => {
      render(<StatusIndicator status={SessionStatus.LISTENING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-red-500', 'hover:bg-red-600', 'animate-pulse-glow')
    })

    it('applies correct classes for thinking state', () => {
      render(<StatusIndicator status={SessionStatus.THINKING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-yellow-500', 'cursor-not-allowed')
    })

    it('applies correct classes for speaking state', () => {
      render(<StatusIndicator status={SessionStatus.SPEAKING} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-purple-500', 'cursor-not-allowed')
    })

    it('applies correct classes for error state', () => {
      render(<StatusIndicator status={SessionStatus.ERROR} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gray-700', 'hover:bg-gray-600')
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for each state', () => {
      const states = [
        { status: SessionStatus.IDLE, label: 'Start Session' },
        { status: SessionStatus.LISTENING, label: 'Listening...' },
        { status: SessionStatus.THINKING, label: 'Thinking...' },
        { status: SessionStatus.SPEAKING, label: 'Aura is speaking...' },
        { status: SessionStatus.ERROR, label: 'Error, Click to Retry' },
      ]

      states.forEach(({ status, label }) => {
        const { unmount } = render(<StatusIndicator status={status} onClick={mockOnClick} />)
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
        unmount()
      })
    })

    it('has focus styles for keyboard navigation', () => {
      render(<StatusIndicator status={SessionStatus.IDLE} onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-4', 'focus:ring-blue-300/50')
    })
  })
})