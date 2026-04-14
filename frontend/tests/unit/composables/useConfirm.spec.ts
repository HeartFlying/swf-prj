import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useConfirm } from '@/composables/useConfirm'
import { ElMessageBox } from 'element-plus'

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

describe('useConfirm', () => {
  const mockedElMessageBox = vi.mocked(ElMessageBox)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========== 基础功能测试 ==========
  describe('Basic Functionality', () => {
    it('should return confirm function and loading state', () => {
      const { confirm, isLoading } = useConfirm()

      expect(typeof confirm).toBe('function')
      expect(isLoading).toBeDefined()
      expect(isLoading.value).toBe(false)
    })

    it('should call ElMessageBox.confirm with default options', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '确认操作',
        message: '确定要执行此操作吗？',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        '确定要执行此操作吗？',
        '确认操作',
        expect.objectContaining({
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        })
      )
    })

    it('should resolve to true when user confirms', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      const result = await confirm({
        title: '确认操作',
        message: '确定要执行此操作吗？',
      })

      expect(result).toBe(true)
    })

    it('should resolve to false when user cancels', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockRejectedValueOnce('cancel')

      const result = await confirm({
        title: '确认操作',
        message: '确定要执行此操作吗？',
      })

      expect(result).toBe(false)
    })
  })

  // ========== 类型配置测试 ==========
  describe('Type Configuration', () => {
    it('should support warning type', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '警告',
        message: '确定要执行此操作吗？',
        type: 'warning',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'warning',
        })
      )
    })

    it('should support error type for dangerous operations', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '危险操作',
        message: '此操作不可恢复，确定继续吗？',
        type: 'error',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'error',
        })
      )
    })

    it('should support success type', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '确认完成',
        message: '操作已成功完成',
        type: 'success',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'success',
        })
      )
    })
  })

  // ========== 按钮配置测试 ==========
  describe('Button Configuration', () => {
    it('should support custom button text', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '保存更改',
        message: '确定要保存更改吗？',
        confirmButtonText: '保存',
        cancelButtonText: '放弃',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          confirmButtonText: '保存',
          cancelButtonText: '放弃',
        })
      )
    })

    it('should support custom button type', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '删除',
        message: '确定要删除吗？',
        confirmButtonType: 'danger',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          confirmButtonClass: 'el-button--danger',
        })
      )
    })
  })

  // ========== 异步确认测试 ==========
  describe('Async Confirmation', () => {
    it('should support async onConfirm callback', async () => {
      const onConfirm = vi.fn().mockResolvedValueOnce(undefined)
      const { confirm, isLoading } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '异步操作',
        message: '执行异步操作？',
        onConfirm,
      })

      expect(onConfirm).toHaveBeenCalled()
      expect(isLoading.value).toBe(false)
    })

    it('should handle async onConfirm error', async () => {
      const onConfirm = vi.fn().mockRejectedValueOnce(new Error('操作失败'))
      const { confirm, isLoading } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await expect(
        confirm({
          title: '异步操作',
          message: '执行异步操作？',
          onConfirm,
        })
      ).rejects.toThrow('操作失败')

      expect(isLoading.value).toBe(false)
    })

    it('should not call onConfirm when user cancels', async () => {
      const onConfirm = vi.fn()
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockRejectedValueOnce('cancel')

      await confirm({
        title: '确认操作',
        message: '确定要执行此操作吗？',
        onConfirm,
      })

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('should support onCancel callback', async () => {
      const onCancel = vi.fn()
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockRejectedValueOnce('cancel')

      await confirm({
        title: '确认操作',
        message: '确定要执行此操作吗？',
        onCancel,
      })

      expect(onCancel).toHaveBeenCalled()
    })
  })

  // ========== 自定义配置测试 ==========
  describe('Custom Configuration', () => {
    it('should support custom class', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '自定义样式',
        message: '自定义类名测试',
        customClass: 'my-custom-class',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          customClass: 'my-custom-class',
        })
      )
    })

    it('should support showClose option', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '无关闭按钮',
        message: '测试关闭按钮',
        showClose: false,
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          showClose: false,
        })
      )
    })

    it('should support closeOnClickModal option', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '禁用点击遮罩关闭',
        message: '测试遮罩关闭',
        closeOnClickModal: false,
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          closeOnClickModal: false,
        })
      )
    })

    it('should support closeOnPressEscape option', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '禁用ESC关闭',
        message: '测试ESC关闭',
        closeOnPressEscape: false,
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          closeOnPressEscape: false,
        })
      )
    })
  })

  // ========== 快捷方法测试 ==========
  describe('Shortcut Methods', () => {
    it('should provide delete shortcut with danger style', async () => {
      const { delete: deleteConfirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await deleteConfirm({
        title: '删除确认',
        message: '确定要删除此项目吗？',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'warning',
          confirmButtonClass: 'el-button--danger',
        })
      )
    })

    it('should provide warning shortcut', async () => {
      const { warning } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await warning({
        title: '警告',
        message: '此操作有风险',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'warning',
        })
      )
    })

    it('should provide info shortcut', async () => {
      const { info } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await info({
        title: '提示',
        message: '请确认信息',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          type: 'info',
        })
      )
    })
  })

  // ========== 全局配置测试 ==========
  describe('Global Configuration', () => {
    it('should merge global config with local options', async () => {
      const { confirm } = useConfirm({
        confirmButtonText: '全局确定',
        cancelButtonText: '全局取消',
      })
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '测试',
        message: '测试全局配置',
        confirmButtonText: '局部确定',
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          confirmButtonText: '局部确定',
          cancelButtonText: '全局取消',
        })
      )
    })
  })

  // ========== HTML 内容测试 ==========
  describe('HTML Content', () => {
    it('should support HTML message', async () => {
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: 'HTML内容',
        message: '<strong>加粗文本</strong>',
        dangerouslyUseHTMLString: true,
      })

      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        '<strong>加粗文本</strong>',
        expect.any(String),
        expect.objectContaining({
          dangerouslyUseHTMLString: true,
        })
      )
    })
  })

  // ========== 回调函数测试 ==========
  describe('Callback Functions', () => {
    it('should call onBeforeOpen before opening', async () => {
      const onBeforeOpen = vi.fn()
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '测试',
        message: '测试回调',
        onBeforeOpen,
      })

      expect(onBeforeOpen).toHaveBeenCalled()
    })

    it('should call callback when action is triggered', async () => {
      // This test verifies the callback mechanism works
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '测试',
        message: '测试回调',
      })

      // The callback should be defined in the options
      expect(mockedElMessageBox.confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          callback: expect.any(Function),
        })
      )
    })

    it('should call onClosed after closed', async () => {
      const onClosed = vi.fn()
      const { confirm } = useConfirm()
      mockedElMessageBox.confirm.mockResolvedValueOnce('confirm')

      await confirm({
        title: '测试',
        message: '测试回调',
        onClosed,
      })

      expect(onClosed).toHaveBeenCalled()
    })
  })
})
