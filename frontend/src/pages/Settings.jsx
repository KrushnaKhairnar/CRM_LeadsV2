import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { UsersAPI, AchievementsAPI, AdminAPI } from '../api/endpoints'
import { useAuthStore } from '../auth/store'
import { toast } from 'sonner'

export default function Settings() {
  const isDark = document.documentElement.classList.contains('dark')
  const [theme, setTheme] = React.useState(isDark ? 'dark' : 'light')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold tracking-tight">Settings</div>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Dark Mode</div>
            <div className="text-sm text-slate-500">Toggle the application theme</div>
          </div>
          <button onClick={toggleTheme} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">
            {theme === 'dark' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      <ManagerAwards />
      <SeedDemoCard />
    </div>
  )
}

function ManagerAwards() {
  const user = useAuthStore(s => s.user)
  const isManager = user?.role === 'MANAGER'
  const { data: sales } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales(), enabled: isManager })
  const [payload, setPayload] = React.useState({ user_id: '', badge_key: 'closer_5', title: '', description: '' })
  if (!isManager) return null
  const submit = async () => {
    try {
      const doc = { ...payload }
      if (!doc.title) doc.title = payload.badge_key
      await AchievementsAPI.award(doc)
      toast.success('Badge awarded')
      setPayload({ user_id: '', badge_key: 'closer_5', title: '', description: '' })
    } catch {
      toast.error('Failed to award badge')
    }
  }
  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
      <div className="font-medium">Manager: Award Badge</div>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div>
          <div className="text-sm font-medium">Sales User</div>
          <select className="mt-1 w-full" value={payload.user_id} onChange={e => setPayload(p => ({ ...p, user_id: e.target.value }))}>
            <option value="">Select user</option>
            {(sales || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm font-medium">Badge</div>
          <select className="mt-1 w-full" value={payload.badge_key} onChange={e => setPayload(p => ({ ...p, badge_key: e.target.value }))}>
            <option value="closer_5">Closed/Won 5 Deals</option>
            <option value="creator_5">Created 5 Leads</option>
            <option value="creator_20">Created 20 Leads</option>
            <option value="hot_hunter">10 HOT Leads</option>
            <option value="followup_master">On-time Followups</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <div className="text-sm font-medium">Title</div>
          <input className="mt-1 w-full" value={payload.title} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} placeholder="Optional" />
        </div>
        <div className="md:col-span-2">
          <div className="text-sm font-medium">Description</div>
          <textarea className="mt-1 w-full" rows="3" value={payload.description} onChange={e => setPayload(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button onClick={submit} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Award</button>
        </div>
      </div>
    </div>
  )
}

function SeedDemoCard() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  if (!isAdmin) return null
  const seed = async () => {
    try {
      await AdminAPI.seed()
      toast.success('Demo data seeded')
    } catch {
      toast.error('Seeding failed')
    }
  }
  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Seed Demo Data</div>
          <div className="text-sm text-slate-500">Populate leads and invoices for rich visual dashboards</div>
        </div>
        <button onClick={seed} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Seed Now</button>
      </div>
    </div>
  )
}
