# Aura - AI Therapy Companion

A production-ready AI therapy companion built with React, TypeScript, and Google's Gemini 2.5 Flash model with native audio capabilities.

## Features

- 🎙️ **Voice Conversations** - Natural speech recognition and AI-generated audio responses
- 🧠 **Evidence-Based Therapy** - Grounded in CBT and ACT therapeutic frameworks
- 🔄 **Real-time Streaming** - Live conversation with thinking process visibility
- 🛡️ **Error Resilience** - Comprehensive error handling with automatic retry logic
- 🎯 **Production Ready** - Full test coverage, TypeScript, and security headers
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Prerequisites

- **Node.js** (v18 or higher)
- **Gemini API Key** - Get from [Google AI Studio](https://aistudio.google.com/)

## Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd aura-ai-therapy
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your Gemini API key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # End-to-end tests
   npm run test:coverage # Coverage report
   ```

## Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to production:**
   ```bash
   npm run deploy
   ```

3. **Set environment variables in Vercel:**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add `GEMINI_API_KEY` with your API key

### Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder to your hosting provider**

3. **Configure environment variables** on your hosting platform

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `API_KEY` | Legacy support (same as GEMINI_API_KEY) | No |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Lint code with ESLint |
| `npm run typecheck` | Type check with TypeScript |
| `npm run deploy` | Deploy to Vercel production |
| `npm run deploy:dev` | Deploy to Vercel preview |

## Architecture

- **Frontend**: React 19 with TypeScript
- **AI Model**: Gemini 2.5 Flash Experimental with native audio
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library + Playwright
- **Error Handling**: Custom error service with retry logic
- **Audio**: Web Speech API + native AI audio generation

## Security

- Content Security Policy headers
- XSS protection
- Frame options security
- Secure environment variable handling
- Input validation and sanitization

## Browser Support

- Modern browsers with Web Speech API support
- Chrome/Edge (recommended for best audio experience)
- Safari and Firefox (basic functionality)

## License

MIT License - see LICENSE file for details
