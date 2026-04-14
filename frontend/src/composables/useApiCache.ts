/**
 * API 数据缓存组合式函数
 * 提供内存缓存机制，支持 TTL、手动清除、缓存大小限制
 */

export interface CacheConfig {
  /** 默认缓存过期时间（毫秒），默认 5 分钟 */
  defaultTTL?: number
  /** 最大缓存条目数，默认 100 */
  maxCacheSize?: number
}

export interface CacheItem<T> {
  /** 缓存的数据 */
  data: T
  /** 创建时间戳 */
  createdAt: number
  /** 过期时间戳 */
  expiresAt: number
  /** TTL（毫秒） */
  ttl: number
}

export interface CacheMeta {
  /** 创建时间戳 */
  createdAt: number
  /** 过期时间戳 */
  expiresAt: number
  /** TTL（毫秒） */
  ttl: number
}

export interface CacheStats {
  /** 总缓存数 */
  total: number
  /** 有效缓存数 */
  valid: number
  /** 过期缓存数 */
  expired: number
}

/**
 * 生成缓存键
 * @param key - 原始键值
 * @returns 规范化后的缓存键
 */
function generateCacheKey(key: string): string {
  return key.trim()
}

/**
 * API 缓存组合式函数
 * @param config - 缓存配置
 * @returns 缓存操作方法
 */
export function useApiCache(config: CacheConfig = {}) {
  const { defaultTTL = 5 * 60 * 1000, maxCacheSize = 100 } = config

  // 内存缓存存储
  const cache = new Map<string, CacheItem<unknown>>()

  /**
   * 检查缓存项是否过期
   * @param item - 缓存项
   * @returns 是否过期
   */
  function isExpired<T>(item: CacheItem<T>): boolean {
    if (item.ttl === 0) return false // TTL 为 0 表示永不过期
    return Date.now() > item.expiresAt
  }

  /**
   * 获取缓存数据
   * @param key - 缓存键
   * @returns 缓存数据或 null
   */
  function getCachedData<T>(key: string): T | null {
    const cacheKey = generateCacheKey(key)
    const item = cache.get(cacheKey) as CacheItem<T> | undefined

    if (!item) return null

    if (isExpired(item)) {
      cache.delete(cacheKey)
      return null
    }

    return item.data
  }

  /**
   * 设置缓存数据
   * @param key - 缓存键
   * @param data - 要缓存的数据
   * @param ttl - 过期时间（毫秒），默认使用配置值
   */
  function setCachedData<T>(key: string, data: T, ttl: number = defaultTTL): void {
    const cacheKey = generateCacheKey(key)
    const now = Date.now()

    // 如果达到最大缓存数，删除最旧的条目
    if (cache.size >= maxCacheSize && !cache.has(cacheKey)) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }

    const item: CacheItem<T> = {
      data,
      createdAt: now,
      expiresAt: ttl === 0 ? Number.MAX_SAFE_INTEGER : now + ttl,
      ttl,
    }

    cache.set(cacheKey, item as CacheItem<unknown>)
  }

  /**
   * 清除缓存
   * @param key - 缓存键，不提供则清除所有
   */
  function clearCache(key?: string): void {
    if (key !== undefined) {
      cache.delete(generateCacheKey(key))
    } else {
      cache.clear()
    }
  }

  /**
   * 清除过期缓存
   * @returns 清除的条目数
   */
  function clearExpiredCache(): number {
    let clearedCount = 0
    const now = Date.now()

    for (const [key, item] of cache.entries()) {
      if (item.ttl !== 0 && now > item.expiresAt) {
        cache.delete(key)
        clearedCount++
      }
    }

    return clearedCount
  }

  /**
   * 获取缓存大小
   * @returns 当前缓存条目数
   */
  function getCacheSize(): number {
    return cache.size
  }

  /**
   * 获取缓存元数据
   * @param key - 缓存键
   * @returns 缓存元数据或 null
   */
  function getCacheMeta(key: string): CacheMeta | null {
    const cacheKey = generateCacheKey(key)
    const item = cache.get(cacheKey)

    if (!item) return null

    return {
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      ttl: item.ttl,
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  function getCacheStats(): CacheStats {
    let expired = 0
    const now = Date.now()

    for (const item of cache.values()) {
      if (item.ttl !== 0 && now > item.expiresAt) {
        expired++
      }
    }

    return {
      total: cache.size,
      valid: cache.size - expired,
      expired,
    }
  }

  /**
   * 包装异步函数，缓存其结果
   * @param key - 缓存键
   * @param fn - 异步函数
   * @param ttl - 过期时间（毫秒）
   * @returns 函数结果
   */
  async function wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = getCachedData<T>(key)

    if (cached !== null) {
      return cached
    }

    // 执行异步函数并缓存结果
    const result = await fn()
    setCachedData(key, result, ttl)
    return result
  }

  return {
    getCachedData,
    setCachedData,
    clearCache,
    clearExpiredCache,
    getCacheSize,
    getCacheMeta,
    getCacheStats,
    wrap,
  }
}

export default useApiCache
