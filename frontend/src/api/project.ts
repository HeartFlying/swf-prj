/**
 * 项目相关API
 */
import { http } from '@/utils/request'
import type {
  PaginatedResponse,
  Project,
  ProjectMember,
} from '@/types/api'

/**
 * 获取项目列表
 * @param params 查询参数
 * @returns 项目列表（分页）
 */
export const getProjects = (params?: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  stage?: string  // 添加 stage 参数
}): Promise<PaginatedResponse<Project>> => {
  return http.get<PaginatedResponse<Project>>('projects', { params })
}

/**
 * 根据ID获取项目
 * @param id 项目ID
 * @returns 项目信息
 */
export const getProjectById = (id: number): Promise<Project> => {
  return http.get<Project>(`/projects/${id}`)
}

/**
 * 创建项目
 * @param data 项目数据
 * @returns 创建的项目
 */
export const createProject = (data: Partial<Project>): Promise<Project> => {
  return http.post<Project>('projects', data)
}

/**
 * 更新项目
 * @param id 项目ID
 * @param data 项目数据
 * @returns 更新后的项目
 */
export const updateProject = (id: number, data: Partial<Project>): Promise<Project> => {
  return http.put<Project>(`/projects/${id}`, data)
}

/**
 * 删除项目
 * @param id 项目ID
 * @returns 删除结果
 */
export const deleteProject = (id: number): Promise<void> => {
  return http.delete<void>(`/projects/${id}`)
}

/**
 * 获取项目成员
 * @param projectId 项目ID
 * @param params 查询参数
 * @returns 成员列表
 */
export const getProjectMembers = (
  projectId: number,
  params?: { page?: number; pageSize?: number; simple?: boolean }
): Promise<PaginatedResponse<ProjectMember>> => {
  return http.get<PaginatedResponse<ProjectMember>>(`/projects/${projectId}/members`, { params })
}

/**
 * 添加项目成员
 * 后端 /projects/{id}/members 接收 snake_case: { user_id: number, role: string }
 * @param projectId 项目ID
 * @param data 成员数据 (后端API使用 snake_case 字段名)
 * @returns 添加的成员
 */
export const addProjectMember = (
  projectId: number,
  data: { user_id: number; role: string }  // user_id: 后端使用 snake_case
): Promise<ProjectMember> => {
  return http.post<ProjectMember>(`/projects/${projectId}/members`, data)
}

/**
 * 移除项目成员
 * @param projectId 项目ID
 * @param memberId 成员ID
 * @returns 删除结果
 */
export const removeProjectMember = (projectId: number, memberId: number): Promise<void> => {
  return http.delete<void>(`/projects/${projectId}/members/${memberId}`)
}

/**
 * 更新项目成员角色
 * @param projectId 项目ID
 * @param memberId 成员ID
 * @param role 新角色
 * @returns 更新后的成员信息
 */
export const updateProjectMember = (
  projectId: number,
  memberId: number,
  role: string
): Promise<ProjectMember> => {
  return http.put<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role })
}
