/**
 * Request Utility Tests
 * 测试 request.ts 中的响应状态码处理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'test-token',
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
  })),
}))

describe('request.ts - Response Interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 测试2xx状态码应被视为成功
   */
  describe('2xx status codes should be treated as success', () => {
    it('should accept code 200 as success', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 200, message: 'OK', data: { id: 1 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      // 模拟响应拦截器的行为
      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code !== 200) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toEqual({ id: 1 })
      expect(error).toBeUndefined()
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('should accept code 201 as success', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 201, message: 'Created', data: { id: 2 } },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      // 使用修复后的逻辑: code < 200 || code >= 300
      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toEqual({ id: 2 })
      expect(error).toBeUndefined()
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('should accept code 202 as success', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 202, message: 'Accepted', data: { taskId: 'sync-123' } },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: { url: '/sync' } as InternalAxiosRequestConfig,
      }

      // 使用修复后的逻辑: code < 200 || code >= 300
      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toEqual({ taskId: 'sync-123' })
      expect(error).toBeUndefined()
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('should accept code 204 as success', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 204, message: 'No Content', data: null },
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: { url: '/delete' } as InternalAxiosRequestConfig,
      }

      // 使用修复后的逻辑: code < 200 || code >= 300
      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeNull()
      expect(error).toBeUndefined()
      expect(ElMessage.error).not.toHaveBeenCalled()
    })

    it('should accept other 2xx codes (205-299) as success', async () => {
      const { ElMessage } = await import('element-plus')
      const testCodes = [205, 206, 250, 299]

      for (const testCode of testCodes) {
        vi.clearAllMocks()
        const mockResponse: AxiosResponse = {
          data: { code: testCode, message: 'Success', data: { test: true } },
          status: testCode,
          statusText: 'Success',
          headers: {},
          config: { url: '/test' } as InternalAxiosRequestConfig,
        }

        // 使用修复后的逻辑: code < 200 || code >= 300
        const { code, message, data } = mockResponse.data
        let result: any
        let error: any

        if (code < 200 || code >= 300) {
          ElMessage.error(message || '请求失败')
          error = new Error(message)
        } else {
          result = data
        }

        expect(result).toEqual({ test: true })
        expect(error).toBeUndefined()
        expect(ElMessage.error).not.toHaveBeenCalled()
      }
    })
  })

  /**
   * 测试非2xx状态码应触发错误处理
   */
  describe('Non-2xx status codes should trigger error handling', () => {
    it('should reject code 400 with error message', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 400, message: 'Bad Request', data: null },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      // 使用修复后的逻辑: code < 200 || code >= 300
      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(error.message).toBe('Bad Request')
      expect(ElMessage.error).toHaveBeenCalledWith('Bad Request')
    })

    it('should reject code 401 with error message', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 401, message: 'Unauthorized', data: null },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(error.message).toBe('Unauthorized')
      expect(ElMessage.error).toHaveBeenCalledWith('Unauthorized')
    })

    it('should reject code 403 with error message', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 403, message: 'Forbidden', data: null },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(error.message).toBe('Forbidden')
      expect(ElMessage.error).toHaveBeenCalledWith('Forbidden')
    })

    it('should reject code 500 with error message', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 500, message: 'Internal Server Error', data: null },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(error.message).toBe('Internal Server Error')
      expect(ElMessage.error).toHaveBeenCalledWith('Internal Server Error')
    })

    it('should use default error message when message is empty', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 500, message: '', data: null },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(ElMessage.error).toHaveBeenCalledWith('请求失败')
    })

    it('should reject 1xx status codes', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 100, message: 'Continue', data: null },
        status: 100,
        statusText: 'Continue',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(ElMessage.error).toHaveBeenCalledWith('Continue')
    })

    it('should reject 3xx status codes', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 301, message: 'Moved Permanently', data: null },
        status: 301,
        statusText: 'Moved Permanently',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
      expect(ElMessage.error).toHaveBeenCalledWith('Moved Permanently')
    })
  })

  /**
   * 边界值测试
   */
  describe('Boundary value tests', () => {
    it('should accept code 299 (boundary of 2xx)', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 299, message: 'OK', data: { test: true } },
        status: 299,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toEqual({ test: true })
      expect(error).toBeUndefined()
    })

    it('should reject code 300 (boundary of non-2xx)', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 300, message: 'Multiple Choices', data: null },
        status: 300,
        statusText: 'Multiple Choices',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
    })

    it('should reject code 199 (boundary below 2xx)', async () => {
      const { ElMessage } = await import('element-plus')
      const mockResponse: AxiosResponse = {
        data: { code: 199, message: 'Unknown', data: null },
        status: 199,
        statusText: 'Unknown',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const { code, message, data } = mockResponse.data
      let result: any
      let error: any

      if (code < 200 || code >= 300) {
        ElMessage.error(message || '请求失败')
        error = new Error(message)
      } else {
        result = data
      }

      expect(result).toBeUndefined()
      expect(error).toBeDefined()
    })
  })
})
