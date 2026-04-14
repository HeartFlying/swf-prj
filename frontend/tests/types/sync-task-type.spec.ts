import { describe, it, expect } from 'vitest'
import type { SyncTask } from '@/types/api'

describe('SyncTask Type Tests', () => {
  it('should accept all valid status values including cancelled', () => {
    // Test that all valid status values can be assigned
    const pendingTask: SyncTask = {
      id: 1,
      taskType: 'full_sync',
      sourceType: 'gitlab',
      status: 'pending',
      createdAt: '2024-03-28T14:30:00Z',
    }
    expect(pendingTask.status).toBe('pending')

    const runningTask: SyncTask = {
      id: 2,
      taskType: 'full_sync',
      sourceType: 'gitlab',
      status: 'running',
      createdAt: '2024-03-28T14:30:00Z',
    }
    expect(runningTask.status).toBe('running')

    const completedTask: SyncTask = {
      id: 3,
      taskType: 'full_sync',
      sourceType: 'gitlab',
      status: 'completed',
      createdAt: '2024-03-28T14:30:00Z',
    }
    expect(completedTask.status).toBe('completed')

    const failedTask: SyncTask = {
      id: 4,
      taskType: 'full_sync',
      sourceType: 'gitlab',
      status: 'failed',
      createdAt: '2024-03-28T14:30:00Z',
    }
    expect(failedTask.status).toBe('failed')

    // This is the key test for P2-1: cancelled status support
    const cancelledTask: SyncTask = {
      id: 5,
      taskType: 'full_sync',
      sourceType: 'gitlab',
      status: 'cancelled',
      createdAt: '2024-03-28T14:30:00Z',
    }
    expect(cancelledTask.status).toBe('cancelled')
  })

  it('should have correct status type union', () => {
    // Type-level test: ensure SyncTask.status accepts all expected values
    type StatusType = SyncTask['status']

    // These should all compile without errors
    const statuses: StatusType[] = [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled',
    ]

    expect(statuses).toHaveLength(5)
    expect(statuses).toContain('cancelled')
  })
})
