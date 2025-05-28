import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' && process.env.BUILD_TARGET === 'github' 
    ? '/Rutherford-Model/' 
    : './',
  plugins: [react()],
  build: {
    outDir: 'dist-frontend'
  }
}))
