# Deployment Guide

## Option 1: Direct Upload to Vercel (Recommended)

1. **Go to [vercel.com](https://vercel.com) and sign up/login**

2. **Create new project:**
   - Click "New Project"
   - Import from Git or upload the `dist/` folder directly

3. **Configure environment variables:**
   - Go to Settings > Environment Variables
   - Add: `GEMINI_API_KEY` = `AIzaSyCWfxF9fHIyJtPxnt0NplSHLZCkmY-eBrw`
   - Add: `API_KEY` = `AIzaSyCWfxF9fHIyJtPxnt0NplSHLZCkmY-eBrw`

4. **Deploy:**
   - Vercel will automatically deploy your app
   - You'll get a URL like: `https://your-app-name.vercel.app`

## Option 2: GitHub + Vercel Integration

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Aura AI Therapy App"
   git remote add origin https://github.com/yourusername/aura-ai-therapy.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to vercel.com
   - Import from GitHub
   - Select your repository
   - Configure environment variables as above

## Option 3: Netlify

1. **Go to [netlify.com](https://netlify.com)**
2. **Drag and drop the `dist/` folder**
3. **Configure environment variables in site settings**

## Option 4: Railway

1. **Go to [railway.app](https://railway.app)**
2. **Deploy from GitHub or upload directly**
3. **Set environment variables**

## Your Built Application

The `dist/` folder contains your production-ready application:
- `index.html` - Main HTML file
- `assets/` - JavaScript and CSS bundles
- Ready to deploy to any static hosting service