import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: true,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // 配置 chunk 分割策略
    rollupOptions: {
      output: {
        // 手动分块策略
        manualChunks: {
          // 将第三方库打包到单独的 chunk
          'vendor': ['vue', 'vue-router', 'pinia', 'axios'],
          // UI 库单独打包
          'ui': ['element-plus', '@element-plus/icons-vue'],
          // 图表库单独打包
          'charts': ['echarts'],
        },
        // 动态导入的 chunk 命名规则
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const _ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.(css)$/i.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[ext]/[name]-[hash][extname]'
        },
      },
    },
    // 代码分割配置
    chunkSizeWarningLimit: 500,
    // 开启 CSS 代码分割
    cssCodeSplit: true,
    // 开启 source map（生产环境可关闭）
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
