// 可复用图表组件库

// ==================== 基础图表组件 ====================
export { default as BaseChart } from './BaseChart.vue'
export { default as LineChart } from './LineChart.vue'
export { default as BarChart } from './BarChart.vue'
export { default as PieChart } from './PieChart.vue'

// ==================== 高级图表组件 ====================
export { default as TrendChart } from './TrendChart.vue'
export { default as DistributionChart } from './DistributionChart.vue'
export { default as ComparisonChart } from './ComparisonChart.vue'
export { default as RankingChart } from './RankingChart.vue'
export { default as HeatmapChart } from './HeatmapChart.vue'

// ==================== 基础图表类型导出 ====================
export type { ChartProps } from './BaseChart.vue'

// ==================== LineChart 类型导出 ====================
export type {
  LineChartProps,
  LineChartSeries,
} from './LineChart.vue'

// ==================== BarChart 类型导出 ====================
export type {
  BarChartProps,
  BarChartSeries,
} from './BarChart.vue'

// ==================== PieChart 类型导出 ====================
export type {
  PieChartProps,
  PieChartDataItem,
  PieChartType,
} from './PieChart.vue'

// ==================== HeatmapChart 类型导出 ====================
export type {
  HeatmapChartProps,
  HeatmapDataItem,
  HeatmapColorScheme,
} from './HeatmapChart.vue'

// ==================== TrendChart 类型导出 ====================
export type {
  TrendChartProps,
  TrendChartSeries,
  TrendChartData,
  TimeDimension,
  ChartType,
  ZoomType,
  LegendPosition,
} from './TrendChart.vue'

// ==================== DistributionChart 类型导出 ====================
export type {
  DistributionChartProps,
  DistributionChartDataItem,
  DistributionChartType,
} from './DistributionChart.vue'

// ==================== ComparisonChart 类型导出 ====================
export type {
  ComparisonChartProps,
  ComparisonChartSeries,
  ComparisonChartData,
  LegendPosition as ComparisonLegendPosition,
  LabelPosition as ComparisonLabelPosition,
} from './ComparisonChart.vue'

// ==================== RankingChart 类型导出 ====================
export type {
  RankingChartProps,
  RankingChartDataItem,
  RankingDirection,
  SortOrder as RankingSortOrder,
} from './RankingChart.vue'
