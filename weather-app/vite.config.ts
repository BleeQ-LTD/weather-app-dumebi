import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { readFileSync } from 'node:fs'

// The release number people see (bump it in package.json for each release),
// and a build ID that is different for every deploy. Both are written into
// the app and into version.json, so an open tab can tell a newer build is live.
const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const build = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? String(Date.now())

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD__: JSON.stringify(build),
  },
  plugins: [
    react(),
    {
      name: 'emit-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, build }) })
      },
    },
  ],
  server: {
    // The reset email links back to this address, so it must not change.
    port: 5174,
    strictPort: true,
    // In development, /api calls go to the Express server (npm run server).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'node',
  },
})