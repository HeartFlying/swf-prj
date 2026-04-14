/**
 * 反馈组件库统一入口
 *
 * 本文件统一导出所有反馈相关的组件，包括：
 * - Loading: 加载状态组件
 * - EmptyState: 空状态组件
 * - ErrorBoundary: 错误边界组件
 *
 * @example
 * ```ts
 * import { Loading, EmptyState, ErrorBoundary } from '@/components/feedback'
 * import type { LoadingProps, EmptyStateProps, ErrorBoundaryProps } from '@/components/feedback'
 * ```
 */

// ==================== Loading 组件 ====================
export { default as Loading } from './Loading/Loading.vue'
export type { LoadingProps, LoadingSize } from './Loading/Loading.vue'

// ==================== EmptyState 组件 ====================
export { default as EmptyState } from './EmptyState/EmptyState.vue'
export type {
  EmptyStateType,
  EmptyStateSize,
  ButtonType,
  ButtonSize,
  EmptyStateButton,
  EmptyStateProps
} from './EmptyState/EmptyState.vue'

// ==================== ErrorBoundary 组件 ====================
export { default as ErrorBoundary } from './ErrorBoundary/ErrorBoundary.vue'
export type { ErrorBoundaryProps, ErrorInfo } from './ErrorBoundary/ErrorBoundary.vue'
