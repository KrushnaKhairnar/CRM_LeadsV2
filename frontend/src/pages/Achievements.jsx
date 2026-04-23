import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AchievementsAPI } from '../api/endpoints'

const ICONS = {
  creator_5: '🌱',
  creator_20: '🌿',
  closer_5: '🏆',
  hot_hunter: '🔥',
  followup_master: '⏱️',
}

export default function Achievements() {
  const { data, isLoading } = useQuery({ queryKey: ['achievements-me'], queryFn: () => AchievementsAPI.me() })
  if (isLoading) return <div>Loading…</div>
  const items = data || []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">My Achievements</div>
          <div className="text-sm text-slate-500">Badges are awarded automatically and by manager</div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map(a => (
          <div key={`${a._id || a.badge_key}-${a.created_at}`} className="relative overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4 shadow-soft">
            <div className="absolute inset-x-0 -top-6 h-16 bg-gradient-to-r from-brand-500/10 via-accent-500/10 to-brand-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="text-2xl">{ICONS[a.badge_key] || '🎖️'}</div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 capitalize">{a.mode}</span>
            </div>
            <div className="mt-2 font-medium">{a.title || a.badge_key}</div>
            {a.description && <div className="text-xs text-slate-500 mt-1">{a.description}</div>}
            {a.created_at && <div className="text-xs text-slate-500 mt-2">Awarded: {new Date(a.created_at).toLocaleString()}</div>}
          </div>
        ))}
        {items.length === 0 && <div className="text-slate-500">No achievements yet.</div>}
      </div>
    </div>
  )
}
