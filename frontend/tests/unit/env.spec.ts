import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

describe('Environment Configuration', () => {
  const envPath = resolve(process.cwd(), '.env')
  const envExamplePath = resolve(process.cwd(), '.env.example')
  const gitignorePath = resolve(process.cwd(), '.gitignore')

  describe('.env file', () => {
    it('should exist', () => {
      expect(existsSync(envPath)).toBe(true)
    })

    it('should contain VITE_API_BASE_URL', () => {
      const content = readFileSync(envPath, 'utf-8')
      expect(content).toContain('VITE_API_BASE_URL=')
    })

    it('should have correct API base URL', () => {
      const content = readFileSync(envPath, 'utf-8')
      expect(content).toContain('VITE_API_BASE_URL=http://localhost:8000/api/v1')
    })

    it('should contain VITE_APP_TITLE', () => {
      const content = readFileSync(envPath, 'utf-8')
      expect(content).toContain('VITE_APP_TITLE=')
    })

    it('should contain VITE_APP_VERSION', () => {
      const content = readFileSync(envPath, 'utf-8')
      expect(content).toContain('VITE_APP_VERSION=')
    })
  })

  describe('.env.example file', () => {
    it('should exist', () => {
      expect(existsSync(envExamplePath)).toBe(true)
    })
  })

  describe('.gitignore', () => {
    it('should exist', () => {
      expect(existsSync(gitignorePath)).toBe(true)
    })

    it('should ignore .env file', () => {
      const content = readFileSync(gitignorePath, 'utf-8')
      const lines = content.split('\n')
      const hasEnvEntry = lines.some(line => {
        const trimmed = line.trim()
        return trimmed === '.env' || trimmed.startsWith('.env ')
      })
      expect(hasEnvEntry).toBe(true)
    })
  })
})
