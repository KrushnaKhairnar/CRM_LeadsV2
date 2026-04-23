import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnalyticsAPI, UsersAPI } from '../api/endpoints'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'

export default function ManagerTeam() {
  const [days, setDays] = useState(30)
  const [sales, setSales] = useState('')
  const { data } = useQuery({ queryKey: ['team', days, sales], queryFn: () => AnalyticsAPI.team({ days, sales_user_id: sales || undefined }) })
  const { data: users } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales() })
  const series = data?.series || []
  const nameOf = (id) => (users || []).find(u => u.user_id === id)?.username || (id ? id.slice(-6) : '—')
  const byPerson = Object.entries(data?.by_person || {}).map(([k, v]) => ({ id: k, name: nameOf(k), ...v }))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Team Performance</div>
          <div className="text-sm text-slate-500">Track individual and overall performance</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-sm" value={days} onChange={e=>setDays(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={15}>15d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
          <select className="text-sm" value={sales} onChange={e=>setSales(e.target.value)}>
            <option value="">All Sales</option>
            {(users || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Leads vs Won vs Revenue">
          <div className="h-72 rounded-2xl overflow-hidden">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="leads_created" stroke="#0ea5e9" fill="url(#gLeads)" strokeWidth={2} />
                <Area yAxisId="left" type="monotone" dataKey="won" stroke="#22c55e" fill="url(#gWon)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#gRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="By Sales (overall)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 text-left">Sales</th>
                  <th className="text-right">Leads</th>
                  <th className="text-right">Won</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byPerson.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.name}</td>
                    <td className="text-right">{p.leads}</td>
                    <td className="text-right">{p.won}</td>
                    <td className="text-right">{Math.round(p.revenue).toLocaleString()}</td>
                  </tr>
                ))}
                {byPerson.length === 0 && <tr><td className="py-4 text-slate-500" colSpan="4">Select “All Sales” to see breakdown.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft transition hover:shadow-hover">
      <div className="font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
