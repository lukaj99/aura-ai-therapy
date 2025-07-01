import { test, expect, Page } from '@playwright/test'

test.describe('AI Therapy Chat Application', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock the Gemini API
    await page.route('**/v1beta/models/gemini-2.5-flash-exp-native-audio-thinking-dialog:streamGenerateContent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: 'Thank you for sharing that with me. How are you feeling right now?' }],
              role: 'model'
            }
          }]
        })
      })
    })

    await page.goto('/')
  })

  test('displays initial state correctly', async ({ page }) => {
    // Check if the main elements are visible
    await expect(page.locator('h1')).toContainText('Aura')
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible()
    await expect(page.getByText('Start Session')).toBeVisible()
    
    // Check voice selector is present
    await expect(page.locator('text=Voice:')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('voice selector works correctly', async ({ page }) => {
    const voiceSelect = page.locator('select')
    
    // Check default value
    await expect(voiceSelect).toHaveValue('female')
    
    // Change to male voice
    await voiceSelect.selectOption('male')
    await expect(voiceSelect).toHaveValue('male')
    
    // Change back to female voice
    await voiceSelect.selectOption('female')
    await expect(voiceSelect).toHaveValue('female')
  })

  test('start session button interaction', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /start session/i })
    
    // Mock getUserMedia for microphone access
    await page.addInitScript(() => {
      // Mock navigator.mediaDevices.getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
        }
      })
      
      // Mock SpeechRecognition
      window.SpeechRecognition = class MockSpeechRecognition {
        continuous = true
        interimResults = true
        lang = 'en-US'
        onresult = null
        onerror = null
        onstart = null
        onend = null
        
        start() {
          setTimeout(() => {
            if (this.onstart) this.onstart({})
          }, 100)
        }
        
        stop() {
          setTimeout(() => {
            if (this.onend) this.onend({})
          }, 100)
        }
        
        abort() {
          this.stop()
        }
        
        addEventListener() {}
        removeEventListener() {}
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
    })
    
    // Click start session
    await startButton.click()
    
    // Should transition to listening state
    await expect(page.getByText('Listening...')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /listening/i })).toBeVisible()
  })

  test('displays conversation messages', async ({ page }) => {
    // Mock speech recognition and audio
    await page.addInitScript(() => {
      // Mock navigator.mediaDevices.getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
        }
      })
      
      // Mock SpeechRecognition
      window.SpeechRecognition = class MockSpeechRecognition {
        continuous = true
        interimResults = true
        lang = 'en-US'
        onresult = null
        onerror = null
        onstart = null
        onend = null
        
        start() {
          setTimeout(() => {
            if (this.onstart) this.onstart({})
            // Simulate speech recognition result
            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [{
                    0: { transcript: 'I feel anxious about work' },
                    isFinal: true
                  }]
                })
              }
            }, 1000)
          }, 100)
        }
        
        stop() {
          setTimeout(() => {
            if (this.onend) this.onend({})
          }, 100)
        }
        
        abort() {
          this.stop()
        }
        
        addEventListener() {}
        removeEventListener() {}
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
    })
    
    // Start session
    await page.getByRole('button', { name: /start session/i }).click()
    
    // Wait for the conversation to appear
    await expect(page.getByText('I feel anxious about work')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Thank you for sharing that with me')).toBeVisible({ timeout: 15000 })
  })

  test('handles error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/v1beta/models/gemini-2.5-flash-exp-native-audio-thinking-dialog:streamGenerateContent*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    // Mock speech recognition
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () => Promise.resolve({
            getTracks: () => [{ stop: () => {} }]
          })
        }
      })
      
      window.SpeechRecognition = class MockSpeechRecognition {
        start() {
          setTimeout(() => {
            if (this.onstart) this.onstart({})
            // Simulate speech recognition
            setTimeout(() => {
              if (this.onresult) {
                this.onresult({
                  results: [{
                    0: { transcript: 'Hello' },
                    isFinal: true
                  }]
                })
              }
            }, 1000)
          }, 100)
        }
        stop() {}
        addEventListener() {}
        removeEventListener() {}
        continuous = true
        interimResults = true
        lang = 'en-US'
        onresult = null
        onerror = null
        onstart = null
        onend = null
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
    })
    
    // Start session
    await page.getByRole('button', { name: /start session/i }).click()
    
    // Should eventually show error state
    await expect(page.getByText('Error, Click to Retry')).toBeVisible({ timeout: 15000 })
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check elements are still visible and usable
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
    
    // Check button is large enough for touch interaction
    const button = page.getByRole('button', { name: /start session/i })
    const boundingBox = await button.boundingBox()
    
    expect(boundingBox?.width).toBeGreaterThan(44) // Minimum touch target size
    expect(boundingBox?.height).toBeGreaterThan(44)
  })

  test('keyboard navigation works correctly', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('select')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /start session/i })).toBeFocused()
    
    // Test button activation with keyboard
    await page.keyboard.press('Enter')
    // Should start the session (would need more mocking for full test)
  })
})