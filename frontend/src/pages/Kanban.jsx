import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LeadsAPI, UsersAPI } from '../api/endpoints'
import { useAuthStore } from '../auth/store'
import Badge from '../components/Badge'
import CreateLeadModal from './components/CreateLeadModal'
import { DollarSign, Calendar, Building2, User as UserIcon, Filter, SortDesc } from 'lucide-react'

const STAGES = ['NEW', 'CONTACTED', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

export default function Kanban() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isManager = user?.role === 'MANAGER'
  const [assignedTo, setAssignedTo] = useState('')
  const [q, setQ] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [dragOver, setDragOver] = useState('')
  const [quickStage, setQuickStage] = useState(null)
  const [sortBy, setSortBy] = useState('updated_at') // expected_value | next_followup_at | updated_at

  const { data: leadsRes, isLoading } = useQuery({
    queryKey: ['kanban-leads', assignedTo, q],
    queryFn: () => LeadsAPI.list({
      page: 1, page_size: 100, sort_by: 'updated_at', sort_dir: -1,
      assigned_to: isManager ? (assignedTo || undefined) : undefined,
      q: q || undefined,
    })
  })
  const { data: salesUsers } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales(), enabled: isManager })

  let leads = leadsRes?.items || []
  if (isManager && mineOnly) {
    const uid = user?._id
    leads = leads.filter(l => l.assigned_to === uid || l.created_by === uid)
  }
  if (sortBy === 'expected_value') {
    leads = [...leads].sort((a,b)=> (b.expected_value??0) - (a.expected_value??0))
  } else if (sortBy === 'next_followup_at') {
    leads = [...leads].sort((a,b)=> {
      const ax = a.next_followup_at ? new Date(a.next_followup_at).getTime() : Infinity
      const bx = b.next_followup_at ? new Date(b.next_followup_at).getTime() : Infinity
      return ax - bx
    })
  }
  const columns = useMemo(() => {
    const m = Object.fromEntries(STAGES.map(s => [s, []]))
    for (const l of leads) {
      const s = l.pipeline_stage || 'NEW'
      if (m[s]) m[s].push(l)
    }
    return m
  }, [leads])

  const patch = useMutation({
    mutationFn: ({ id, stage }) => LeadsAPI.patch(id, { pipeline_stage: stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban-leads'] })
  })

  const onDragStart = (e, lead) => {
    e.dataTransfer.setData('text/plain', lead._id)
  }
  const onDrop = (e, stage) => {
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    patch.mutate({ id, stage })
    setDragOver('')
  }
  const allowDrop = (e, stage) => { e.preventDefault(); setDragOver(stage) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Pipeline (Kanban)</div>
          <div className="text-sm text-slate-500">Drag cards between stages to update pipeline</div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <select className="text-sm" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
              <option value="">All Sales</option>
              {(salesUsers || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
              <option value="UNASSIGNED">UNASSIGNED</option>
            </select>
          )}
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm"><Filter size={14}/> Filter</button>
            <select className="text-sm rounded-lg border" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="updated_at">Sort: Updated</option>
              <option value="expected_value">Sort: Value</option>
              <option value="next_followup_at">Sort: Next Followup</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input className="w-72" placeholder="Search name/phone/company" value={q} onChange={e=>setQ(e.target.value)} />
        {isManager && (
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={mineOnly} onChange={e=>setMineOnly(e.target.checked)} />
            My leads only
          </label>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-7 gap-3">
          {STAGES.map(s => <div key={s} className="h-[60vh] rounded-2xl bg-white animate-pulse border" />)}
        </div>
      )}

      {leads.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
          <div className="text-sm text-slate-500">No leads available for your view. Create a lead or ask a manager to assign one.</div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-3">
        {STAGES.map(stage => (
          <div
            key={stage}
            className={`bg-white/60 backdrop-blur-xl dark:bg-slate-900/50 border rounded-2xl p-3 min-h-[60vh] ${dragOver===stage ? 'border-brand-600' : 'border-white/60 dark:border-slate-800'}`}
            onDragOver={(e)=>allowDrop(e, stage)}
            onDrop={(e) => onDrop(e, stage)}
          >
            <div className="font-medium mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stage==='WON'?'bg-emerald-500':stage==='LOST'?'bg-rose-500':'bg-accent-500'}`} />
                {stage}
              </span>
              <span className="text-xs text-slate-500">{columns[stage]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(columns[stage] || []).map(l => (
                <div
                  key={l._id}
                  draggable
                  onDragStart={(e) => onDragStart(e, l)}
                  className={`border border-white/60 dark:border-slate-700 rounded-xl p-3 bg-white/60 backdrop-blur-xl dark:bg-slate-800/50 shadow-soft hover:shadow-hover cursor-grab`}
                  title="Drag to move"
                >
                  <KanbanCard lead={l} salesUsers={salesUsers} isManager={isManager} meId={user?._id} />
                </div>
              ))}
              <button onClick={()=>setQuickStage(stage)} className="w-full py-2 rounded-lg border text-sm hover:bg-slate-50">+ Add Opportunity</button>
            </div>
          </div>
        ))}
      </div>
      <CreateLeadModal open={!!quickStage} onClose={()=>setQuickStage(null)} initial={{ pipeline_stage: quickStage || 'NEW' }} onCreated={()=>{ setQuickStage(null); qc.invalidateQueries({ queryKey: ['kanban-leads'] }) }} />
    </div>
  )
}

function KanbanCard({ lead, salesUsers, isManager, meId }) {
  const owner = isManager
    ? ((salesUsers || []).find(u => u.user_id === lead.assigned_to)?.username || (lead.assigned_to ? '—' : 'UNASSIGNED'))
    : (lead.assigned_to === meId ? 'Me' : (lead.created_by === meId ? 'Me' : '—'))
  const currency = '₹'
  const value = currency + ' ' + ((lead.expected_value ?? 0).toLocaleString())
  const nfa = lead.next_followup_at ? new Date(lead.next_followup_at) : null
  const days = nfa ? Math.ceil((nfa - new Date()) / 86400000) : null
  const chip = days == null ? { text: 'No date', cls: 'bg-slate-100 text-slate-600' }
    : days < 0 ? { text: `${Math.abs(days)} days overdue`, cls: 'bg-rose-100 text-rose-700' }
    : days <= 3 ? { text: `${days} days`, cls: 'bg-emerald-100 text-emerald-700' }
    : days <= 10 ? { text: `${days} days`, cls: 'bg-amber-100 text-amber-700' }
    : { text: `${days} days`, cls: 'bg-accent-100 text-accent-700' }

  return (
    <div className="space-y-1">
      <div className="font-medium">{lead.name}</div>
      <div className="text-xs text-slate-600 inline-flex items-center gap-1"><Building2 size={12} /> {lead.company || '-'}</div>
      <div className="text-xs text-slate-600 inline-flex items-center gap-1"><DollarSign size={12} /> {value}</div>
      <div className="text-xs text-slate-600 inline-flex items-center gap-1"><Calendar size={12} /> {nfa ? nfa.toLocaleDateString() : '-'}</div>
      <div className="text-xs text-slate-600 inline-flex items-center gap-1"><UserIcon size={12} /> {owner}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className={`px-2 py-0.5 rounded-full text-[10px] ${chip.cls}`}>{chip.text}</div>
        <div className="inline-flex items-center gap-1">
          <Badge value={lead.status} />
          <Badge value={lead.temperature} />
        </div>
      </div>
    </div>
  )
}
