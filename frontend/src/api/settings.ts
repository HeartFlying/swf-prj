/**
 * 系统设置相关API
 */
import { http } from '@/utils/request'
import type { SystemSettings } from '@/types/api'

/**
 * 获取系统设置
 * @returns 系统设置
 */
export const getSettings = (): Promise<SystemSettings> => {
  return http.get<SystemSettings>('settings')
}

/**
 * 更新系统设置
 * @param settings 系统设置
 * @returns 更新后的系统设置
 */
export const updateSettings = (settings: SystemSettings): Promise<SystemSettings> => {
  return http.put<SystemSettings>('settings', settings)
}
