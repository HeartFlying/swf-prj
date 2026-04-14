/**
 * 组件库统一入口
 * 导出所有基础组件及其类型定义
 *
 * 使用方式：
 * 1. 全量导入: import { DataCard, DataTable } from '@/components'
 * 2. 按需导入: import DataCard from '@/components/DataCard'
 */

// ==================== DataCard 组件 ====================
import DataCard from './DataCard/DataCard.vue'
export type {
  DataCardProps,
  DataCardTheme,
  DataCardSize,
  DataCardFormat,
} from './DataCard/DataCard.vue'
export { DataCard }

// ==================== DataTable 组件 ====================
import DataTable from './DataTable/DataTable.vue'
export type {
  DataTableProps,
  DataTableColumn,
  DataTablePagination,
  DataTableSort,
  FilterOption as DataTableFilterOption,
} from './DataTable/DataTable.vue'
export { DataTable }

// ==================== FilterBar 组件 ====================
import FilterBar from './FilterBar/FilterBar.vue'
export type {
  FilterBarProps,
  FilterItem,
  FilterType as FilterBarFilterType,
  FilterValue as FilterBarFilterValue,
  QuickFilter,
  FilterOption as FilterBarFilterOption,
} from './FilterBar/FilterBar.vue'
export { FilterBar }

// ==================== FormDialog 组件 ====================
import FormDialog from './FormDialog/FormDialog.vue'
export type {
  FormDialogProps,
  FormField,
  FieldType,
  SelectOption,
} from './FormDialog/FormDialog.vue'
export { FormDialog }

// ==================== StatusTag 组件 ====================
import StatusTag from './StatusTag/StatusTag.vue'
export type {
  StatusTagProps,
  StatusTagType,
  StatusTagSize,
} from './StatusTag/StatusTag.vue'
export { StatusTag }

// ==================== EmptyState 组件 ====================
import EmptyState from './EmptyState/EmptyState.vue'
export type {
  EmptyStateProps,
  EmptyStateType,
  EmptyStateSize,
  EmptyStateButton,
  ButtonType,
  ButtonSize,
} from './EmptyState/EmptyState.vue'
export { EmptyState }

// ==================== Loading 组件 ====================
import Loading from './Loading/Loading.vue'
export type {
  LoadingProps,
  LoadingSize,
} from './Loading/Loading.vue'
export { Loading }

// ==================== Skeleton 组件 ====================
import Skeleton from './Skeleton/Skeleton.vue'
export type {
  SkeletonProps,
  SkeletonType,
  SkeletonAnimation,
  SkeletonSize,
  SkeletonShape,
} from './Skeleton/Skeleton.vue'
export { Skeleton }

// ==================== ErrorBoundary 组件 ====================
import ErrorBoundary from './ErrorBoundary/ErrorBoundary.vue'
export type {
  ErrorBoundaryProps,
  ErrorInfo,
} from './ErrorBoundary/ErrorBoundary.vue'
export { ErrorBoundary }

// ==================== VirtualList 组件 ====================
import VirtualList from './VirtualList/VirtualList.vue'
export { VirtualList }
export type { VirtualListProps, VirtualListEmits } from './VirtualList/types'

// ==================== PageTransition 组件 ====================
import PageTransition from './transition/PageTransition.vue'
export { PageTransition }
export type { TransitionName, TransitionMode, EasingType } from './transition/PageTransition.vue'

// ==================== 图表组件 ====================
export { default as BarChart } from './charts/BarChart.vue'
export { default as LineChart } from './charts/LineChart.vue'
export { default as PieChart } from './charts/PieChart.vue'
export { default as BaseChart } from './charts/BaseChart.vue'
export { default as DistributionChart } from './charts/DistributionChart.vue'
export { default as ComparisonChart } from './charts/ComparisonChart.vue'
export { default as RankingChart } from './charts/RankingChart.vue'
export { default as HeatmapChart } from './charts/HeatmapChart.vue'
export { default as TrendChart } from './charts/TrendChart.vue'

// 导出图表组件类型
export type {
  ChartProps,
} from './charts/BaseChart.vue'

export type {
  LineChartProps,
  LineChartSeries,
} from './charts/LineChart.vue'

export type {
  BarChartProps,
  BarChartSeries,
} from './charts/BarChart.vue'

export type {
  PieChartProps,
  PieChartDataItem,
  PieChartType,
} from './charts/PieChart.vue'


export type {
  DistributionChartProps,
  DistributionChartDataItem,
  DistributionChartType,
} from './charts/DistributionChart.vue'

export type {
  ComparisonChartProps,
  ComparisonChartSeries,
  ComparisonChartData,
  LegendPosition as ComparisonLegendPosition,
  LabelPosition as ComparisonLabelPosition,
} from './charts/ComparisonChart.vue'

export type {
  RankingChartProps,
  RankingChartDataItem,
  RankingDirection,
  SortOrder as RankingSortOrder,
} from './charts/RankingChart.vue'

export type {
  HeatmapChartProps,
  HeatmapDataItem,
  HeatmapColorScheme,
} from './charts/HeatmapChart.vue'

export type {
  TrendChartProps,
  TrendChartSeries,
  TrendChartData,
  TimeDimension,
  ChartType,
  ZoomType,
  LegendPosition,
} from './charts/TrendChart.vue'

// ==================== DateRangePicker 组件 ====================
import DateRangePicker from './DateRangePicker/DateRangePicker.vue'
export type {
  DateRangePickerProps,
  DateRangeType,
  DateRangeShortcut,
} from './DateRangePicker/DateRangePicker.vue'
export { DateRangePicker }

// ==================== DataFilter 组件 ====================
import DataFilter from './DataFilter/DataFilter.vue'
export type {
  DataFilterProps,
  FilterConfig,
  FilterType as DataFilterType,
  FilterValue as DataFilterValue,
  FilterOption as DataFilterOption,
} from './DataFilter/DataFilter.vue'
export { DataFilter }

// ==================== MemberContribution 组件 ====================
import MemberContribution from './MemberContribution/MemberContribution.vue'
export type {
  MemberContributionProps,
  IMemberContribution,
} from './MemberContribution/MemberContribution.vue'
export { MemberContribution }

// ==================== 默认导出 ====================
/**
 * 默认导出包含所有基础组件
 * 可用于全局注册
 */
export default {
  DataCard,
  DataTable,
  FilterBar,
  FormDialog,
  StatusTag,
  EmptyState,
  Loading,
  Skeleton,
  ErrorBoundary,
  VirtualList,
  PageTransition,
  DateRangePicker,
  DataFilter,
  MemberContribution,
}
