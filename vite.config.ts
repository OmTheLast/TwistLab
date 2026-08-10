import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TwistLab/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['cubing'],
  },
})
