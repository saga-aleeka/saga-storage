// api.ts (paste-ready)

import { supabase } from './client'
import type { Database } from './client'
import type { PlasmaContainer } from '../../components/PlasmaContainerList'
import type { CurrentUser } from '../../components/UserManagement'
import type { AuditLogEntry } from '../../components/AuditTrail'

// ---- ENV & BASE URL ---------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const PUBLIC_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !PUBLIC_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Function name as deployed in Supabase
const FUNCTION_NAME = 'make-server-aaac77aa'

// Dynamically switch between local development and production
const API_BASE_URL = import.meta.env.DEV 
  ? `/make-server-aaac77aa`
  : `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`

console.log('API_BASE_URL:', API_BASE_URL);

// Shared helper for headers
const jsonHeaders = {
  Authorization: `Bearer ${PUBLIC_ANON_KEY}`,
  'Content-Type': 'application/json',
}

// ---- CONTAINERS --------------------------------------------------------------

export async function fetchContainers(): Promise<PlasmaContainer[]> {
  const res = await fetch(`${API_BASE_URL}/containers`, { headers: jsonHeaders })
  if (!res.ok) throw new Error(`Failed to fetch containers: ${res.statusText}`)
  const data = await res.json()
  return data.containers || []
}

export async function createContainer(
  container: Omit<PlasmaContainer, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<PlasmaContainer> {
  const res = await fetch(`${API_BASE_URL}/containers`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ container, userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to create container: ${err.message || res.statusText}`)
  }
  const data = await res.json()
  return data.container
}

export async function updateContainer(
  id: string,
  container: Partial<PlasmaContainer>,
  userId: string
): Promise<PlasmaContainer> {
  const res = await fetch(`${API_BASE_URL}/containers/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ container, userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to update container: ${err.message || res.statusText}`)
  }
  const data = await res.json()
  return data.container
}

export async function deleteContainer(id: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/containers/${id}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: jsonHeaders,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to delete container: ${err.message || res.statusText}`)
  }
}

// ---- LOCKING ----------------------------------------------------------------

export async function lockContainer(id: string, userId: string, userName: string): Promise<PlasmaContainer> {
  const res = await fetch(`${API_BASE_URL}/containers/${id}/lock`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ userId, userName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to lock container: ${err.message || res.statusText}`)
  }
  const data = await res.json()
  return data.container
}

export async function unlockContainer(id: string, userId: string): Promise<PlasmaContainer> {
  const res = await fetch(`${API_BASE_URL}/containers/${id}/lock?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: jsonHeaders,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to unlock container: ${err.message || res.statusText}`)
  }
  const data = await res.json()
  return data.container
}

// ---- USER SESSIONS ----------------------------------------------------------

export async function updateUserSession(
  userId: string,
  userName: string,
  activityType: string,
  containerId?: string,
  metadata?: any
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ userId, userName, activityType, containerId, metadata }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Failed to update session: ${err.message || res.statusText}`)
  }
}

export async function fetchActiveSessions(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/sessions`, { headers: jsonHeaders })
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.statusText}`)
  const data = await res.json()
  return data.sessions || []
}

// ---- AUDIT LOGS -------------------------------------------------------------

export async function createAuditLog(
  actionType: string,
  resourceType: string,
  resourceId: string,
  details: any,
  userInitials: string,
  options: {
    oldValues?: any
    newValues?: any
    metadata?: any
    severity?: 'low' | 'medium' | 'high' | 'critical'
    success?: boolean
  } = {}
): Promise<void> {
  if (!userInitials) return
  try {
    const res = await fetch(`${API_BASE_URL}/audit-logs`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        actionType,
        resourceType,
        resourceId,
        userId: userInitials,
        userName: userInitials,
        details,
        oldValues: options.oldValues,
        newValues: options.newValues,
        metadata: options.metadata,
        severity: options.severity ?? 'low',
        success: options.success !== false,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Failed to create audit log:', err)
    }
  } catch (e) {
    console.error('Error creating audit log:', e)
  }
}

export async function fetchAuditLogs(filters: {
  limit?: number
  offset?: number
  resourceType?: string
  actionType?: string
  userId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
} = {}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams()
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.resourceType) params.set('resourceType', filters.resourceType)
  if (filters.actionType) params.set('actionType', filters.actionType)
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.severity) params.set('severity', filters.severity)

  const res = await fetch(`${API_BASE_URL}/audit-logs?${params.toString()}`, { headers: jsonHeaders })
  if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.statusText}`)
  const data = await res.json()
  return data.logs || []
}

// ---- REALTIME SUBSCRIPTIONS -------------------------------------------------

export function subscribeToContainers(callback: (containers: PlasmaContainer[]) => void) {
  return supabase
    .channel('containers-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'containers' },
      async () => {
        try {
          const containers = await fetchContainers()
          callback(containers)
        } catch (err) {
          console.error('Error fetching containers after real-time update:', err)
        }
      }
    )
    .subscribe()
}

export function subscribeToUserSessions(callback: (sessions: any[]) => void) {
  return supabase
    .channel('sessions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_sessions' },
      async () => {
        try {
          const sessions = await fetchActiveSessions()
          callback(sessions)
        } catch (err) {
          console.error('Error fetching sessions after real-time update:', err)
        }
      }
    )
    .subscribe()
}

// ---- HEALTH -----------------------------------------------------------------

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { headers: jsonHeaders })
    return res.ok
  } catch (err) {
    console.error('Database health check failed:', err)
    return false
  }
}
