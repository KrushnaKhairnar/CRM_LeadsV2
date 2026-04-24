import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/store'
import NotificationBell from '../features/notifications/NotificationBell'
import { LogOut, LayoutDashboard, Users, Users2, List, KanbanSquare, Bookmark, Sun, Moon, Settings, UserCircle2, Medal, TrendingUp, Banknote, Search, SquareActivity } from 'lucide-react'

const linkClass = ({ isActive }) =>
  `group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-700 hover:bg-slate-100 hover:shadow-soft'}`

export default function Layout({ children }) {
  const { user, clear } = useAuthStore()
  const nav = useNavigate()
  const isManager = user?.role === 'MANAGER'
  const isAdmin = user?.role === 'ADMIN'
  const [term, setTerm] = useState('')
  const goSearch = () => {
    const t = term.trim()
    if (!t) {
      nav('/leads')
      return
    }
    const qs = new URLSearchParams({ q: t })
    nav(`/leads?${qs.toString()}`)
  }
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-64 bg-white/70 dark:bg-slate-900/60 backdrop-blur border-r dark:border-slate-800 p-4 hidden md:block">
        <div className="text-lg font-semibold tracking-tight">CRM Leads</div>
        <div className="text-xs text-slate-500 mt-1">Role: {user?.role}</div>
        <nav className="mt-6 space-y-1 animate-in-up">
          <NavLink to="/" className={linkClass}><LayoutDashboard size={16} /> Dashboard</NavLink>

          {/* Admin-only links */}
          {isAdmin && (
            <>
              <NavLink to="/leads" className={linkClass}><List size={16} /> All Leads</NavLink>
            </>
          )}

          {/* Manager & Sales links */}
          {!isAdmin && (
            <>
              <NavLink to="/leads" className={linkClass}><List size={16} /> Leads</NavLink>
              <NavLink to="/kanban" className={linkClass}><KanbanSquare size={16} /> Kanban</NavLink>
            </>
          )}

          {isManager && <NavLink to="/projects" className={linkClass}><SquareActivity size={16} /> Projects</NavLink>}
          {isManager && <NavLink to="/analytics" className={linkClass}><TrendingUp size={16} /> Analytics</NavLink>}
          {isManager && <NavLink to="/team" className={linkClass}><Users2 size={16} /> Team Performance</NavLink>}
          {isManager && <NavLink to="/revenue" className={linkClass}><Banknote size={16} /> Revenue</NavLink>}
          {isManager && <NavLink to="/my-team" className={linkClass}><Users2 size={16} /> My Team</NavLink>}

          {!isAdmin && <NavLink to="/views" className={linkClass}><Bookmark size={16} /> Saved Views</NavLink>}
          {!isAdmin && <NavLink to="/invoices" className={linkClass}><Banknote size={16} /> Invoices</NavLink>}

          {(!isManager && !isAdmin) && <NavLink to="/achievements" className={linkClass}><Medal size={16} /> Achievements</NavLink>}
          <NavLink to="/profile" className={linkClass}><UserCircle2 size={16} /> My Profile</NavLink>
          <NavLink to="/settings" className={linkClass}><Settings size={16} /> Settings</NavLink>
        </nav>
      </aside>

      <div className="md:ml-64">
        <header className="bg-white/80 dark:bg-slate-900/70 backdrop-blur border-b dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="font-semibold text-slate-800 tracking-tight">Welcome, {user?.username}</div>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={term}
                onChange={e => setTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') goSearch() }}
                placeholder="Search name, phone, company"
                className="w-full pl-9 h-10 rounded-full bg-white/60 backdrop-blur-xl border border-white/60 focus:ring-brand-500"
              />
            </div>
            <button onClick={goSearch} className="px-3 py-2 rounded-full bg-gradient-to-r from-brand-600 to-accent-600 text-white text-sm">Search</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'dark' ? <Sun size={18} className="text-slate-700 dark:text-slate-200" /> : <Moon size={18} className="text-slate-700" />}
            </button>
            <NotificationBell />
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-brand-600 text-white hover:bg-brand-700 shadow-soft hover:shadow-hover"
              onClick={() => { clear(); nav('/login') }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6 animate-in-up">{children}</main>
      </div>
    </div>
  )
}
