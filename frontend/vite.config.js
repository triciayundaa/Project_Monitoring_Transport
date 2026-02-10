import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Monitoring Transportasi Semen Padang',
        short_name: 'MonTrans',
        description: 'Aplikasi Monitoring Transportasi & Gudang',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Pastikan ini standalone
        orientation: 'portrait', // <--- TAMBAHAN: Agar tidak auto-rotate aneh
        scope: '/',             // <--- TAMBAHAN PENTING
        start_url: '/',         // <--- TAMBAHAN PENTING
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
  }
})