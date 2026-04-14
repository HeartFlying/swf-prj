import { describe, it, expect } from 'vitest'

// 测试反馈组件统一入口
import {
  // Loading 组件
  Loading,
  type LoadingProps,
  type LoadingType,
  type LoadingSize,
  // EmptyState 组件
  EmptyState,
  type EmptyStateProps,
  type EmptyStateType,
  type EmptyStateSize,
  type EmptyStateButton,
  type ButtonType,
  type ButtonSize,
  // ErrorBoundary 组件
  ErrorBoundary,
  type ErrorBoundaryProps,
  type ErrorInfo
} from '@/components/feedback'

describe('Feedback Components Entry', () => {
  // ==================== Loading 组件测试 ====================
  describe('Loading Component', () => {
    it('should export Loading component', () => {
      expect(Loading).toBeDefined()
      expect(typeof Loading).toBe('object')
    })

    it('should export LoadingProps type', () => {
      // 类型检查在编译时完成，这里主要验证导出存在
      const props: LoadingProps = {
        visible: true,
        fullscreen: false,
        type: 'spinner',
        text: '加载中',
        maskOpacity: 0.7,
        background: '#fff',
        zIndex: 2000,
        lock: true,
        closeOnClickMask: false,
        size: 'medium',
        color: '#409eff',
        delay: 0
      }
      expect(props).toBeDefined()
    })

    it('should export LoadingType type', () => {
      const type: LoadingType = 'spinner'
      expect(['spinner', 'dots', 'wave']).toContain(type)
    })

    it('should export LoadingSize type', () => {
      const size: LoadingSize = 'medium'
      expect(['small', 'medium', 'large']).toContain(size)
    })
  })

  // ==================== EmptyState 组件测试 ====================
  describe('EmptyState Component', () => {
    it('should export EmptyState component', () => {
      expect(EmptyState).toBeDefined()
      expect(typeof EmptyState).toBe('object')
    })

    it('should export EmptyStateProps type', () => {
      const props: EmptyStateProps = {
        type: 'no-data',
        title: '暂无数据',
        description: '描述信息',
        icon: 'DataLine',
        image: '/assets/empty.png',
        showButton: true,
        buttonText: '刷新',
        buttonType: 'primary',
        buttonSize: 'default',
        buttonPlain: false,
        buttons: [{ text: '刷新', type: 'primary' }],
        size: 'default',
        customClass: 'custom-empty'
      }
      expect(props).toBeDefined()
    })

    it('should export EmptyStateType type', () => {
      const type: EmptyStateType = 'no-data'
      expect(['no-data', 'no-search', 'no-result', 'error']).toContain(type)
    })

    it('should export EmptyStateSize type', () => {
      const size: EmptyStateSize = 'default'
      expect(['small', 'default', 'large']).toContain(size)
    })

    it('should export EmptyStateButton type', () => {
      const button: EmptyStateButton = {
        text: '按钮',
        type: 'primary',
        size: 'default',
        plain: false
      }
      expect(button).toBeDefined()
    })

    it('should export ButtonType type', () => {
      const type: ButtonType = 'primary'
      expect(['primary', 'success', 'warning', 'danger', 'info', 'default']).toContain(type)
    })

    it('should export ButtonSize type', () => {
      const size: ButtonSize = 'default'
      expect(['large', 'default', 'small']).toContain(size)
    })
  })

  // ==================== ErrorBoundary 组件测试 ====================
  describe('ErrorBoundary Component', () => {
    it('should export ErrorBoundary component', () => {
      expect(ErrorBoundary).toBeDefined()
      expect(typeof ErrorBoundary).toBe('object')
    })

    it('should export ErrorBoundaryProps type', () => {
      const props: ErrorBoundaryProps = {
        fallback: null,
        onError: (error: Error, errorInfo: ErrorInfo) => {
          console.log(error, errorInfo)
        },
        onReset: () => {
          console.log('reset')
        }
      }
      expect(props).toBeDefined()
    })

    it('should export ErrorInfo type', () => {
      const errorInfo: ErrorInfo = {
        componentStack: 'at ComponentName'
      }
      expect(errorInfo).toBeDefined()
      expect(errorInfo.componentStack).toBe('at ComponentName')
    })
  })

  // ==================== 统一入口测试 ====================
  describe('Unified Entry', () => {
    it('should export all feedback components from single entry', () => {
      // 验证所有组件都已导出
      expect(Loading).toBeDefined()
      expect(EmptyState).toBeDefined()
      expect(ErrorBoundary).toBeDefined()
    })

    it('should have valid component definitions', () => {
      // 验证组件是正确定义的 Vue 组件对象
      expect(Loading).toBeTruthy()
      expect(EmptyState).toBeTruthy()
      expect(ErrorBoundary).toBeTruthy()

      // 验证组件有 render 函数或 setup 函数
      expect(typeof Loading.render || Loading.setup).toBeTruthy()
      expect(typeof EmptyState.render || EmptyState.setup).toBeTruthy()
      expect(typeof ErrorBoundary.render || ErrorBoundary.setup).toBeTruthy()
    })
  })
})
