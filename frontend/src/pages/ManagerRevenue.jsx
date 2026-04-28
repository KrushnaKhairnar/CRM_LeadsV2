import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnalyticsAPI, UsersAPI } from '../api/endpoints'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie } from 'recharts'

export default function ManagerRevenue() {
  const [days, setDays] = useState(30)
  const [sales, setSales] = useState('')
  const [status, setStatus] = useState('')
  const [currency, setCurrency] = useState('')
  const { data } = useQuery({ queryKey: ['rev-manager', days, sales, status, currency], queryFn: () => AnalyticsAPI.revenueManager({ days, sales_user_id: sales || undefined, status: status || undefined, currency: currency || undefined }) })
  const { data: salesUsers } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales() })
  const nameOf = (id) => (salesUsers || []).find(u => u.user_id === id)?.username || (id ? id.slice(-6) : '—')
  const bySalesData = Object.entries(data?.by_sales || {}).map(([k, v]) => ({ name: nameOf(k), value: v }))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Revenue</div>
          <div className="text-sm text-slate-500">Totals, trends, and sales breakdown</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-sm" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>7d</option>
            <option value={15}>15d</option>
            <option value={30}>30d</option>
            <option value={90}>90d</option>
          </select>
          <select className="text-sm" value={sales} onChange={e => setSales(e.target.value)}>
            <option value="">All Sales</option>
            {(salesUsers || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
          </select>
          <select className="text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
          <input className="text-sm w-24" placeholder="Currency" value={currency} onChange={e => setCurrency(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <Card title="Total (all time)" value={(data?.total_all ?? 0).toLocaleString('en-GB')} />
        <Card title="Total (period)" value={(data?.total_period ?? 0).toLocaleString('en-GB')} />
        <Card title="Today" value={(data?.today ?? 0).toLocaleString('en-GB')} />
        <Card title="Won From Leads (period)" value={(data?.won_from_leads ?? 0).toLocaleString('en-GB')} />
        <Card title="Pipeline Open (period)" value={(data?.pipeline_open ?? 0).toLocaleString('en-GB')} />
        <Card title="Active currency" value={currency || 'All'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Revenue (last 15 days)">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data?.last15 || []} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="By Sales Person">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={bySalesData} outerRadius={90} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft transition hover:shadow-hover hover:-translate-y-0.5">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
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
