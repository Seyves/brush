import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    server: {
        port: 8001,
        host: true,
        strictPort: true,
    },
    preview: {
        port: 8001,
        host: true,
        strictPort: true,
    }
})
