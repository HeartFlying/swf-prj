import { ref, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { Action } from 'element-plus'

/**
 * 确认弹窗类型
 */
export type ConfirmType = 'info' | 'success' | 'warning' | 'error'

/**
 * 确认按钮类型
 */
export type ConfirmButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'

/**
 * 确认弹窗配置选项
 */
export interface ConfirmOptions {
  /** 弹窗标题 */
  title: string
  /** 弹窗消息内容 */
  message: string
  /** 弹窗类型，影响图标颜色 */
  type?: ConfirmType
  /** 确认按钮文本 */
  confirmButtonText?: string
  /** 取消按钮文本 */
  cancelButtonText?: string
  /** 确认按钮类型 */
  confirmButtonType?: ConfirmButtonType
  /** 自定义类名 */
  customClass?: string
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 是否可以通过点击遮罩关闭 */
  closeOnClickModal?: boolean
  /** 是否可以通过按下 ESC 关闭 */
  closeOnPressEscape?: boolean
  /** 是否将 message 作为 HTML 处理 */
  dangerouslyUseHTMLString?: boolean
  /** 确认前回调（异步） */
  onConfirm?: () => Promise<void> | void
  /** 取消回调 */
  onCancel?: () => void
  /** 打开前回调 */
  onBeforeOpen?: () => void
  /** 打开后回调 */
  onOpened?: () => void
  /** 关闭后回调 */
  onClosed?: () => void
}

/**
 * 全局配置选项
 */
export interface GlobalConfirmOptions {
  /** 默认确认按钮文本 */
  confirmButtonText?: string
  /** 默认取消按钮文本 */
  cancelButtonText?: string
  /** 默认确认按钮类型 */
  confirmButtonType?: ConfirmButtonType
  /** 默认弹窗类型 */
  type?: ConfirmType
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 是否可以通过点击遮罩关闭 */
  closeOnClickModal?: boolean
  /** 是否可以通过按下 ESC 关闭 */
  closeOnPressEscape?: boolean
}

/**
 * useConfirm 返回值
 */
export interface UseConfirmReturn {
  /** 显示确认弹窗 */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** 删除确认快捷方法 */
  delete: (options: Omit<ConfirmOptions, 'type' | 'confirmButtonType'>) => Promise<boolean>
  /** 警告确认快捷方法 */
  warning: (options: Omit<ConfirmOptions, 'type'>) => Promise<boolean>
  /** 信息确认快捷方法 */
  info: (options: Omit<ConfirmOptions, 'type'>) => Promise<boolean>
  /** 加载状态 */
  isLoading: Ref<boolean>
}

/**
 * 确认弹窗 Composable
 * 基于 Element Plus ElMessageBox 封装，支持多种确认场景
 *
 * @param globalConfig 全局配置选项
 * @returns UseConfirmReturn
 *
 * @example
 * ```ts
 * const { confirm, delete: deleteConfirm, isLoading } = useConfirm()
 *
 * // 基础使用
 * const result = await confirm({
 *   title: '确认操作',
 *   message: '确定要执行此操作吗？'
 * })
 *
 * // 删除确认
 * await deleteConfirm({
 *   title: '删除确认',
 *   message: '确定要删除此项目吗？',
 *   onConfirm: async () => {
 *     await deleteItem(id)
 *   }
 * })
 *
 * // 异步确认
 * await confirm({
 *   title: '保存更改',
 *   message: '确定要保存更改吗？',
 *   onConfirm: async () => {
 *     await saveChanges()
 *   }
 * })
 * ```
 */
export function useConfirm(globalConfig: GlobalConfirmOptions = {}): UseConfirmReturn {
  const isLoading = ref(false)

  // 默认配置
  const defaultConfig: Required<GlobalConfirmOptions> = {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    confirmButtonType: 'primary',
    type: 'info',
    showClose: true,
    closeOnClickModal: true,
    closeOnPressEscape: true,
    ...globalConfig,
  }

  /**
   * 显示确认弹窗
   */
  const confirm = async (options: ConfirmOptions): Promise<boolean> => {
    const {
      title,
      message,
      type = defaultConfig.type,
      confirmButtonText = defaultConfig.confirmButtonText,
      cancelButtonText = defaultConfig.cancelButtonText,
      confirmButtonType = defaultConfig.confirmButtonType,
      customClass,
      showClose = defaultConfig.showClose,
      closeOnClickModal = defaultConfig.closeOnClickModal,
      closeOnPressEscape = defaultConfig.closeOnPressEscape,
      dangerouslyUseHTMLString,
      onConfirm,
      onCancel,
      onBeforeOpen,
      onOpened,
      onClosed,
    } = options

    // 打开前回调
    onBeforeOpen?.()

    // 构建按钮类名
    const confirmButtonClass = `el-button--${confirmButtonType}`

    try {
      await ElMessageBox.confirm(message, title, {
        confirmButtonText,
        cancelButtonText,
        type,
        confirmButtonClass,
        customClass: customClass || 'confirm-dialog',
        showClose,
        closeOnClickModal,
        closeOnPressEscape,
        dangerouslyUseHTMLString,
        callback: (action: Action) => {
          if (action === 'confirm') {
            onOpened?.()
          }
        },
      })

      // 用户点击确认
      if (onConfirm) {
        isLoading.value = true
        try {
          await onConfirm()
        } finally {
          isLoading.value = false
        }
      }

      onClosed?.()
      return true
    } catch (error) {
      // 用户点击取消或关闭
      if (error === 'cancel' || error === 'close') {
        onCancel?.()
        onClosed?.()
        return false
      }
      // 重新抛出其他错误
      throw error
    }
  }

  /**
   * 删除确认快捷方法
   */
  const deleteConfirm = async (
    options: Omit<ConfirmOptions, 'type' | 'confirmButtonType'>
  ): Promise<boolean> => {
    return confirm({
      ...options,
      type: 'warning',
      confirmButtonType: 'danger',
    })
  }

  /**
   * 警告确认快捷方法
   */
  const warning = async (options: Omit<ConfirmOptions, 'type'>): Promise<boolean> => {
    return confirm({
      ...options,
      type: 'warning',
    })
  }

  /**
   * 信息确认快捷方法
   */
  const info = async (options: Omit<ConfirmOptions, 'type'>): Promise<boolean> => {
    return confirm({
      ...options,
      type: 'info',
    })
  }

  return {
    confirm,
    delete: deleteConfirm,
    warning,
    info,
    isLoading,
  }
}

export default useConfirm
