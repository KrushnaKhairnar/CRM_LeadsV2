import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnalyticsAPI, LeadsAPI } from '../api/endpoints'
import { PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import { UsersAPI } from '../api/endpoints'
import { Link } from 'react-router-dom'
import RegisterUserModal from './components/RegisterUserModal'
import { UserPlus } from 'lucide-react'

export default function ManagerDashboard() {
  const qc = useQueryClient()
  const [days, setDays] = useState(30)
  const [openRegister, setOpenRegister] = useState(false)
  const { data } = useQuery({ queryKey: ['analytics-manager', days], queryFn: () => AnalyticsAPI.manager({ days }) })
  const { data: leads } = useQuery({ queryKey: ['leads', { page: 1 }], queryFn: () => LeadsAPI.list({ page: 1, page_size: 10, sort_by: 'updated_at' }) })
  const { data: rev } = useQuery({ queryKey: ['rev-manager', days], queryFn: () => AnalyticsAPI.revenueManager({ days }) })
  const { data: users } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales() })
  const { data: myTeam } = useQuery({ queryKey: ['my-team'], queryFn: () => UsersAPI.myTeam() })

  const statusData = useMemo(() => {
    const m = data?.by_status || {}
    return Object.keys(m).map(k => ({ name: k, value: m[k] }))
  }, [data])

  const pieColors = ['#10b981', '#14b8a6', '#f59e0b', '#0ea5e9', '#f43f5e', '#a3e635']

  const tempData = useMemo(() => {
    const m = data?.by_temperature || {}
    return Object.keys(m).map(k => ({ name: k, value: m[k] }))
  }, [data])

  const salesData = useMemo(() => {
    const m = data?.by_sales_person || {}
    const nameOf = (id) => (users || []).find(u => u.user_id === id)?.username || (id === 'UNASSIGNED' ? 'UNASSIGNED' : (id ? id.slice(-6) : '—'))
    return Object.keys(m).map(k => ({ name: nameOf(k), value: m[k] }))
  }, [data, users])

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Manager Dashboard</div>
          <div className="text-sm text-slate-500">Overview and team performance</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenRegister(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-700 hover:to-accent-700 text-sm shadow-soft hover:shadow-hover transition"
          >
            <UserPlus size={16} /> Register Sales Person
          </button>
          <select className="text-sm" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <Card title="My Sales Team" value={myTeam?.length ?? '-'} />
        <Card title="Total Leads" value={data?.total_leads ?? '-'} />
        <Card title="Overdue Followups" value={data?.overdue_followups ?? '-'} />
        <Card title="Today's Followups" value={data?.today_followups ?? '-'} />
        <Card title="Revenue (today)" value={(rev?.today ?? 0).toLocaleString('en-GB')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Leads by Status">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={statusData} outerRadius={90} label>
                  {statusData.map((_, idx) => <Cell key={`s-${idx}`} fill={pieColors[idx % pieColors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Leads by Temperature">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={tempData} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} fill="url(#gTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Leads by Sales Person">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={salesData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Revenue (last 15 days)">
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={rev?.last15 || []} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="gRevDash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#gRevDash)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Recent Leads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Next Followup</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(leads?.items || []).map(l => (
                <tr key={l._id} className="border-t">
                  <td className="py-2">{l.name}</td>
                  <td>{l.company || '-'}</td>
                  <td>{l.status}</td>
                  <td>{l.next_followup_at ? new Date(l.next_followup_at).toLocaleString('en-GB') : '-'}</td>
                  <td className="text-right"><Link className="text-brand-700 hover:underline" to={`/leads/${l.lead_id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <RegisterUserModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        role="SALES"
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ['my-team'] })
          qc.invalidateQueries({ queryKey: ['sales-users'] })
        }}
      />
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft transition hover:shadow-hover hover:-translate-y-0.5">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft transition hover:shadow-hover">
      <div className="font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
