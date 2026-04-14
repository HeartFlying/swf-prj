import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useMessage, type IMessageType } from '@/composables/useMessage'

// Mock Element Plus ElMessage
vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()
  const mockCloseMessage = vi.fn()
  const mockElMessage = vi.fn(() => ({ close: mockCloseMessage }))
  mockElMessage.closeAll = vi.fn()

  return {
    ...actual,
    ElMessage: mockElMessage
  }
})

// Import the mocked module to access the mock
import { ElMessage } from 'element-plus'

const mockElMessage = ElMessage as unknown as ReturnType<typeof vi.fn> & { closeAll: ReturnType<typeof vi.fn> }

describe('useMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockElMessage.mockClear()
    const mockCloseMessage = vi.fn()
    mockElMessage.mockReturnValue({ close: mockCloseMessage })
    mockElMessage.closeAll = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('Basic Message Types', () => {
    it('should show success message', () => {
      const { success } = useMessage()
      success('操作成功')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '操作成功',
        type: 'success'
      }))
    })

    it('should show warning message', () => {
      const { warning } = useMessage()
      warning('警告信息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '警告信息',
        type: 'warning'
      }))
    })

    it('should show error message', () => {
      const { error } = useMessage()
      error('错误信息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '错误信息',
        type: 'error'
      }))
    })

    it('should show info message', () => {
      const { info } = useMessage()
      info('提示信息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '提示信息',
        type: 'info'
      }))
    })
  })

  describe('Message Options', () => {
    it('should support custom duration', () => {
      const { success } = useMessage()
      success('操作成功', { duration: 5000 })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '操作成功',
        type: 'success',
        duration: 5000
      }))
    })

    it('should support showClose option', () => {
      const { info } = useMessage()
      info('提示信息', { showClose: true })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '提示信息',
        type: 'info',
        showClose: true
      }))
    })

    it('should support grouping messages', () => {
      const { success } = useMessage()
      success('操作成功', { grouping: true })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '操作成功',
        type: 'success',
        grouping: true
      }))
    })

    it('should support custom icon', () => {
      const { info } = useMessage()
      info('提示信息', { icon: 'CustomIcon' })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '提示信息',
        type: 'info',
        icon: 'CustomIcon'
      }))
    })

    it('should support offset option', () => {
      const { success } = useMessage()
      success('操作成功', { offset: 100 })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '操作成功',
        type: 'success',
        offset: 100
      }))
    })

    it('should support plain text option', () => {
      const { info } = useMessage()
      info('提示信息', { plain: true })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: '提示信息',
        type: 'info',
        plain: true
      }))
    })
  })

  describe('Message Queue Management', () => {
    it('should track active messages', () => {
      const { success, getActiveMessages } = useMessage()

      expect(getActiveMessages().length).toBe(0)

      success('消息1')
      expect(getActiveMessages().length).toBe(1)

      success('消息2')
      expect(getActiveMessages().length).toBe(2)
    })

    it('should limit max messages in queue', () => {
      const { success, getActiveMessages } = useMessage({ maxCount: 3 })

      success('消息1')
      success('消息2')
      success('消息3')
      success('消息4')

      expect(getActiveMessages().length).toBe(3)
    })

    it('should close oldest message when queue is full', () => {
      const mockCloseMessage = vi.fn()
      mockElMessage.mockReturnValue({ close: mockCloseMessage })

      const { success } = useMessage({ maxCount: 2 })

      success('消息1')
      success('消息2')
      success('消息3')

      expect(mockCloseMessage).toHaveBeenCalledTimes(1)
    })

    it('should remove message from queue when closed', () => {
      const { success, getActiveMessages } = useMessage()

      success('消息1')
      expect(getActiveMessages().length).toBe(1)

      // Simulate message close callback
      const closeCallback = mockElMessage.mock.calls[0][0].onClose
      if (closeCallback) {
        closeCallback()
      }

      expect(getActiveMessages().length).toBe(0)
    })

    it('should close all messages', () => {
      const { success, closeAll } = useMessage()

      success('消息1')
      success('消息2')
      success('消息3')

      closeAll()

      expect(mockElMessage.closeAll).toHaveBeenCalled()
    })

    it('should clear message queue', () => {
      const mockCloseMessage = vi.fn()
      mockElMessage.mockReturnValue({ close: mockCloseMessage })

      const { success, clearQueue, getActiveMessages } = useMessage()

      success('消息1')
      success('消息2')

      clearQueue()

      expect(mockCloseMessage).toHaveBeenCalledTimes(2)
      expect(getActiveMessages().length).toBe(0)
    })
  })

  describe('Message Persistence', () => {
    it('should persist messages when enabled', () => {
      const { success } = useMessage({ persist: true })
      success('持久化消息')

      const persisted = localStorage.getItem('message_history')
      expect(persisted).toBeTruthy()

      const history = JSON.parse(persisted!)
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('持久化消息')
    })

    it('should not persist messages when disabled', () => {
      const { success } = useMessage({ persist: false })
      success('非持久化消息')

      const persisted = localStorage.getItem('message_history')
      expect(persisted).toBeNull()
    })

    it('should limit persisted message count', () => {
      const { success } = useMessage({ persist: true, maxPersistCount: 3 })

      success('消息1')
      success('消息2')
      success('消息3')
      success('消息4')

      const persisted = localStorage.getItem('message_history')
      const history = JSON.parse(persisted!)
      expect(history.length).toBe(3)
    })

    it('should get message history', () => {
      const { success, getHistory } = useMessage({ persist: true })

      success('历史消息1')
      success('历史消息2')

      const history = getHistory()
      expect(history.length).toBe(2)
    })

    it('should clear message history', () => {
      const { success, clearHistory } = useMessage({ persist: true })

      success('历史消息')
      clearHistory()

      const persisted = localStorage.getItem('message_history')
      expect(persisted).toBeNull()
    })

    it('should restore history from localStorage', () => {
      const existingHistory = [
        { id: '1', message: '已有消息', type: 'success', timestamp: Date.now() }
      ]
      localStorage.setItem('message_history', JSON.stringify(existingHistory))

      const { getHistory } = useMessage({ persist: true })
      const history = getHistory()

      expect(history.length).toBe(1)
      expect(history[0].message).toBe('已有消息')
    })
  })

  describe('Global Configuration', () => {
    it('should apply default duration from config', () => {
      const { success } = useMessage({ duration: 5000 })
      success('消息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        duration: 5000
      }))
    })

    it('should allow overriding default duration', () => {
      const { success } = useMessage({ duration: 5000 })
      success('消息', { duration: 1000 })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        duration: 1000
      }))
    })

    it('should apply default showClose from config', () => {
      const { success } = useMessage({ showClose: true })
      success('消息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        showClose: true
      }))
    })

    it('should apply default offset from config', () => {
      const { success } = useMessage({ offset: 50 })
      success('消息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        offset: 50
      }))
    })

    it('should apply default grouping from config', () => {
      const { success } = useMessage({ grouping: true })
      success('消息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        grouping: true
      }))
    })
  })

  describe('Message Callbacks', () => {
    it('should call onClose callback when message closes', () => {
      const onClose = vi.fn()
      const { success } = useMessage()

      success('消息', { onClose })

      // Get the options passed to ElMessage
      const options = mockElMessage.mock.calls[0][0]
      if (options.onClose) {
        options.onClose()
      }

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Message Position', () => {
    it('should support custom position', () => {
      const { success } = useMessage({ position: 'bottom-right' })
      success('消息')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        placement: 'bottom-right'
      }))
    })

    it('should allow per-message position override', () => {
      const { success } = useMessage({ position: 'top' })
      success('消息', { position: 'bottom' })

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        placement: 'bottom'
      }))
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { success } = useMessage()
      success('')

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: ''
      }))
    })

    it('should handle very long messages', () => {
      const { success } = useMessage()
      const longMessage = 'a'.repeat(1000)
      success(longMessage)

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: longMessage
      }))
    })

    it('should handle special characters in message', () => {
      const { success } = useMessage()
      const specialMessage = '<script>alert("xss")</script>'
      success(specialMessage)

      expect(mockElMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: specialMessage
      }))
    })

    it('should handle rapid successive calls', () => {
      const { success } = useMessage({ maxCount: 5 })

      for (let i = 0; i < 10; i++) {
        success(`消息${i}`)
      }

      expect(mockElMessage).toHaveBeenCalledTimes(10)
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full')
      })

      const { success } = useMessage({ persist: true })

      // Should not throw
      expect(() => success('消息')).not.toThrow()

      // Restore
      localStorage.setItem = originalSetItem
    })
  })

  describe('Type Safety', () => {
    it('should only accept valid message types', () => {
      const { show } = useMessage()

      const validTypes: IMessageType[] = ['success', 'warning', 'error', 'info']

      validTypes.forEach(type => {
        show('消息', type)
        expect(mockElMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type }))
      })
    })

    it('should return message instance with close method', () => {
      const { success } = useMessage()
      const instance = success('消息')

      expect(instance).toHaveProperty('close')
      expect(typeof instance.close).toBe('function')
    })
  })
})
