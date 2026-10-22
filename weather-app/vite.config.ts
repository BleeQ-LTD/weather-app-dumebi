import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// One value per build. It is written into the app and into version.json,
// so the app can tell when a newer build has been deployed.
const version = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    {
      name: 'emit-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
      },
    },
  ],
  test: {
    environment: 'node',
  },
})