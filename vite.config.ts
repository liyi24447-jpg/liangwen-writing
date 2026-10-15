import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'

// 独立部署（非平台环境）时的安全默认值，避免构建期缺环境变量报错
process.env.CLIENT_BASE_PATH = process.env.MIAODA_APP_ID ? `/app/${process.env.MIAODA_APP_ID}` : ''
process.env.ASSETS_CDN_PATH = process.env.MIAODA_RESOURCE_CDN_PREFIX || '/'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
