import { defineConfig } from 'vitest/config'

// @gamepark/rules-api uses directory imports that Node ESM cannot resolve: let Vite process it
export default defineConfig({
  test: { server: { deps: { inline: [/@gamepark/] } } }
})
