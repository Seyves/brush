import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    server: {
        port: 80,
        host: true,
        strictPort: true,
    },
    preview: {
        port: 80,
        host: true,
        strictPort: true,
    }
})
