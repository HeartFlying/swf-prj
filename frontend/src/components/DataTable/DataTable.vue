<script setup lang="ts" generic="T extends Record<string, any>">
import { ref, computed, useSlots, watch, nextTick, onMounted } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElPagination,
  ElEmpty,
  vLoading,
} from 'element-plus'

// 筛选选项
export interface FilterOption {
  text: string
  value: any
}

// 列配置
export interface DataTableColumn<T = any> {
  /** 列属性名 */
  prop: keyof T | string
  /** 列标题 */
  label: string
  /** 列宽度 */
  width?: number | string
  /** 最小宽度 */
  minWidth?: number | string
  /** 是否固定列 */
  fixed?: 'left' | 'right' | boolean
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 表头对齐方式 */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sortable?: boolean | 'custom'
  /** 排序方法 */
  sortMethod?: (a: T, b: T) => number
  /** 筛选选项 */
  filters?: FilterOption[]
  /** 筛选方法 */
  filterMethod?: (value: any, row: T) => boolean
  /** 是否多选筛选 */
  filterMultiple?: boolean
  /** 是否隐藏列 */
  hidden?: boolean
  /** 自定义插槽名称 */
  slot?: string
  /** 是否显示溢出提示 */
  showOverflowTooltip?: boolean
  /** 自定义单元格类名 */
  className?: string
  /** 自定义渲染函数 */
  formatter?: (row: T, column: any, cellValue: any, index: number) => string
}

// 分页配置
export interface DataTablePagination {
  /** 当前页 */
  currentPage: number
  /** 每页条数 */
  pageSize: number
  /** 总条数 */
  total: number
}

// 排序配置
export interface DataTableSort {
  prop: string
  order: 'ascending' | 'descending'
}

// 组件属性
export interface DataTableProps<T = any> {
  /** 表格数据 */
  data: T[]
  /** 列配置 */
  columns: DataTableColumn<T>[]
  /** 是否加载中 */
  loading?: boolean
  /** 加载文本 */
  loadingText?: string
  /** 分页配置，null表示不显示分页 */
  pagination?: DataTablePagination | null
  /** 每页条数选项 */
  pageSizes?: number[]
  /** 是否显示选择列 */
  showSelection?: boolean
  /** 是否可多选 */
  selectMultiple?: boolean
  /** 表格高度 */
  height?: number | string
  /** 最大高度 */
  maxHeight?: number | string
  /** 是否显示斑马纹 */
  stripe?: boolean
  /** 是否显示边框 */
  border?: boolean
  /** 行类名 */
  rowClassName?: string | ((params: { row: any; rowIndex: number }) => string)
  /** 单元格类名 */
  cellClassName?: string | (({ row, column, rowIndex, columnIndex }: any) => string)
  /** 空数据文本 */
  emptyText?: string
  /** 默认排序 */
  defaultSort?: DataTableSort
  /** 行Key */
  rowKey?: string | ((row: any) => string)
  /** 是否高亮当前行 */
  highlightCurrentRow?: boolean
  /** 是否显示表头 */
  showHeader?: boolean
  /** 表格尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 是否自适应宽度 */
  fit?: boolean
  /** 是否显示分页器背景 */
  pagerBackground?: boolean
  /** 分页布局 */
  pagerLayout?: string
  /** 行 data-testid 属性名 */
  rowTestId?: string
}

const props = withDefaults(defineProps<DataTableProps<T>>(), {
  loading: false,
  loadingText: '加载中...',
  pagination: null,
  pageSizes: () => [10, 20, 50, 100],
  showSelection: false,
  selectMultiple: true,
  stripe: false,
  border: false,
  emptyText: '暂无数据',
  rowKey: 'id',
  highlightCurrentRow: false,
  showHeader: true,
  size: 'default',
  fit: true,
  pagerBackground: true,
  pagerLayout: 'total, sizes, prev, pager, next, jumper',
  rowTestId: 'table-row',
})

const emit = defineEmits<{
  /** 排序变化 */
  (e: 'sort-change', sort: DataTableSort): void
  /** 筛选变化 */
  (e: 'filter-change', filters: Record<string, any>): void
  /** 页码变化 */
  (e: 'page-change', page: number): void
  /** 每页条数变化 */
  (e: 'size-change', size: number): void
  /** 选择变化 */
  (e: 'selection-change', selection: T[]): void
  /** 行点击 */
  (e: 'row-click', row: T, column: any, event: Event): void
  /** 单元格点击 */
  (e: 'cell-click', row: T, column: any, cell: any, event: Event): void
  /** 表头点击 */
  (e: 'header-click', column: any, event: Event): void
  /** 当前行变化 */
  (e: 'current-change', currentRow: T | null, oldCurrentRow: T | null): void
  /** 分页配置更新 */
  (e: 'update:pagination', pagination: DataTablePagination): void
}>()

const slots = useSlots()
const tableRef = ref<InstanceType<typeof ElTable> | null>(null)

// 使用 computed getter/setter 处理分页状态，避免直接修改 prop
const currentPage = computed({
  get: () => props.pagination?.currentPage ?? 1,
  set: (val: number) => {
    if (props.pagination) {
      emit('update:pagination', {
        ...props.pagination,
        currentPage: val,
      })
    }
  },
})

const pageSize = computed({
  get: () => props.pagination?.pageSize ?? 10,
  set: (val: number) => {
    if (props.pagination) {
      emit('update:pagination', {
        ...props.pagination,
        pageSize: val,
      })
    }
  },
})

// 可见列
const visibleColumns = computed(() => {
  return props.columns.filter(col => !col.hidden)
})

// 处理排序变化
const handleSortChange = (sort: any) => {
  emit('sort-change', {
    prop: sort.prop,
    order: sort.order,
  })
}

// 处理筛选变化
const handleFilterChange = (filters: Record<string, any>) => {
  emit('filter-change', filters)
}

// 处理页码变化
const handlePageChange = (page: number) => {
  emit('page-change', page)
}

// 处理每页条数变化
const handleSizeChange = (size: number) => {
  emit('size-change', size)
}

// 处理选择变化
const handleSelectionChange = (selection: T[]) => {
  emit('selection-change', selection)
}

// 处理行点击
const handleRowClick = (row: T, column: any, event: Event) => {
  emit('row-click', row, column, event)
}

// 处理单元格点击
const handleCellClick = (row: T, column: any, cell: any, event: Event) => {
  emit('cell-click', row, column, cell, event)
}

// 处理表头点击
const handleHeaderClick = (column: any, event: Event) => {
  emit('header-click', column, event)
}

// 处理当前行变化
const handleTableCurrentChange = (currentRow: T | null, oldCurrentRow: T | null) => {
  emit('current-change', currentRow, oldCurrentRow)
}

// 清除选择
const clearSelection = () => {
  tableRef.value?.clearSelection()
}

// 切换行选择
const toggleRowSelection = (row: T, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected)
}

// 切换全选
const toggleAllSelection = () => {
  tableRef.value?.toggleAllSelection()
}

// 获取选择行
const getSelectionRows = (): T[] => {
  return tableRef.value?.getSelectionRows() || []
}

// 设置当前行
const setCurrentRow = (row: T | undefined) => {
  tableRef.value?.setCurrentRow(row)
}

// 清空排序
const clearSort = () => {
  tableRef.value?.clearSort()
}

// 清空筛选
const clearFilter = (columnKey?: string | string[]) => {
  tableRef.value?.clearFilter(columnKey)
}

// 滚动到指定行
const scrollTo = (options: { top?: number; left?: number; behavior?: ScrollBehavior }) => {
  // @ts-ignore
  tableRef.value?.scrollTo?.(options)
}

// 设置滚动位置
const setScrollTop = (top: number) => {
  // @ts-ignore
  tableRef.value?.setScrollTop?.(top)
}

const setScrollLeft = (left: number) => {
  // @ts-ignore
  tableRef.value?.setScrollLeft?.(left)
}

// 暴露方法
defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  getSelectionRows,
  setCurrentRow,
  clearSort,
  clearFilter,
  scrollTo,
  setScrollTop,
  setScrollLeft,
  tableRef,
})

// 获取列插槽名称
const getColumnSlotName = (column: DataTableColumn<T>): string => {
  return column.slot || `column-${String(column.prop)}`
}

// 检查列是否有自定义插槽
const hasColumnSlot = (column: DataTableColumn<T>): boolean => {
  const slotName = getColumnSlotName(column)
  return !!slots[slotName]
}

// 处理行类名
const resolveRowClassName = ({ row, rowIndex }: { row: T; rowIndex: number }): string => {
  const classes: string[] = []

  // 添加自定义行类名
  if (typeof props.rowClassName === 'function') {
    classes.push(props.rowClassName({ row, rowIndex }))
  } else if (props.rowClassName) {
    classes.push(props.rowClassName)
  }

  // 添加 testid 标记类（用于 E2E 测试选择）
  // 使用类名形式，因为 Element Plus 不直接支持 data-testid 属性
  classes.push(props.rowTestId)

  return classes.join(' ')
}

// 给表格行添加 data-testid 属性（用于 E2E 测试）
const applyRowTestIds = async () => {
  if (!props.rowTestId) return

  await nextTick()

  const tableEl = tableRef.value?.$el as HTMLElement | undefined
  if (!tableEl) return

  const rows = tableEl.querySelectorAll('.el-table__row')
  rows.forEach((row) => {
    row.setAttribute('data-testid', props.rowTestId)
  })
}

// 监听数据变化，更新 data-testid
watch(() => props.data, applyRowTestIds, { deep: true })
watch(() => props.rowTestId, applyRowTestIds)

// 组件挂载时应用
onMounted(applyRowTestIds)
</script>

<template>
  <div class="data-table" data-testid="data-table">
    <!-- 表格主体 -->
    <div class="data-table__wrapper" data-testid="loading-mask">
      <el-table
        ref="tableRef"
        :data="data"
        :loading="loading"
        :element-loading-text="loadingText"
        :height="height"
        :max-height="maxHeight"
        :stripe="stripe"
        :border="border"
        :row-class-name="resolveRowClassName"
        :cell-class-name="cellClassName"
        :default-sort="defaultSort"
        :row-key="rowKey"
        :highlight-current-row="highlightCurrentRow"
        :show-header="showHeader"
        :size="size"
        :fit="fit"
        v-loading="loading"
        @sort-change="handleSortChange"
        @filter-change="handleFilterChange"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        @cell-click="handleCellClick"
        @header-click="handleHeaderClick"
        @current-change="handleTableCurrentChange"
      >
        <!-- 选择列 -->
        <el-table-column
          v-if="showSelection"
          type="selection"
          width="55"
          align="center"
          :reserve-selection="true"
        />

        <!-- 数据列 -->
        <el-table-column
          v-for="column in visibleColumns"
          :key="String(column.prop)"
          :prop="String(column.prop)"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          :align="column.align"
          :header-align="column.headerAlign"
          :sortable="column.sortable"
          :sort-method="column.sortMethod"
          :filters="column.filters"
          :filter-method="column.filterMethod"
          :filter-multiple="column.filterMultiple"
          :show-overflow-tooltip="column.showOverflowTooltip"
          :class-name="column.className"
          :formatter="column.formatter"
        >
          <template #default="{ row, column: col, $index }">
            <!-- 自定义插槽 -->
            <slot
              v-if="hasColumnSlot(column)"
              :name="getColumnSlotName(column)"
              :row="row"
              :column="col"
              :index="$index"
              :value="row[column.prop as keyof T]"
            />
            <!-- 默认显示 -->
            <span v-else>
              {{ row[column.prop as keyof T] }}
            </span>
          </template>
        </el-table-column>

        <!-- 空数据 -->
        <template #empty>
          <el-empty :description="emptyText" data-testid="empty-state" />
        </template>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div v-if="pagination" class="data-table__pagination" data-testid="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="pagination.total"
        :background="pagerBackground"
        :layout="pagerLayout"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.data-table {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__wrapper {
    flex: 1;
    overflow: hidden;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0;
    margin-top: 8px;
  }

  // 表格样式优化（使用科技风主题变量）
  :deep(.el-table) {
    --el-table-header-bg-color: var(--tech-bg-tertiary, #132f4c);
    --el-table-header-text-color: var(--tech-cyan, #00d4ff);

    .el-table__header {
      th {
        font-weight: 600;
        color: var(--tech-cyan, #00d4ff);
        background-color: var(--tech-bg-tertiary, #132f4c);
      }
    }

    .el-table__row {
      transition: background-color 0.2s ease;
    }

    td {
      color: var(--tech-text-secondary, rgba(255, 255, 255, 0.85));
    }
  }

  // 分页器样式优化
  :deep(.el-pagination) {
    .el-pagination__total {
      color: var(--el-text-color-regular);
    }

    .el-pagination__sizes {
      margin-right: 16px;
    }
  }
}
</style>
