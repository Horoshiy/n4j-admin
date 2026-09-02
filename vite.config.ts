import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Конфиг для админки n4j.dinamchiki.ru.
// - alias @/* → src/* для FSD-импортов
// - SCSS auto-import variables (design tokens доступны во всех <style lang="scss">)
// - dev-server на 5173, хост 127.0.0.1
// - dev-proxy /query → https://n4j.dinamchiki.ru/query (same-origin из браузера,
//   иначе CDP-браузер в некоторых sandbox не делает cross-origin HTTPS из HTTP-origin).
//   На проде тот же /query — статика и API на одном домене, proxy не нужен.
// - в проде билд → dist/, раздаётся через /etc/caddy/addons/n4j-admin-ui.conf
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Каждый <style lang="scss" scoped> получает токены автоматически
        additionalData: `@use "@/app/styles/variables" as *;`,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // /query* уходит на прод-бэкенд. На проде этот proxy не активен —
      // бандл и бэкенд живут на одном домене.
      '/query': {
        target: 'https://n4j.dinamchiki.ru',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/query/, '/query'),
      },
      '/healthz': {
        target: 'https://n4j.dinamchiki.ru',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
})
