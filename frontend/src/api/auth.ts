/**
 * 认证相关API
 */
import { http } from '@/utils/request'
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  LogoutResponse,
  User,
} from '@/types/api'

/**
 * 用户登录
 * @param data 登录请求数据
 * @returns 登录响应
 */
export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return http.post<LoginResponse>('auth/login', data)
}

/**
 * 用户登出
 * @param data 登出请求数据（可选）
 * @returns 登出响应
 */
export const logout = (data?: LogoutRequest): Promise<LogoutResponse> => {
  return http.post<LogoutResponse>('auth/logout', data || {})
}

/**
 * 刷新访问令牌
 * 后端 /auth/refresh 接收: { refresh_token: string } (snake_case)
 * 后端 /auth/refresh 返回: { access_token: string, refresh_token: string } (snake_case)
 * @param data 刷新令牌请求数据 (前端使用 camelCase: { refreshToken: string })
 * @returns 刷新令牌响应 (包含 snake_case 字段)
 */
export const refreshToken = (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  // 注意: 请求体中的字段名由调用方确保转换为 snake_case
  return http.post<RefreshTokenResponse>('auth/refresh', data)
}

/**
 * 获取当前登录用户信息
 * @returns 当前用户信息
 */
export const getCurrentUser = (): Promise<User> => {
  return http.get<User>('auth/me')
}
