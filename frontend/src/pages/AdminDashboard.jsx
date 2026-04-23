import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UsersAPI } from '../api/endpoints'
import RegisterUserModal from './components/RegisterUserModal'
import { UserPlus, Shield, Users2, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const qc = useQueryClient()
  const [openRegister, setOpenRegister] = useState(false)

  const { data: managers, isLoading } = useQuery({
    queryKey: ['managers'],
    queryFn: () => UsersAPI.listManagers(),
  })

  const managerCount = managers?.length || 0

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Admin Dashboard</div>
          <div className="text-sm text-slate-500">Manage your organization's team hierarchy</div>
        </div>
        <button
          onClick={() => setOpenRegister(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-700 hover:to-accent-700 text-sm shadow-soft hover:shadow-hover transition"
        >
          <UserPlus size={16} /> Register Manager
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users2 size={20} />}
          title="Total Managers"
          value={managerCount}
          gradient="from-brand-500 to-brand-600"
        />
        <StatCard
          icon={<Shield size={20} />}
          title="Role"
          value="ADMIN"
          gradient="from-accent-500 to-accent-600"
        />
        <StatCard
          icon={<Clock size={20} />}
          title="System"
          value="Active"
          gradient="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Managers Table */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-soft overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="font-medium text-slate-800">Registered Managers</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Each manager can create and manage their own sales team
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">User ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="p-4" colSpan="5">Loading…</td></tr>
              )}
              {!isLoading && managerCount === 0 && (
                <tr>
                  <td className="p-8 text-center text-slate-400" colSpan="5">
                    <div className="flex flex-col items-center gap-2">
                      <Users2 size={32} className="text-slate-300" />
                      <div>No managers registered yet</div>
                      <button
                        onClick={() => setOpenRegister(true)}
                        className="text-brand-600 hover:underline text-sm"
                      >
                        Register your first manager →
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {(managers || []).map((m, idx) => (
                <tr key={m.user_id} className="border-t odd:bg-white even:bg-slate-50/60 hover:bg-brand-50/50 transition">
                  <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white text-xs font-semibold">
                        {m.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium text-slate-800">{m.username}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
                      <Shield size={12} /> {m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                    {m.user_id?.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RegisterUserModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        role="MANAGER"
        onCreated={() => qc.invalidateQueries({ queryKey: ['managers'] })}
      />
    </div>
  )
}

function StatCard({ icon, title, value, gradient }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-soft transition hover:shadow-hover hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-soft`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="text-2xl font-semibold mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  )
}
