import React, { useMemo, useState, Fragment, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LeadsAPI, UsersAPI } from '../api/endpoints'
import Badge from '../components/Badge'
import { useAuthStore } from '../auth/store'
import { toast } from 'sonner'
import { Dialog, Transition } from '@headlessui/react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'


export default function LeadDetails() {
  const { id } = useParams()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isManager = user?.role === 'MANAGER'

  const { data: lead, isLoading } = useQuery({ queryKey: ['lead', id], queryFn: () => LeadsAPI.get(id) })
  const { data: products } = useQuery({ queryKey: ['products', id], queryFn: () => LeadsAPI.listProducts(id), enabled: !!id })
  const { data: followups } = useQuery({ queryKey: ['followups', id], queryFn: () => LeadsAPI.followups(id), enabled: !!id })
  const { data: audit } = useQuery({ queryKey: ['audit', id], queryFn: () => LeadsAPI.audit(id), enabled: !!id })
  const actorIds = useMemo(() => {
    const s = new Set()
    if (lead?.assigned_to) s.add(lead.assigned_to)
    if (lead?.assigned_by) s.add(lead.assigned_by)
    if (lead?.created_by) s.add(lead.created_by)
      ; (audit || []).forEach(a => { if (a.actor_id) s.add(a.actor_id) })
    return Array.from(s)
  }, [lead, audit])
  const { data: actors } = useQuery({ queryKey: ['users-lookup', actorIds.join(',')], queryFn: () => actorIds.length ? UsersAPI.lookup(actorIds) : Promise.resolve([]), enabled: actorIds.length > 0 })
  const nameOf = (id) => (actors || []).find(u => u.user_id === id)?.username || (id ? id.slice(-6) : '—')
  const { data: salesUsers } = useQuery({ queryKey: ['my-team'], queryFn: () => UsersAPI.myTeam(), enabled: isManager })
  // const { data: salesUsers } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales(), enabled: isManager })


  const [openFU, setOpenFU] = useState(null)
  const [openProduct, setOpenProduct] = useState(false)
  const [editingProductStatus, setEditingProductStatus] = useState(null)

  const patchMutation = useMutation({
    mutationFn: (payload) => LeadsAPI.patch(id, payload),
    onSuccess: (data, variables) => {
      qc.setQueryData(['lead', id], data)
      qc.invalidateQueries({ queryKey: ['leads'] })
      if (variables.products !== undefined) {
        qc.setQueryData(['products', id], data.products || variables.products)
        qc.invalidateQueries({ queryKey: ['products', id] })
      }
      toast.success('Updated')
    },
    onError: (e) => toast.error('Update failed', { description: e?.response?.data?.detail || 'Error' })
  })

  const assignMutation = useMutation({
    mutationFn: (payload) => LeadsAPI.assign(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lead', id] }); qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Assigned') },
    onError: (e) => toast.error('Assign failed', { description: e?.response?.data?.detail || 'Error' })
  })

  const addFollowup = useMutation({
    mutationFn: (payload) => LeadsAPI.addFollowup(id, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['followups', id] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Followup added')
      setOpenFU(false)
    },
    onError: (e) => toast.error('Followup failed', { description: e?.response?.data?.detail || 'Error' })
  })

  const addProductMutation = useMutation({
    mutationFn: (payload) => LeadsAPI.addProduct(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
      toast.success('Product added')
      setOpenProduct(false)
    },
    onError: (e) => toast.error('Add product failed', { description: e?.response?.data?.detail || 'Error' })
  })

  const updateProductStatus = (productId, newStatus) => {
    const currentProducts = products || lead.products || []
    const updatedProducts = currentProducts.map(p =>
      p.id === productId ? { ...p, status: newStatus } : p
    )
    patchMutation.mutate({ products: updatedProducts })
    setEditingProductStatus(null)
  }

  const deleteProductMutation = useMutation({
    mutationFn: (productId) => LeadsAPI.deleteProduct(id, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Product deleted')
    },
    onError: (e) => toast.error('Delete failed', { description: e?.response?.data?.detail || 'Error' })
  })

  const deleteProduct = (productId) => {
    deleteProductMutation.mutate(productId)
  }

  const fuSeries = useMemo(() => {
    const arr = (followups || []).map(f => ({ date: new Date(f.done_at).toLocaleDateString(), count: 1 }))
    const by = {}
    for (const a of arr) by[a.date] = (by[a.date] || 0) + 1
    return Object.keys(by).map(k => ({ date: k, count: by[k] }))
  }, [followups])

  if (isLoading) return <div>Loading…</div>
  if (!lead) return <div>Not found</div>


  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{lead.name}</div>
          <div className="text-sm text-slate-500 mt-1">{lead.company || '-'} • {lead.phone || '-'} • {lead.email || '-'}</div>
          {lead.is_overdue && <div className="inline-flex mt-2 px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">Overdue Followup</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpenFU(true)} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm shadow-soft hover:shadow-hover">+ Add Followup</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Lead Info">
          <div className="space-y-2 text-sm">
            <Row label="Status"><Badge value={lead.status} /></Row>
            <Row label="Temperature"><Badge value={lead.temperature} /></Row>
            <Row label="Stage">{lead.pipeline_stage ? <Badge value={lead.pipeline_stage} /> : <span className="text-slate-400">—</span>}</Row>
            <Row label="Expected Value"><span className="font-medium">{(lead.expected_value ?? 0).toLocaleString()}</span></Row>
            <Row label="Source"><span>{lead.source || '-'}</span></Row>
            <Row label="Next Followup"><span>{lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleString() : '-'}</span></Row>
            <Row label="Project"><span>{lead.project_name || '-'}</span></Row>
            <Row label="Assigned To"><span>{lead.assigned_to ? nameOf(lead.assigned_to) : 'UNASSIGNED'}</span></Row>
            <Row label="Assigned By"><span>{lead.assigned_by ? nameOf(lead.assigned_by) : '-'}</span></Row>
            <Row label="Assigned At"><span>{lead.assigned_at ? new Date(lead.assigned_at).toLocaleString() : '-'}</span></Row>
            <div>
              <div className="text-xs text-slate-500 mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {(lead.tags || []).map((t, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-50 text-brand-700 border border-brand-100">
                    {t}
                    <button
                      className="text-slate-400 hover:text-rose-600"
                      onClick={() => {
                        const next = (lead.tags || []).filter((x) => x !== t)
                        patchMutation.mutate({ tags: next })
                      }}
                    >×</button>
                  </span>
                ))}
                <TagAdder onAdd={(newTag) => {
                  const next = Array.from(new Set([...(lead.tags || []), newTag])).slice(0, 10)
                  patchMutation.mutate({ tags: next })
                }} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Update Fields">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Status">
              <select className="border rounded-lg px-3 py-2 w-full" value={lead.status}
                onChange={e => patchMutation.mutate({ status: e.target.value })}>
                <option value="OPEN">OPEN</option>
                <option value="WIP">WIP</option>
                <option value="CLOSED">CLOSED</option>
                <option value="LOST">LOST</option>
              </select>
            </Field>
            <Field label="Temperature">
              <select className="border rounded-lg px-3 py-2 w-full" value={lead.temperature}
                onChange={e => patchMutation.mutate({ temperature: e.target.value })}>
                <option value="COLD">COLD</option>
                <option value="WARM">WARM</option>
                <option value="HOT">HOT</option>
              </select>
            </Field>
            <Field label="Stage">
              <select className="border rounded-lg px-3 py-2 w-full" value={lead.pipeline_stage || ''}
                onChange={e => patchMutation.mutate({ pipeline_stage: e.target.value || null })}>
                <option value="">—</option>
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="DEMO">DEMO</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </Field>
            <Field label="Next Followup">
              <input type="datetime-local" className="border rounded-lg px-3 py-2 w-full"
                defaultValue={lead.next_followup_at ? new Date(lead.next_followup_at).toISOString().slice(0, 16) : ''}
                onBlur={(e) => {
                  const v = e.target.value
                  patchMutation.mutate({ next_followup_at: v ? new Date(v).toISOString() : null })
                }} />
            </Field>
            {isManager && (
              <div className="col-span-2">
                <Field label="Assign to">
                  <select className="border rounded-lg px-3 py-2 w-full" value={lead.assigned_to || ''}
                    onChange={e => assignMutation.mutate({ assigned_to: e.target.value || null })}>
                    <option value="">UNASSIGNED</option>
                    {(salesUsers || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
                  </select>
                </Field>
                {lead.assigned_to && (
                  <div className="mt-2">
                    <button onClick={() => assignMutation.mutate({ assigned_to: null })} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Unassign</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {!isManager && <div className="text-xs text-slate-500 mt-3">Sales cannot change assignment fields.</div>}
        </Panel>

        <Panel title="Purpose / Notes">
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{lead.purpose || '—'}</div>
          <Notes lead={lead} onAdd={async (text) => { try { await LeadsAPI.addNote(id, { text }); toast.success('Note added'); qc.invalidateQueries({ queryKey: ['lead', id] }) } catch { toast.error('Add note failed') } }} nameOf={nameOf} />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Next Actions & Probability">
          <NextActions lead={lead} onChange={(next) => patchMutation.mutate({ next_actions: next })} onProb={(p) => patchMutation.mutate({ win_probability: p })} />
        </Panel>
        <Panel title="Followup Activity">
          <div className="h-56 rounded-2xl overflow-hidden">
            <ResponsiveContainer>
              <AreaChart data={fuSeries} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="gFu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fill="url(#gFu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={`Followups (${(followups || []).length})`}>
          <div className="space-y-3">
            {(followups || []).map(f => (
              <div key={f._id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{new Date(f.done_at).toLocaleString()}</div>
                  {f.outcome && <div className="text-xs text-slate-500">{f.outcome}</div>}
                </div>
                <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{f.note}</div>
                {f.next_followup_at && <div className="text-xs text-slate-500 mt-2">Next: {new Date(f.next_followup_at).toLocaleString()}</div>}
              </div>
            ))}
            {(followups || []).length === 0 && <div className="text-sm text-slate-500">No followups yet.</div>}
          </div>
        </Panel>



        <Panel title="Audit Log">
          <div className="space-y-5">
            {(audit || []).map((a) => (
              <div
                key={a._id}
                className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-[1px] transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />

                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {a.action}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        by{" "}
                        <span className="font-medium text-slate-700">
                          {nameOf(a.actor_id)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                    {new Date().toLocaleDateString()}{" "}
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Diff */}
                <AuditDiff before={a.before || {}} after={a.after || {}} />
              </div>
            ))}

            {(audit || []).length === 0 && (
              <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <div className="text-sm font-medium text-slate-600">
                  No audit activity
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Changes will appear here
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <FollowupModal open={!!openFU} onClose={() => setOpenFU(null)} onSubmit={(payload) => addFollowup.mutate(payload)} products={products || []} leadId={id} qc={qc} productId={openFU?.productId} />
      <ProductModal open={openProduct} onClose={() => setOpenProduct(false)} onSubmit={(payload) => addProductMutation.mutate(payload)} />
    </div>
  )
}

function NextActions({ lead, onChange, onProb }) {
  const [input, setInput] = useState('')
  const [prob, setProb] = useState(lead.win_probability ?? 0)

  useEffect(() => {
    setProb(lead.win_probability ?? 0)
  }, [lead.win_probability])

  const add = () => {
    const t = input.trim()
    if (!t) return
    const next = [...(lead.next_actions || []), { label: t, done: false }]
    onChange(next)
    setInput('')
  }
  const toggle = (idx) => {
    const arr = (lead.next_actions || []).map((a, i) => i === idx ? { ...a, done: !a.done } : a)
    onChange(arr)
  }
  const remove = (idx) => {
    const arr = (lead.next_actions || []).filter((_, i) => i !== idx)
    onChange(arr)
  }

  const handleProbChange = (value) => {
    setProb(value)
    onProb(value)
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2">
        <input className="flex-1" placeholder="Add next action…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button onClick={add} className="px-3 py-2 rounded-lg border text-sm">Add</button>
      </div>
      <div className="space-y-2">
        {(lead.next_actions || []).map((a, idx) => (
          <div key={idx} className="flex items-center justify-between border rounded-xl p-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!a.done} onChange={() => toggle(idx)} />
              <span className={a.done ? 'line-through text-slate-500' : ''}>{a.label}</span>
            </label>
            <button onClick={() => remove(idx)} className="px-2 py-1 rounded-lg border text-xs">Remove</button>
          </div>
        ))}
        {(lead.next_actions || []).length === 0 && <div className="text-slate-500">No actions yet.</div>}
      </div>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 font-medium">
            Win Probability
          </span>
          <span className="text-sm font-semibold text-emerald-600">
            {prob}%
          </span>
        </div>

        {/* Slider with background fill */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={100}
            value={prob ?? 0}
            onChange={(e) => handleProbChange(Number(e.target.value))}
            aria-label="Win Probability"
            className="relative w-full h-2 rounded-lg appearance-none cursor-pointer 
                 bg-slate-200 accent-emerald-500"
            style={{
              background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${prob}%, rgb(226 232 240) ${prob}%, rgb(226 232 240) 100%)`
            }}
          />
        </div>
      </div>
    </div>
  )
}

function Notes({ lead, onAdd, nameOf }) {
  const [txt, setTxt] = useState('')
  const add = () => {
    const t = txt.trim()
    if (!t) return
    onAdd(t)
    setTxt('')
  }
  const notes = lead.notes || []
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input className="flex-1" placeholder="Add note…" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button className="px-3 py-2 rounded-lg border text-sm" onClick={add}>Add note</button>
      </div>
      <div className="mt-3 space-y-2">
        {notes.map((n, i) => (
          <div key={i} className="border rounded-xl p-3">
            <div className="text-xs text-slate-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ''} • {nameOf(n.author_id)}</div>
            <div className="text-sm mt-1 whitespace-pre-wrap">{n.text}</div>
          </div>
        ))}
        {notes.length === 0 && <div className="text-sm text-slate-500">No notes yet.</div>}
      </div>
    </div>
  )
}

function AuditDiff({ before, after }) {
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  );

  const rows = keys
    .map((k) => {
      const b = before?.[k];
      const a = after?.[k];
      if (JSON.stringify(b) === JSON.stringify(a)) return null;
      return { k, b, a };
    })
    .filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 p-4"
        >
          {/* Field */}
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            {r.k}
          </div>

          {/* Values */}
          <div className="space-y-2">
            {r.k === "products" ? (
              <ProductStatusDiff before={r.b} after={r.a} />
            ) : (
              <>
                {/* <DiffBox label="From" value={r.b} type="before" /> */}
                <DiffBox label=" " value={r.a} type="after" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffBox({ label, value, type }) {
  const isBefore = type === "before";

  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-slate-400 w-10 mt-1 shrink-0">
        {label}
      </span>

      <div
        className={`flex-1 px-3 py-2 rounded-lg border text-xs leading-relaxed ${isBefore
          ? "bg-red-50 border-red-100 text-red-700"
          : "bg-emerald-50 border-emerald-100 text-emerald-700"
          }`}
      >
        {renderDiffValue(value)}
      </div>
    </div>
  );
}
function ProductStatusDiff({ before, after }) {
  const beforeItems = Array.isArray(before) ? before : [];
  const afterItems = Array.isArray(after) ? after : [];

  const toMap = (items) =>
    Object.fromEntries(
      items.map((item) => [item.id || item._id || JSON.stringify(item), item])
    );

  const beforeById = toMap(beforeItems);
  const afterById = toMap(afterItems);

  const ids = Array.from(
    new Set([...Object.keys(beforeById), ...Object.keys(afterById)])
  );

  const changed = ids
    .map((id) => {
      const b = beforeById[id];
      const a = afterById[id];

      return {
        id,
        label: a?.name || b?.name || id,
        beforeStatus: b?.status ?? null,
        afterStatus: a?.status ?? null,
      };
    })
    .filter((item) => item.beforeStatus !== item.afterStatus);

  if (changed.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic">
        No product status changes
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {changed.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div className="text-sm font-medium text-slate-800">
            {item.label}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-red-600 font-medium">
              {item.beforeStatus ?? "—"}
            </span>

            <span className="text-slate-400">→</span>

            <span className="text-emerald-600 font-medium">
              {item.afterStatus ?? "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderDiffValue(v) {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) {
    if (v.length === 0) return '(empty)'
    if (v.every(item => typeof item === 'object' && item !== null)) {
      return `${v.length} item${v.length !== 1 ? 's' : ''}`
    }
    return v.join(', ')
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v)
    return (
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key}>
            <span className="font-medium">{key}</span>: {fmt(value)}
          </div>
        ))}
      </div>
    )
  }
  return fmt(v)
}

function fmt(v) {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) {
    if (v.length === 0) return '(empty)'
    return v.join(', ')
  }
  if (typeof v === 'object') {
    const str = JSON.stringify(v)
    if (str.length > 80) {
      return str.substring(0, 77) + '...'
    }
    return str
  }
  const str = String(v)
  if (str.length > 100) {
    return str.substring(0, 97) + '...'
  }
  return str
}
function Panel({ title, children }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft transition hover:shadow-hover">
      <div className="font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function TagAdder({ onAdd }) {
  const [val, setVal] = useState('')
  const add = () => {
    const v = val.trim()
    if (!v) return
    onAdd(v)
    setVal('')
  }
  return (
    <div className="inline-flex items-center gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        placeholder="Add tag"
        className="h-7"
      />
      <button onClick={add} className="px-2 py-1 rounded bg-brand-600 text-white text-xs hover:bg-brand-700">Add</button>
    </div>
  )
}

function FollowupModal({ open, onClose, onSubmit, products, leadId, qc, productId }) {
  const [doneAt, setDoneAt] = useState(new Date().toISOString().slice(0, 16))
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState('interested')
  const [nextAt, setNextAt] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(productId || '')

  useEffect(() => {
    setSelectedProductId(productId || '')
  }, [productId])

  const submit = () => {
    if (!note.trim()) return toast.error('Note is required')
    const payload = {
      done_at: new Date(doneAt).toISOString(),
      note,
      outcome,
      point_of_contact_name: null,
      point_of_contact_phone: null,
      point_of_contact_email: null,
      next_followup_at: nextAt ? new Date(nextAt).toISOString() : null,
    }
    if (selectedProductId) {
      payload.product_id = selectedProductId
      // Use addProductFollowup
      LeadsAPI.addProductFollowup(leadId, selectedProductId, payload).then(() => {
        toast.success('Product followup added')
        onClose()
        qc.invalidateQueries({ queryKey: ['followups', leadId] })
        qc.invalidateQueries({ queryKey: ['lead', leadId] })
        qc.invalidateQueries({ queryKey: ['leads'] })
      }).catch(e => toast.error('Followup failed', { description: e?.response?.data?.detail || 'Error' }))
    } else {
      onSubmit(payload)
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Dialog.Panel className="w-full max-w-xl bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Add Followup</Dialog.Title>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">Done At</div>
                  <input type="datetime-local" className="mt-1 w-full" value={doneAt} onChange={e => setDoneAt(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Outcome</div>
                  <select className="mt-1 w-full" value={outcome} onChange={e => setOutcome(e.target.value)}>
                    <option value="no answer">no answer</option>
                    <option value="meeting booked">meeting booked</option>
                    <option value="interested">interested</option>
                    <option value="not interested">not interested</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Product (optional)</div>
                  <select className="mt-1 w-full" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                    <option value="">General Followup</option>
                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Note</div>
                  <textarea className="mt-1 w-full" rows="4" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Next Followup At (optional)</div>
                  <input type="datetime-local" className="mt-1 w-full" value={nextAt} onChange={e => setNextAt(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={submit} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm shadow-soft hover:shadow-hover">Add</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function ProductModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('Active')

  const submit = () => {
    if (!name.trim()) return toast.error('Name is required')
    if (!price || isNaN(price)) return toast.error('Valid price is required')
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      plan: plan.trim() || null,
      status,
    })
    setName('')
    setDescription('')
    setPrice('')
    setPlan('')
    setStatus('Active')
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Dialog.Panel className="w-full max-w-xl bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Add Product</Dialog.Title>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Name</div>
                  <input type="text" className="mt-1 w-full" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Description</div>
                  <textarea className="mt-1 w-full" rows="3" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Price</div>
                  <input type="number" step="0.01" className="mt-1 w-full" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Plan</div>
                  <input type="text" className="mt-1 w-full" value={plan} onChange={e => setPlan(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <select className="mt-1 w-full" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Not Active">Not Active</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={submit} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm shadow-soft hover:shadow-hover">Add</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
