import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { MessageOptions, MessageHandler } from 'element-plus'

/**
 * 消息类型
 */
export type IMessageType = 'success' | 'warning' | 'error' | 'info'

/**
 * 消息位置
 */
export type IMessagePosition = 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'

/**
 * 消息选项
 */
export interface IMessageOptions extends Partial<Omit<MessageOptions, 'type' | 'message' | 'onClose'>> {
  /**
   * 显示关闭按钮
   * @default false
   */
  showClose?: boolean
  /**
   * 是否分组显示相同消息
   * @default false
   */
  grouping?: boolean
  /**
   * 消息位置
   * @default 'top'
   */
  position?: IMessagePosition
  /**
   * 是否纯文本样式
   * @default false
   */
  plain?: boolean
  /**
   * 关闭时的回调
   */
  onClose?: () => void
}

/**
 * 消息配置
 */
export interface IMessageConfig {
  /**
   * 显示时长（毫秒），0 表示不自动关闭
   * @default 3000
   */
  duration?: number
  /**
   * 显示关闭按钮
   * @default false
   */
  showClose?: boolean
  /**
   * 是否分组显示相同消息
   * @default false
   */
  grouping?: boolean
  /**
   * 消息位置
   * @default 'top'
   */
  position?: IMessagePosition
  /**
   * 最大同时显示消息数
   * @default 10
   */
  maxCount?: number
  /**
   * 是否持久化消息到 localStorage
   * @default false
   */
  persist?: boolean
  /**
   * 持久化消息最大数量
   * @default 50
   */
  maxPersistCount?: number
  /**
   * 偏移量
   * @default 20
   */
  offset?: number
}

/**
 * 消息记录
 */
export interface IMessageRecord {
  id: string
  message: string
  type: IMessageType
  timestamp: number
  options?: IMessageOptions
}

/**
 * 活跃消息项
 */
interface IActiveMessage {
  id: string
  handler: MessageHandler
  record: IMessageRecord
}

/**
 * localStorage key
 */
const STORAGE_KEY = 'message_history'

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 消息队列管理 composable
 * 基于 Element Plus ElMessage 封装，支持消息队列管理和持久化
 *
 * @param config 全局配置
 * @returns 消息操作方法
 *
 * @example
 * ```ts
 * const { success, error, warning, info } = useMessage()
 * success('操作成功')
 * error('操作失败', { duration: 5000 })
 *
 * // 带配置
 * const message = useMessage({
 *   duration: 5000,
 *   maxCount: 5,
 *   persist: true
 * })
 * ```
 */
export function useMessage(config: IMessageConfig = {}) {
  const {
    duration: defaultDuration = 3000,
    showClose: defaultShowClose = false,
    grouping: defaultGrouping = false,
    position: defaultPosition = 'top',
    maxCount = 10,
    persist = false,
    maxPersistCount = 50,
    offset: defaultOffset = 20
  } = config

  // 活跃消息列表
  const activeMessages: Ref<IActiveMessage[]> = ref([])

  // 消息历史
  const messageHistory: Ref<IMessageRecord[]> = ref([])

  // 初始化时从 localStorage 加载历史
  if (persist) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        messageHistory.value = JSON.parse(stored)
      }
    } catch {
      // 忽略解析错误
      messageHistory.value = []
    }
  }

  /**
   * 保存历史到 localStorage
   */
  const saveHistory = (): void => {
    if (!persist) return

    try {
      const limited = messageHistory.value.slice(-maxPersistCount)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
    } catch {
      // 忽略存储错误（如存储空间不足）
    }
  }

  /**
   * 添加到历史记录
   */
  const addToHistory = (record: IMessageRecord): void => {
    if (!persist) return

    messageHistory.value.push(record)
    // 限制历史数量
    if (messageHistory.value.length > maxPersistCount) {
      messageHistory.value = messageHistory.value.slice(-maxPersistCount)
    }
    saveHistory()
  }

  /**
   * 从活跃列表中移除消息
   */
  const removeFromActive = (id: string): void => {
    const index = activeMessages.value.findIndex(item => item.id === id)
    if (index > -1) {
      activeMessages.value.splice(index, 1)
    }
  }

  /**
   * 清理多余的消息
   */
  const trimActiveMessages = (): void => {
    while (activeMessages.value.length >= maxCount) {
      const oldest = activeMessages.value.shift()
      if (oldest) {
        oldest.handler.close()
      }
    }
  }

  /**
   * 显示消息
   * @param message 消息内容
   * @param type 消息类型
   * @param options 消息选项
   * @returns 消息处理器
   */
  const show = (
    message: string,
    type: IMessageType,
    options: IMessageOptions = {}
  ): MessageHandler => {
    const id = generateId()

    // 清理多余消息
    trimActiveMessages()

    // 合并选项
    const mergedOptions: MessageOptions = {
      message,
      type,
      duration: options.duration ?? defaultDuration,
      showClose: options.showClose ?? defaultShowClose,
      grouping: options.grouping ?? defaultGrouping,
      offset: options.offset ?? defaultOffset,
      plain: options.plain,
      icon: options.icon,
      onClose: () => {
        removeFromActive(id)
        options.onClose?.()
      }
    }

    // 添加位置（Element Plus 使用 placement）
    const position = options.position ?? defaultPosition
    if (position) {
      (mergedOptions as Record<string, unknown>).placement = position
    }

    // 显示消息
    const handler = ElMessage(mergedOptions)

    // 记录消息
    const record: IMessageRecord = {
      id,
      message,
      type,
      timestamp: Date.now(),
      options
    }

    // 添加到活跃列表
    activeMessages.value.push({ id, handler, record })

    // 添加到历史
    addToHistory(record)

    return handler
  }

  /**
   * 显示成功消息
   * @param message 消息内容
   * @param options 消息选项
   * @returns 消息处理器
   */
  const success = (message: string, options?: IMessageOptions): MessageHandler => {
    return show(message, 'success', options)
  }

  /**
   * 显示警告消息
   * @param message 消息内容
   * @param options 消息选项
   * @returns 消息处理器
   */
  const warning = (message: string, options?: IMessageOptions): MessageHandler => {
    return show(message, 'warning', options)
  }

  /**
   * 显示错误消息
   * @param message 消息内容
   * @param options 消息选项
   * @returns 消息处理器
   */
  const error = (message: string, options?: IMessageOptions): MessageHandler => {
    return show(message, 'error', options)
  }

  /**
   * 显示信息消息
   * @param message 消息内容
   * @param options 消息选项
   * @returns 消息处理器
   */
  const info = (message: string, options?: IMessageOptions): MessageHandler => {
    return show(message, 'info', options)
  }

  /**
   * 获取活跃消息列表
   * @returns 活跃消息记录数组
   */
  const getActiveMessages = (): IMessageRecord[] => {
    return activeMessages.value.map(item => item.record)
  }

  /**
   * 获取消息历史
   * @returns 消息历史记录数组
   */
  const getHistory = (): IMessageRecord[] => {
    return [...messageHistory.value]
  }

  /**
   * 关闭所有消息
   */
  const closeAll = (): void => {
    ElMessage.closeAll()
    activeMessages.value = []
  }

  /**
   * 清空消息队列
   */
  const clearQueue = (): void => {
    activeMessages.value.forEach(item => {
      item.handler.close()
    })
    activeMessages.value = []
  }

  /**
   * 清空消息历史
   */
  const clearHistory = (): void => {
    messageHistory.value = []
    if (persist) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // 忽略错误
      }
    }
  }

  return {
    show,
    success,
    warning,
    error,
    info,
    getActiveMessages,
    getHistory,
    closeAll,
    clearQueue,
    clearHistory
  }
}

export default useMessage
