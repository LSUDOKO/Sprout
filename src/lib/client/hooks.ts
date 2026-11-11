'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Me } from './api'

export const meKey = ['me'] as const

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => api<Me>('/api/me'),
    retry: (n, e) => n < 2 && !(e && 'status' in e && (e as { status: number }).status === 401),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

export function useRefreshMe() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: meKey })
}
