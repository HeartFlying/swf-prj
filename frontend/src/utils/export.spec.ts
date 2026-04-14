/**
 * Export Utility Tests
 * 导出工具函数测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateExportFileName,
  exportToFile,
  exportDashboardStats,
  isValidExportData,
  type ExportDataItem,
  type ExportColumn,
} from './export'

// Mock XLSX library
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

describe('Export Utility Functions', () => {
  describe('generateExportFileName', () => {
    it('should generate correct filename format', () => {
      const mockDate = new Date('2024-01-15T10:30:45')
      vi.setSystemTime(mockDate)

      const result = generateExportFileName('statistics', 'xlsx')

      expect(result).toBe('statistics_20240115_103045.xlsx')
    })

    it('should pad single digit values with zero', () => {
      const mockDate = new Date('2024-01-05T05:05:05')
      vi.setSystemTime(mockDate)

      const result = generateExportFileName('report', 'csv')

      expect(result).toBe('report_20240105_050505.csv')
    })
  })

  describe('isValidExportData', () => {
    it('should return true for valid array data', () => {
      const data: ExportDataItem[] = [
        { name: 'Test', value: 100 },
        { name: 'Test2', value: 200 },
      ]

      expect(isValidExportData(data)).toBe(true)
    })

    it('should return true for empty array', () => {
      expect(isValidExportData([])).toBe(true)
    })

    it('should return false for non-array data', () => {
      expect(isValidExportData(null)).toBe(false)
      expect(isValidExportData(undefined)).toBe(false)
      expect(isValidExportData({})).toBe(false)
      expect(isValidExportData('string')).toBe(false)
    })
  })

  describe('exportToFile', () => {
    const mockData: ExportDataItem[] = [
      { name: 'Item 1', value: 100, status: 'active' },
      { name: 'Item 2', value: 200, status: 'inactive' },
    ]

    const mockColumns: ExportColumn[] = [
      { field: 'name', header: '名称' },
      { field: 'value', header: '数值' },
      { field: 'status', header: '状态' },
    ]

    it('should throw error for empty data', () => {
      expect(() => {
        exportToFile([], mockColumns, 'test', 'xlsx')
      }).toThrow('导出数据不能为空')
    })

    it('should throw error for empty columns', () => {
      expect(() => {
        exportToFile(mockData, [], 'test', 'xlsx')
      }).toThrow('列定义不能为空')
    })
  })

  describe('exportDashboardStats', () => {
    const mockParams = {
      todayStats: [
        { label: '提交', value: 100, trend: 10 },
        { label: '代码', value: 500, trend: 5 },
      ],
      weeklyTrend: [
        { date: '周一', commits: 10, tokens: 1000 },
        { date: '周二', commits: 15, tokens: 1500 },
      ],
      languageStats: [
        { language: 'TypeScript', lines: 1000, percentage: 60 },
        { language: 'Python', lines: 500, percentage: 40 },
      ],
      rankingList: [
        { rank: 1, name: 'User1', department: 'Dev', score: 1000 },
        { rank: 2, name: 'User2', department: 'QA', score: 800 },
      ],
      format: 'xlsx' as const,
      dateRange: null as [Date, Date] | null,
    }

    it('should export with correct date range in filename', () => {
      const dateRange: [Date, Date] = [
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      ]

      // Should not throw
      expect(() => {
        exportDashboardStats({
          ...mockParams,
          dateRange,
        })
      }).not.toThrow()
    })

    it('should export without date range', () => {
      expect(() => {
        exportDashboardStats({
          ...mockParams,
          dateRange: null,
        })
      }).not.toThrow()
    })
  })
})
