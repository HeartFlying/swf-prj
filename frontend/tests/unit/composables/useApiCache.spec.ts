import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApiCache } from '@/composables/useApiCache'

describe('useApiCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('缓存接口和配置', () => {
    it('应该返回缓存操作函数', () => {
      const cache = useApiCache()

      expect(cache.getCachedData).toBeInstanceOf(Function)
      expect(cache.setCachedData).toBeInstanceOf(Function)
      expect(cache.clearCache).toBeInstanceOf(Function)
      expect(cache.clearExpiredCache).toBeInstanceOf(Function)
      expect(cache.getCacheSize).toBeInstanceOf(Function)
    })

    it('应该支持自定义配置选项', () => {
      const customConfig = {
        defaultTTL: 60000,
        maxCacheSize: 100,
      }
      const cache = useApiCache(customConfig)

      expect(cache.getCacheSize()).toBe(0)
    })
  })

  describe('内存缓存机制', () => {
    it('应该能够存储和获取缓存数据', () => {
      const cache = useApiCache()
      const key = 'test-key'
      const data = { id: 1, name: 'Test' }

      cache.setCachedData(key, data)
      const result = cache.getCachedData(key)

      expect(result).toEqual(data)
    })

    it('应该为不同的key存储独立的数据', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 })
      cache.setCachedData('key2', { value: 2 })

      expect(cache.getCachedData('key1')).toEqual({ value: 1 })
      expect(cache.getCachedData('key2')).toEqual({ value: 2 })
    })

    it('获取不存在的key应该返回null', () => {
      const cache = useApiCache()

      const result = cache.getCachedData('non-existent-key')

      expect(result).toBeNull()
    })

    it('应该正确追踪缓存大小', () => {
      const cache = useApiCache()

      expect(cache.getCacheSize()).toBe(0)

      cache.setCachedData('key1', { value: 1 })
      expect(cache.getCacheSize()).toBe(1)

      cache.setCachedData('key2', { value: 2 })
      expect(cache.getCacheSize()).toBe(2)
    })
  })

  describe('缓存过期时间', () => {
    it('应该支持自定义TTL', () => {
      const cache = useApiCache()
      const key = 'test-key'
      const data = { value: 'test' }

      cache.setCachedData(key, data, 5000) // 5秒TTL
      expect(cache.getCachedData(key)).toEqual(data)

      // 前进4秒，缓存仍有效
      vi.advanceTimersByTime(4000)
      expect(cache.getCachedData(key)).toEqual(data)

      // 前进2秒（总共6秒），缓存过期
      vi.advanceTimersByTime(2000)
      expect(cache.getCachedData(key)).toBeNull()
    })

    it('应该使用默认TTL', () => {
      const cache = useApiCache({ defaultTTL: 10000 }) // 默认10秒
      const key = 'test-key'

      cache.setCachedData(key, { value: 'test' })

      // 前进9秒，缓存仍有效
      vi.advanceTimersByTime(9000)
      expect(cache.getCachedData(key)).toEqual({ value: 'test' })

      // 前进2秒（总共11秒），缓存过期
      vi.advanceTimersByTime(2000)
      expect(cache.getCachedData(key)).toBeNull()
    })

    it('TTL为0应该表示永不过期', () => {
      const cache = useApiCache()
      const key = 'test-key'

      cache.setCachedData(key, { value: 'test' }, 0)

      // 前进很长时间
      vi.advanceTimersByTime(1000 * 60 * 60 * 24) // 1天
      expect(cache.getCachedData(key)).toEqual({ value: 'test' })
    })

    it('应该自动清理过期缓存项', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 }, 5000)
      cache.setCachedData('key2', { value: 2 }, 10000)

      vi.advanceTimersByTime(6000)

      // key1过期，key2仍然有效
      expect(cache.getCachedData('key1')).toBeNull()
      expect(cache.getCachedData('key2')).toEqual({ value: 2 })
    })
  })

  describe('手动清除缓存', () => {
    it('应该能够清除特定key的缓存', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 })
      cache.setCachedData('key2', { value: 2 })

      cache.clearCache('key1')

      expect(cache.getCachedData('key1')).toBeNull()
      expect(cache.getCachedData('key2')).toEqual({ value: 2 })
    })

    it('应该能够清除所有缓存', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 })
      cache.setCachedData('key2', { value: 2 })
      cache.setCachedData('key3', { value: 3 })

      cache.clearCache()

      expect(cache.getCachedData('key1')).toBeNull()
      expect(cache.getCachedData('key2')).toBeNull()
      expect(cache.getCachedData('key3')).toBeNull()
      expect(cache.getCacheSize()).toBe(0)
    })

    it('清除不存在的key不应该报错', () => {
      const cache = useApiCache()

      expect(() => cache.clearCache('non-existent')).not.toThrow()
    })
  })

  describe('清理过期缓存', () => {
    it('应该能够手动清理所有过期缓存', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 }, 5000)
      cache.setCachedData('key2', { value: 2 }, 10000)
      cache.setCachedData('key3', { value: 3 }, 0) // 永不过期

      vi.advanceTimersByTime(6000)

      const clearedCount = cache.clearExpiredCache()

      expect(clearedCount).toBe(1) // 只清理了key1
      expect(cache.getCacheSize()).toBe(2)
      expect(cache.getCachedData('key1')).toBeNull()
      expect(cache.getCachedData('key2')).toEqual({ value: 2 })
      expect(cache.getCachedData('key3')).toEqual({ value: 3 })
    })
  })

  describe('缓存大小限制', () => {
    it('应该支持最大缓存大小限制', () => {
      const cache = useApiCache({ maxCacheSize: 3 })

      cache.setCachedData('key1', { value: 1 })
      cache.setCachedData('key2', { value: 2 })
      cache.setCachedData('key3', { value: 3 })

      expect(cache.getCacheSize()).toBe(3)

      // 添加第4个应该移除最旧的
      cache.setCachedData('key4', { value: 4 })

      expect(cache.getCacheSize()).toBe(3)
      expect(cache.getCachedData('key1')).toBeNull()
      expect(cache.getCachedData('key2')).toEqual({ value: 2 })
      expect(cache.getCachedData('key4')).toEqual({ value: 4 })
    })
  })

  describe('缓存元数据', () => {
    it('应该返回缓存项的元数据', () => {
      const cache = useApiCache()
      const now = Date.now()

      cache.setCachedData('key1', { value: 1 }, 5000)

      const meta = cache.getCacheMeta('key1')

      expect(meta).not.toBeNull()
      expect(meta?.createdAt).toBeGreaterThanOrEqual(now)
      expect(meta?.expiresAt).toBe(meta!.createdAt + 5000)
      expect(meta?.ttl).toBe(5000)
    })

    it('获取不存在key的元数据应该返回null', () => {
      const cache = useApiCache()

      const meta = cache.getCacheMeta('non-existent')

      expect(meta).toBeNull()
    })
  })

  describe('缓存统计信息', () => {
    it('应该返回缓存统计信息', () => {
      const cache = useApiCache()

      cache.setCachedData('key1', { value: 1 }, 5000)
      cache.setCachedData('key2', { value: 2 }, 10000)
      cache.setCachedData('key3', { value: 3 }, 0)

      vi.advanceTimersByTime(6000)

      const stats = cache.getCacheStats()

      expect(stats.total).toBe(3)
      expect(stats.valid).toBe(2)
      expect(stats.expired).toBe(1)
    })
  })

  describe('缓存包装器', () => {
    it('应该包装异步函数并缓存结果', async () => {
      const cache = useApiCache()
      const fetchFn = vi.fn().mockResolvedValue({ data: 'result' })
      const key = 'api-call'

      // 第一次调用应该执行函数
      const result1 = await cache.wrap(key, fetchFn)
      expect(result1).toEqual({ data: 'result' })
      expect(fetchFn).toHaveBeenCalledTimes(1)

      // 第二次调用应该返回缓存
      const result2 = await cache.wrap(key, fetchFn)
      expect(result2).toEqual({ data: 'result' })
      expect(fetchFn).toHaveBeenCalledTimes(1) // 没有再次调用
    })

    it('包装器应该支持自定义TTL', async () => {
      const cache = useApiCache()
      const fetchFn = vi.fn().mockResolvedValue({ data: 'result' })

      await cache.wrap('key', fetchFn, 5000)

      vi.advanceTimersByTime(6000)

      // 缓存过期，应该重新调用
      await cache.wrap('key', fetchFn, 5000)
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it('包装器应该正确处理错误', async () => {
      const cache = useApiCache()
      const error = new Error('API Error')
      const fetchFn = vi.fn().mockRejectedValue(error)

      await expect(cache.wrap('key', fetchFn)).rejects.toThrow('API Error')
      expect(cache.getCacheSize()).toBe(0) // 错误不应该被缓存
    })
  })
})
