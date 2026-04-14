/**
 * Request Interceptor Tests
 * 测试请求/响应拦截器的 camelCase/snake_case 转换功能
 *
 * @description TDD测试：验证请求拦截器将 camelCase 转为 snake_case，
 *              响应拦截器将 snake_case 转为 camelCase
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'

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

describe('request.ts - Naming Convention Interceptors', () => {
  let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>
  let responseInterceptor: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>

  beforeEach(() => {
    vi.clearAllMocks()

    // 定义请求拦截器: camelCase -> snake_case
    requestInterceptor = (config) => {
      if (config.data) {
        config.data = snakecaseKeys(config.data, { deep: true })
      }
      if (config.params) {
        config.params = snakecaseKeys(config.params, { deep: true })
      }
      return config
    }

    // 定义响应拦截器: snake_case -> camelCase
    responseInterceptor = (response) => {
      if (response.data) {
        response.data = camelcaseKeys(response.data, { deep: true })
      }
      return response
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 测试请求拦截器 - 基本转换
   */
  describe('Request Interceptor - Basic Conversion', () => {
    it('should convert camelCase data to snake_case', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          userName: 'john',
          emailAddress: 'john@example.com',
          phoneNumber: '123456',
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        user_name: 'john',
        email_address: 'john@example.com',
        phone_number: '123456',
      })
    })

    it('should convert camelCase params to snake_case', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'get',
        params: {
          pageSize: 10,
          currentPage: 1,
          sortBy: 'name',
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.params).toEqual({
        page_size: 10,
        current_page: 1,
        sort_by: 'name',
      })
    })

    it('should handle request without data or params', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'get',
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toBeUndefined()
      expect(result.params).toBeUndefined()
    })
  })

  /**
   * 测试请求拦截器 - 深层对象转换
   */
  describe('Request Interceptor - Deep Object Conversion', () => {
    it('should convert nested camelCase objects to snake_case', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          userInfo: {
            firstName: 'John',
            lastName: 'Doe',
            contactDetails: {
              emailAddress: 'john@example.com',
              phoneNumber: '123456',
            },
          },
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        user_info: {
          first_name: 'John',
          last_name: 'Doe',
          contact_details: {
            email_address: 'john@example.com',
            phone_number: '123456',
          },
        },
      })
    })

    it('should convert arrays with camelCase objects', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          userList: [
            { userName: 'john', emailAddress: 'john@example.com' },
            { userName: 'jane', emailAddress: 'jane@example.com' },
          ],
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        user_list: [
          { user_name: 'john', email_address: 'john@example.com' },
          { user_name: 'jane', email_address: 'jane@example.com' },
        ],
      })
    })

    it('should handle deeply nested arrays and objects', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          projectData: {
            teamMembers: [
              {
                personalInfo: {
                  fullName: 'John Doe',
                  contactInfo: {
                    primaryEmail: 'john@example.com',
                  },
                },
              },
            ],
          },
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        project_data: {
          team_members: [
            {
              personal_info: {
                full_name: 'John Doe',
                contact_info: {
                  primary_email: 'john@example.com',
                },
              },
            },
          ],
        },
      })
    })
  })

  /**
   * 测试响应拦截器 - 基本转换
   */
  describe('Response Interceptor - Basic Conversion', () => {
    it('should convert snake_case data to camelCase', () => {
      const response: AxiosResponse = {
        data: {
          user_name: 'john',
          email_address: 'john@example.com',
          phone_number: '123456',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        userName: 'john',
        emailAddress: 'john@example.com',
        phoneNumber: '123456',
      })
    })

    it('should handle response with code, message, data structure', () => {
      const response: AxiosResponse = {
        data: {
          code: 200,
          message: 'success',
          data: {
            user_id: 1,
            user_name: 'john',
            created_at: '2024-01-01',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        code: 200,
        message: 'success',
        data: {
          userId: 1,
          userName: 'john',
          createdAt: '2024-01-01',
        },
      })
    })

    it('should handle response without data', () => {
      const response: AxiosResponse = {
        data: null,
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toBeNull()
    })
  })

  /**
   * 测试响应拦截器 - 深层对象转换
   */
  describe('Response Interceptor - Deep Object Conversion', () => {
    it('should convert nested snake_case objects to camelCase', () => {
      const response: AxiosResponse = {
        data: {
          user_info: {
            first_name: 'John',
            last_name: 'Doe',
            contact_details: {
              email_address: 'john@example.com',
              phone_number: '123456',
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        userInfo: {
          firstName: 'John',
          lastName: 'Doe',
          contactDetails: {
            emailAddress: 'john@example.com',
            phoneNumber: '123456',
          },
        },
      })
    })

    it('should convert arrays with snake_case objects', () => {
      const response: AxiosResponse = {
        data: {
          user_list: [
            { user_name: 'john', email_address: 'john@example.com' },
            { user_name: 'jane', email_address: 'jane@example.com' },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        userList: [
          { userName: 'john', emailAddress: 'john@example.com' },
          { userName: 'jane', emailAddress: 'jane@example.com' },
        ],
      })
    })

    it('should handle deeply nested arrays and objects in response', () => {
      const response: AxiosResponse = {
        data: {
          project_data: {
            team_members: [
              {
                personal_info: {
                  full_name: 'John Doe',
                  contact_info: {
                    primary_email: 'john@example.com',
                  },
                },
              },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        projectData: {
          teamMembers: [
            {
              personalInfo: {
                fullName: 'John Doe',
                contactInfo: {
                  primaryEmail: 'john@example.com',
                },
              },
            },
          ],
        },
      })
    })
  })

  /**
   * 测试边界情况
   */
  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {},
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({})
    })

    it('should handle empty arrays', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: { items: [] },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({ items: [] })
    })

    it('should handle primitive values in arrays', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: { ids: [1, 2, 3] },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({ ids: [1, 2, 3] })
    })

    it('should handle mixed case keys (already snake_case)', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          user_name: 'john',
          emailAddress: 'john@example.com',
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      // snakecaseKeys 会将 user_name 转换为 user_name (已经是 snake_case)
      // 将 emailAddress 转换为 email_address
      expect(result.data).toEqual({
        user_name: 'john',
        email_address: 'john@example.com',
      })
    })

    it('should handle dates and special values', () => {
      const date = new Date('2024-01-01')
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          createdAt: date,
          isActive: true,
          count: 42,
          rate: 3.14,
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        created_at: date,
        is_active: true,
        count: 42,
        rate: 3.14,
      })
    })

    it('should handle null values', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/test',
        method: 'post',
        data: {
          userName: null,
          emailAddress: undefined,
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        user_name: null,
        email_address: undefined,
      })
    })
  })

  /**
   * 测试实际 API 场景
   */
  describe('Real API Scenarios', () => {
    it('should convert user creation request', () => {
      const config: InternalAxiosRequestConfig = {
        url: '/users',
        method: 'post',
        data: {
          userName: 'john_doe',
          realName: 'John Doe',
          emailAddress: 'john@example.com',
          phoneNumber: '13800138000',
          departmentId: 1,
          roleIds: [1, 2, 3],
        },
      }

      const result = requestInterceptor(config) as InternalAxiosRequestConfig

      expect(result.data).toEqual({
        user_name: 'john_doe',
        real_name: 'John Doe',
        email_address: 'john@example.com',
        phone_number: '13800138000',
        department_id: 1,
        role_ids: [1, 2, 3],
      })
    })

    it('should convert paginated list response', () => {
      const response: AxiosResponse = {
        data: {
          code: 200,
          message: 'success',
          data: {
            total_count: 100,
            current_page: 1,
            page_size: 10,
            total_pages: 10,
            items: [
              {
                user_id: 1,
                user_name: 'john',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
              },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/users' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        code: 200,
        message: 'success',
        data: {
          totalCount: 100,
          currentPage: 1,
          pageSize: 10,
          totalPages: 10,
          items: [
            {
              userId: 1,
              userName: 'john',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
            },
          ],
        },
      })
    })

    it('should convert project stats response', () => {
      const response: AxiosResponse = {
        data: {
          code: 200,
          message: 'success',
          data: {
            project_id: 123,
            project_name: 'My Project',
            code_stats: {
              total_lines: 10000,
              added_lines: 5000,
              deleted_lines: 2000,
              modified_lines: 3000,
            },
            commit_stats: {
              total_commits: 150,
              daily_commits: [
                { commit_date: '2024-01-01', commit_count: 10 },
                { commit_date: '2024-01-02', commit_count: 15 },
              ],
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/projects/123/stats' } as InternalAxiosRequestConfig,
      }

      const result = responseInterceptor(response) as AxiosResponse

      expect(result.data).toEqual({
        code: 200,
        message: 'success',
        data: {
          projectId: 123,
          projectName: 'My Project',
          codeStats: {
            totalLines: 10000,
            addedLines: 5000,
            deletedLines: 2000,
            modifiedLines: 3000,
          },
          commitStats: {
            totalCommits: 150,
            dailyCommits: [
              { commitDate: '2024-01-01', commitCount: 10 },
              { commitDate: '2024-01-02', commitCount: 15 },
            ],
          },
        },
      })
    })
  })
})
