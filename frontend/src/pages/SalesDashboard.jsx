import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LeadsAPI, AnalyticsAPI } from '../api/endpoints'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import CreateLeadModal from './components/CreateLeadModal'

export default function SalesDashboard() {
  const { data } = useQuery({ queryKey: ['leads-sales', { page: 1 }], queryFn: () => LeadsAPI.list({ page: 1, page_size: 10 }) })
  const { data: ana } = useQuery({ queryKey: ['analytics-sales'], queryFn: () => AnalyticsAPI.salesMe({ days: 30 }) })
  const [openCreate, setOpenCreate] = useState(false)

  const overdue = useMemo(() => (data?.items || []).filter(l => l.is_overdue), [data])
  const dueToday = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return (data?.items || []).filter(l => l.next_followup_at && new Date(l.next_followup_at) >= start && new Date(l.next_followup_at) < end)
  }, [data])

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Sales Dashboard</div>
        <div className="text-sm text-slate-500">Your assigned/created leads and followups</div>
        <div className="mt-3">
          <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm shadow-soft hover:shadow-hover">+ Quick Add Lead</button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card title="My Leads (30d)" value={ana?.total ?? '-'} />
        <Card title="Won" value={ana?.won ?? '-'} />
        <Card title="Lost" value={ana?.lost ?? '-'} />
        <Card title="Overdue" value={ana?.overdue ?? '-'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={`Followups Due Today (${dueToday.length})`}>
          <div className="space-y-2">
            {dueToday.length === 0 && <div className="text-sm text-slate-500">Nothing due today.</div>}
            {dueToday.map(l => (
              <Link key={l._id} to={`/leads/${l.lead_id}`} className="block border rounded-xl p-3 hover:bg-slate-50 transition">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-slate-500">{new Date(l.next_followup_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title={`Overdue Followups (${overdue.length})`}>
          <div className="space-y-2">
            {overdue.length === 0 && <div className="text-sm text-slate-500">No overdue followups.</div>}
            {overdue.map(l => (
              <Link key={l._id} to={`/leads/${l.lead_id}`} className="block border border-rose-200 rounded-xl p-3 hover:bg-rose-50 transition">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-rose-700">Overdue since {new Date(l.next_followup_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="My Assigned / Created Leads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Name</th>
                <th>Status</th>
                <th>Temp</th>
                <th>Next Followup</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map(l => (
                <tr key={l._id} className="border-t">
                  <td className="py-2">{l.name}</td>
                  <td><Badge value={l.status} /></td>
                  <td><Badge value={l.temperature} /></td>
                  <td>{l.next_followup_at ? new Date(l.next_followup_at).toLocaleString() : '-'}</td>
                  <td className="text-right"><Link className="text-brand-700 hover:underline" to={`/leads/${l.lead_id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <CreateLeadModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={() => setOpenCreate(false)} />
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
