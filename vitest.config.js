import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: { BCRYPT_CUSTO: '4', NODE_ENV: 'test' },
  },
})
