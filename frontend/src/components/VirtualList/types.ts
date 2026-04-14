/**
 * VirtualList 组件类型定义
 */

// 虚拟列表项元数据
export interface ItemMeta {
  index: number
  height: number
  offset: number
}

// 组件属性
export interface VirtualListProps<T = any> {
  /** 列表数据 */
  data: T[]
  /** 每项固定高度 */
  itemHeight: number
  /** 估算高度（动态高度时使用） */
  estimatedHeight?: number
  /** 缓冲区域大小（上下各渲染的额外项数） */
  buffer?: number
  /** 容器高度 */
  containerHeight?: number
  /** 是否启用动态高度 */
  dynamic?: boolean
  /** 唯一键字段名 */
  keyField?: keyof T | string
}

// 组件事件
export interface VirtualListEmits {
  (e: 'scroll', scrollTop: number): void
  (e: 'scroll-top'): void
  (e: 'scroll-bottom'): void
  (e: 'item-click', item: any, index: number): void
}
