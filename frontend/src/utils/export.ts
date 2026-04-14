/**
 * Export Utility Functions
 * 数据导出工具函数
 *
 * @description 提供 Excel 和 CSV 格式的数据导出功能
 * @author DevMetrics Team
 */
import * as XLSX from 'xlsx'

/**
 * 导出格式类型
 */
export type ExportFormat = 'xlsx' | 'csv'

/**
 * 导出数据项接口
 */
export interface ExportDataItem {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 列定义接口
 */
export interface ExportColumn {
  /** 数据字段名 */
  field: string
  /** 列标题 */
  header: string
  /** 格式化函数（可选） */
  formatter?: (value: unknown, row: ExportDataItem) => string | number
}

/**
 * 生成导出文件名
 * @param {string} prefix - 文件名前缀
 * @param {string} extension - 文件扩展名
 * @returns {string} 格式化的文件名
 */
export function generateExportFileName(prefix: string, extension: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.${extension}`
}

/**
 * 将数据转换为工作表数据格式
 * @param {ExportDataItem[]} data - 原始数据
 * @param {ExportColumn[]} columns - 列定义
 * @returns {unknown[]} 转换后的数据
 */
function transformDataForExport(
  data: ExportDataItem[],
  columns: ExportColumn[],
): unknown[] {
  return data.map(row => {
    const newRow: Record<string, string | number> = {}
    columns.forEach(col => {
      const value = row[col.field]
      if (col.formatter) {
        newRow[col.header] = col.formatter(value, row)
      } else {
        newRow[col.header] = value !== null && value !== undefined ? String(value) : ''
      }
    })
    return newRow
  })
}

/**
 * 导出数据到 Excel/CSV 文件
 * @param {ExportDataItem[]} data - 要导出的数据
 * @param {ExportColumn[]} columns - 列定义
 * @param {string} fileName - 文件名（不含扩展名）
 * @param {ExportFormat} format - 导出格式
 */
export function exportToFile(
  data: ExportDataItem[],
  columns: ExportColumn[],
  fileName: string,
  format: ExportFormat = 'xlsx',
): void {
  if (!data || data.length === 0) {
    throw new Error('导出数据不能为空')
  }

  if (!columns || columns.length === 0) {
    throw new Error('列定义不能为空')
  }

  // 转换数据格式
  const transformedData = transformDataForExport(data, columns)

  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(transformedData)

  // 设置列宽
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length * 2 + 2, 12),
  }))
  worksheet['!cols'] = colWidths

  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '统计数据')

  // 生成完整文件名
  const fullFileName = generateExportFileName(fileName, format)

  // 导出文件
  XLSX.writeFile(workbook, fullFileName, {
    bookType: format,
    type: 'binary',
  })
}

/**
 * 导出统计数据（仪表盘专用）
 * @param {object} params - 导出参数
 * @param {ExportDataItem[]} params.todayStats - 今日统计数据
 * @param {ExportDataItem[]} params.weeklyTrend - 周趋势数据
 * @param {ExportDataItem[]} params.languageStats - 语言统计数据
 * @param {ExportDataItem[]} params.rankingList - 排行榜数据
 * @param {ExportFormat} params.format - 导出格式
 * @param {[Date, Date] | null} params.dateRange - 日期范围
 */
export function exportDashboardStats(params: {
  todayStats: ExportDataItem[]
  weeklyTrend: ExportDataItem[]
  languageStats: ExportDataItem[]
  rankingList: ExportDataItem[]
  format: ExportFormat
  dateRange: [Date, Date] | null
}): void {
  const { todayStats, weeklyTrend, languageStats, rankingList, format, dateRange } = params

  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 1. 今日统计工作表
  if (todayStats && todayStats.length > 0) {
    const todayColumns: ExportColumn[] = [
      { field: 'label', header: '统计项' },
      { field: 'value', header: '数值' },
      { field: 'trend', header: '趋势(%)' },
    ]
    const todayData = transformDataForExport(todayStats, todayColumns)
    const todaySheet = XLSX.utils.json_to_sheet(todayData)
    todaySheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, todaySheet, '今日统计')
  }

  // 2. 提交趋势工作表
  if (weeklyTrend && weeklyTrend.length > 0) {
    const trendColumns: ExportColumn[] = [
      { field: 'date', header: '日期' },
      { field: 'commits', header: '提交数' },
      { field: 'tokens', header: 'Token使用量' },
    ]
    const trendData = transformDataForExport(weeklyTrend, trendColumns)
    const trendSheet = XLSX.utils.json_to_sheet(trendData)
    trendSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, trendSheet, '提交趋势')
  }

  // 3. 语言分布工作表
  if (languageStats && languageStats.length > 0) {
    const langColumns: ExportColumn[] = [
      { field: 'language', header: '编程语言' },
      { field: 'lines', header: '代码行数' },
      { field: 'percentage', header: '占比(%)' },
    ]
    const langData = transformDataForExport(languageStats, langColumns)
    const langSheet = XLSX.utils.json_to_sheet(langData)
    langSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, langSheet, '语言分布')
  }

  // 4. 排行榜工作表
  if (rankingList && rankingList.length > 0) {
    const rankColumns: ExportColumn[] = [
      { field: 'rank', header: '排名' },
      { field: 'name', header: '用户名' },
      { field: 'department', header: '部门' },
      { field: 'score', header: '分数' },
    ]
    const rankData = transformDataForExport(rankingList, rankColumns)
    const rankSheet = XLSX.utils.json_to_sheet(rankData)
    rankSheet['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, rankSheet, '排行榜')
  }

  // 生成文件名
  const dateStr = dateRange
    ? `${formatDate(dateRange[0])}_${formatDate(dateRange[1])}`
    : new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const fileName = `statistics_${dateStr}`
  const fullFileName = generateExportFileName(fileName, format)

  // 导出文件
  XLSX.writeFile(workbook, fullFileName, {
    bookType: format,
    type: 'binary',
  })
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的日期字符串 (YYYYMMDD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 验证导出数据
 * @param {unknown} data - 要验证的数据
 * @returns {boolean} 是否为有效的导出数据
 */
export function isValidExportData(data: unknown): data is ExportDataItem[] {
  if (!Array.isArray(data)) {
    return false
  }
  if (data.length === 0) {
    return true // 空数组是有效的
  }
  return data.every(item => typeof item === 'object' && item !== null)
}
