/**
 * 用户相关API
 */
import { http } from '@/utils/request'
import type {
  PaginatedResponse,
  User,
  Project,
  UserCreate,
  UserUpdate,
  UserProfileUpdate,
} from '@/types/api'

/**
 * 获取用户列表
 * @param params 查询参数
 * @returns 用户列表（分页）
 */
export const getUsers = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  role?: string
  status?: string
}): Promise<PaginatedResponse<User>> => {
  return http.get<PaginatedResponse<User>>('users', { params })
}

/**
 * 根据ID获取用户
 * @param id 用户ID
 * @returns 用户信息
 */
export const getUserById = (id: number): Promise<User> => {
  return http.get<User>(`/users/${id}`)
}

/**
 * 创建用户
 * @param data 用户数据
 * @returns 创建的用户
 */
export const createUser = (data: UserCreate): Promise<User> => {
  return http.post<User>('users', data)
}

/**
 * 更新用户
 * @param id 用户ID
 * @param data 用户数据
 * @returns 更新后的用户
 */
export const updateUser = (id: number, data: UserUpdate): Promise<User> => {
  return http.put<User>(`/users/${id}`, data)
}

/**
 * 删除用户
 * @param id 用户ID
 * @returns 删除结果
 */
export const deleteUser = (id: number): Promise<void> => {
  return http.delete<void>(`/users/${id}`)
}

/**
 * 获取当前用户的项目列表
 * @returns 项目列表
 */
export const getUserProjects = (): Promise<Project[]> => {
  return http.get<Project[]>('users/me/projects')
}

/**
 * 更新当前用户资料
 * @param data 用户资料数据
 * @returns 更新后的用户信息
 */
export const updateCurrentUser = (data: UserProfileUpdate): Promise<User> => {
  return http.patch<User>('users/me', data)
}

/**
 * 修改当前用户密码
 * 后端 /users/me/change-password 接收 snake_case: { old_password: string, new_password: string }
 * @param data 密码数据 (后端API使用 snake_case 字段名)
 * @returns 无返回值
 */
export const changePassword = (data: {
  old_password: string  // 后端使用 snake_case
  new_password: string  // 后端使用 snake_case
}): Promise<void> => {
  return http.post<void>('users/me/change-password', data)
}
