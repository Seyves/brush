import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    server: {
        port: 8003,
        host: true,
        strictPort: true,
    },
    preview: {
        port: 8003,
        host: true,
        strictPort: true,
    }
})
