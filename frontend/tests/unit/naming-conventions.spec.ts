/**
 * 命名规范注释测试
 * 验证关键转换点是否包含 camelCase/snake_case 命名规范注释
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../')

/**
 * 读取文件内容
 */
function readFile(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), 'utf-8')
}

describe('命名规范注释检查', () => {
  describe('auth.ts - 认证状态管理', () => {
    const content = readFile('src/stores/auth.ts')

    it('应在 refreshAccessToken 函数中包含后端响应格式注释', () => {
      // 检查是否包含后端返回 snake_case 的注释
      const hasBackendResponseComment =
        content.includes('后端') &&
        content.includes('snake_case') &&
        content.includes('access_token')

      expect(hasBackendResponseComment).toBe(true)
    })

    it('应在 token 转换处包含命名规范注释', () => {
      // 检查 refreshAccessToken 函数区域是否有命名规范注释
      // 查找函数定义开始位置
      const funcStartIndex = content.indexOf('const refreshAccessToken')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        // 提取函数内容 (到下一个 "const " 或文件结束)
        const nextFuncIndex = content.indexOf('const fetchCurrentUser', funcStartIndex)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase')

        expect(hasNamingComment).toBe(true)
      }
    })
  })

  describe('api/auth.ts - 认证API', () => {
    const content = readFile('src/api/auth.ts')

    it('应在 refreshToken 函数中包含命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const refreshToken')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase') ||
          funcContent.includes('后端返回') ||
          funcContent.includes('前端使用')

        expect(hasNamingComment).toBe(true)
      }
    })
  })

  describe('api/user.ts - 用户API', () => {
    const content = readFile('src/api/user.ts')

    it('应在 changePassword 函数中包含参数命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const changePassword')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        // 检查 old_password/new_password 参数是否有注释
        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('后端') ||
          funcContent.includes('API使用')

        expect(hasNamingComment).toBe(true)
      }
    })
  })

  describe('api/project.ts - 项目API', () => {
    const content = readFile('src/api/project.ts')

    it('应在 addProjectMember 函数中包含参数命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const addProjectMember')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        // 检查 user_id 参数是否有命名规范注释
        const hasNamingComment =
          funcContent.includes('snake_case') ||
          (funcContent.includes('user_id') && funcContent.includes('后端')) ||
          funcContent.includes('API使用')

        expect(hasNamingComment).toBe(true)
      }
    })
  })

  describe('api/stats.ts - 统计API', () => {
    const content = readFile('src/api/stats.ts')

    it('应在参数转换处包含命名规范注释', () => {
      // 检查 getPersonalHeatmap 函数
      const funcStartIndex = content.indexOf('export const getPersonalHeatmap')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        // 检查 userId -> user_id, metricType -> metric_type 转换是否有注释
        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase') ||
          funcContent.includes('转换') ||
          funcContent.includes('后端使用')

        expect(hasNamingComment).toBe(true)
      }
    })

    it('应在 getHeatmapData 函数中包含参数命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const getHeatmapData')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase') ||
          funcContent.includes('转换')

        expect(hasNamingComment).toBe(true)
      }
    })

    it('应在 getPersonalActivityHours 函数中包含参数命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const getPersonalActivityHours')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase') ||
          funcContent.includes('转换')

        expect(hasNamingComment).toBe(true)
      }
    })
  })

  describe('api/cache.ts - 缓存API', () => {
    const content = readFile('src/api/cache.ts')

    it('应在 clearAllCache 函数中包含参数命名规范注释', () => {
      const funcStartIndex = content.indexOf('export const clearAllCache')
      expect(funcStartIndex).toBeGreaterThan(-1)

      if (funcStartIndex > -1) {
        const nextFuncIndex = content.indexOf('export const', funcStartIndex + 1)
        const funcContent = content.substring(funcStartIndex, nextFuncIndex > -1 ? nextFuncIndex : undefined)

        // 检查 cacheType -> cache_type, userId -> user_id 等转换是否有注释
        const hasNamingComment =
          funcContent.includes('snake_case') ||
          funcContent.includes('camelCase') ||
          funcContent.includes('转换') ||
          funcContent.includes('后端')

        expect(hasNamingComment).toBe(true)
      }
    })
  })
})
