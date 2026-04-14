// 时间范围类型
export interface TimeRange {
  preset: string | null
  start: string
  end: string
}

// 筛选器选项
export interface FilterOption {
  label: string
  value: string | number
  children?: FilterOption[]
}

// 筛选器配置
export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'cascader' | 'input'
  options?: FilterOption[]
  placeholder?: string
  multiple?: boolean
  clearable?: boolean
}

// 筛选值
export interface FilterValue {
  [key: string]: string | number | string[] | number[] | undefined
}

// 快速筛选
export interface QuickFilter {
  label: string
  value: FilterValue
}

// 统计卡片数据
export interface StatCardData {
  title: string
  value: number | string
  unit?: string
  trend?: number
  trendType?: 'up' | 'down' | 'flat'
  icon?: string
  color?: string
}

// 图表数据
export interface ChartData {
  xAxis: string[]
  series: Array<{
    name: string
    data: number[]
    type?: 'line' | 'bar' | 'pie'
  }>
}

// 热力图数据
export interface HeatmapData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

// 排行榜项
export interface RankingItem {
  id: number
  name: string
  score: number
  department?: string
  avatar?: string
  trend?: number
}

// ==================== CodeStatsCard 类型 ====================

// 代码统计类型
export type CodeStatsType = 'commits' | 'additions' | 'deletions' | 'files'

// 对比类型：mom(环比) 或 yoy(同比)
export type CompareType = 'mom' | 'yoy'

// 代码统计卡片数据
export interface CodeStatsCardData {
  /** 统计类型 */
  type: CodeStatsType
  /** 数值 */
  value: number
  /** 趋势值（正数表示上升，负数表示下降） */
  trend?: number
  /** 对比类型 */
  compareType?: CompareType
}

// 代码统计卡片属性
export interface CodeStatsCardProps {
  /** 统计类型 */
  type: CodeStatsType
  /** 数值 */
  value?: number
  /** 趋势值（正数表示上升，负数表示下降） */
  trend?: number
  /** 对比类型：mom(环比) 或 yoy(同比) */
  compareType?: CompareType
  /** 自定义描述文本，优先级高于 compareType */
  description?: string
  /** 是否加载中 */
  loading?: boolean
  /** 尺寸 */
  size?: 'small' | 'default' | 'large'
  /** 是否可悬停 */
  hoverable?: boolean
}

// ==================== TokenUsageChart 类型 ====================

// Token 使用数据
export interface TokenUsageData {
  date: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// Token 使用图表属性
export interface TokenUsageChartProps {
  /** 图表数据 */
  data?: TokenUsageData[]
  /** 图表标题 */
  title?: string
  /** 图表高度 */
  height?: string | number
  /** 是否显示加载状态 */
  loading?: boolean
  /** 主题 */
  theme?: 'dark' | 'light'
}
