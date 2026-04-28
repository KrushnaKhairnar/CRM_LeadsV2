import React, { useMemo, useState, useEffect, Fragment } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LeadsAPI, UsersAPI, ViewsAPI } from '../api/endpoints'
import { Link, useSearchParams } from 'react-router-dom'
import Badge from '../components/Badge'
import { useAuthStore } from '../auth/store'
import CreateLeadModal from './components/CreateLeadModal.jsx'
import { toast } from 'sonner'
import { Dialog, Transition } from '@headlessui/react'

export default function LeadsList() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isManager = user?.role === 'MANAGER'

  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState('')
  const [temperature, setTemperature] = useState('')
  const [pipeline_stage, setStage] = useState('')
  const [assigned_to, setAssignedTo] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortDir, setSortDir] = useState(-1)
  const [selected, setSelected] = useState(new Set())
  const [openBulkAssign, setOpenBulkAssign] = useState(false)
  const [openBulkStatus, setOpenBulkStatus] = useState(false)
  const [openBulkTemp, setOpenBulkTemp] = useState(false)
  const [openBulkStage, setOpenBulkStage] = useState(false)
  const [openSaveView, setOpenSaveView] = useState(false)
  const [openCsvImport, setOpenCsvImport] = useState(false)

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (q) next.set('q', q); else next.delete('q')
    next.set('page', String(page))
    setSearchParams(next, { replace: true })
  }, [q, page])

  const params = useMemo(() => ({
    page, page_size: 20, q: q || undefined,
    status: status || undefined,
    temperature: temperature || undefined,
    pipeline_stage: pipeline_stage || undefined,
    assigned_to: isManager ? (assigned_to || undefined) : undefined,
    sort_by: sortBy, sort_dir: sortDir
  }), [page, q, status, temperature, pipeline_stage, assigned_to, isManager, sortBy, sortDir])

  const { data, isLoading } = useQuery({ queryKey: ['leads', params], queryFn: () => LeadsAPI.list(params) })
  // const { data: salesUsers } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales(), enabled: isManager })
  const { data: salesUsers } = useQuery({ queryKey: ['my-team'], queryFn: () => UsersAPI.myTeam(), enabled: isManager })

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.page_size || 20)))

  // const exportCsv = () => {
  //   const url = LeadsAPI.exportCsvUrl(params)
  //   window.open(url, '_blank')
  // }


  const exportCsv = async () => {
    try {
      const res = await LeadsAPI.exportCsv(params);

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/csv" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = "leads.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export Error:", error.response || error);
      alert(error.response?.data?.detail || "Failed to export CSV");
    }
  };


  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAllPage = () => {
    const items = data?.items || []
    setSelected(prev => {
      const next = new Set(prev)
      items.forEach(i => next.add(i.lead_id))
      return next
    })
  }
  const clearSelected = () => setSelected(new Set())
  const selectedCount = selected.size

  return (
    <div className="space-y-4 animate-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Leads</div>
          <div className="text-sm text-slate-500">Search, filter, and manage lead pipeline</div>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <>
              <button onClick={() => setOpenCsvImport(true)} className="px-3 py-2 rounded-lg border border-brand-200 bg-white hover:bg-brand-50 text-sm text-brand-700">Import CSV</button>
              <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-brand-200 bg-white hover:bg-brand-50 text-sm text-brand-700">Export CSV</button>
            </>
          )}
          <button onClick={() => setOpenCreate(true)} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm shadow-soft hover:shadow-hover">+ New Lead</button>
          <button onClick={() => setOpenSaveView(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Save View</button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 shadow-soft">
        <div className="grid md:grid-cols-5 gap-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name / phone / company"
            className="md:col-span-2" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="text-sm">
            <option value="">All Status</option>
            <option value="OPEN">OPEN</option>
            <option value="WIP">WIP</option>
            <option value="CLOSED">CLOSED</option>
            <option value="LOST">LOST</option>
          </select>
          <select value={temperature} onChange={e => setTemperature(e.target.value)} className="text-sm">
            <option value="">All Temp</option>
            <option value="COLD">COLD</option>
            <option value="WARM">WARM</option>
            <option value="HOT">HOT</option>
          </select>
          <select value={pipeline_stage} onChange={e => setStage(e.target.value)} className="text-sm">
            <option value="">All Stages</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="DEMO">DEMO</option>
            <option value="PROPOSAL">PROPOSAL</option>
            <option value="NEGOTIATION">NEGOTIATION</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
          {isManager && (
            <select value={assigned_to} onChange={e => setAssignedTo(e.target.value)} className="text-sm md:col-span-2">
              <option value="">All Sales (Assigned To)</option>
              {(salesUsers || []).map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
              <option value="UNASSIGNED">UNASSIGNED</option>
            </select>
          )}
        </div>
      </div>

      {isManager && selectedCount > 0 && (
        <div className="bg-white border rounded-2xl p-4 shadow-soft flex items-center justify-between">
          <div className="text-sm">{selectedCount} selected</div>
          <div className="flex gap-2">
            <button onClick={() => setOpenBulkAssign(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Bulk Assign</button>
            <button onClick={() => setOpenBulkStatus(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Bulk Status</button>
            <button onClick={() => setOpenBulkTemp(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Bulk Temp</button>
            <button onClick={() => setOpenBulkStage(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Bulk Stage</button>
            <button onClick={clearSelected} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Clear</button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 sticky top-0 z-[1]">
              <tr>
                <th className="py-3 px-4">
                  <input type="checkbox" onChange={(e) => { e.target.checked ? selectAllPage() : clearSelected() }} />
                </th>
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => { setSortBy('name'); setSortDir(sortBy === 'name' ? -sortDir : 1) }}>
                  Lead {sortBy === 'name' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 cursor-pointer select-none" onClick={() => { setSortBy('status'); setSortDir(sortBy === 'status' ? -sortDir : 1) }}>
                  Status {sortBy === 'status' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 cursor-pointer select-none" onClick={() => { setSortBy('temperature'); setSortDir(sortBy === 'temperature' ? -sortDir : 1) }}>
                  Temp {sortBy === 'temperature' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 cursor-pointer select-none" onClick={() => { setSortBy('pipeline_stage'); setSortDir(sortBy === 'pipeline_stage' ? -sortDir : 1) }}>
                  Stage {sortBy === 'pipeline_stage' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 cursor-pointer select-none" onClick={() => { setSortBy('next_followup_at'); setSortDir(sortBy === 'next_followup_at' ? -sortDir : 1) }}>
                  Next Followup {sortBy === 'next_followup_at' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 cursor-pointer select-none" onClick={() => { setSortBy('assigned_to'); setSortDir(sortBy === 'assigned_to' ? -sortDir : 1) }}>
                  Assigned To {sortBy === 'assigned_to' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4 text-right cursor-pointer select-none" onClick={() => { setSortBy('expected_value'); setSortDir(sortBy === 'expected_value' ? -sortDir : 1) }}>
                  Value {sortBy === 'expected_value' ? (sortDir === 1 ? '▲' : '▼') : ''}
                </th>
                <th className="px-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="p-4" colSpan="8">Loading…</td></tr>}
              {(data?.items || []).map(l => (
                <tr key={l.lead_id} className="border-t odd:bg-white even:bg-slate-50/60 hover:bg-brand-50/50 transition">
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.has(l.lead_id)} onChange={() => toggle(l.lead_id)} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 tracking-tight">{l.name}</div>
                    <div className="text-xs text-slate-500">{l.company || '-'} • {l.phone || '-'} </div>
                    {l.is_overdue && <div className="text-xs text-rose-700 mt-1">Overdue</div>}
                  </td>
                  <td className="px-4"><Badge value={l.status} /></td>
                  <td className="px-4"><Badge value={l.temperature} /></td>
                  <td className="px-4">{l.pipeline_stage ? <Badge value={l.pipeline_stage} /> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4">{l.next_followup_at ? new Date(l.next_followup_at).toLocaleString('en-GB') : '-'}</td>
                  <td className="px-4">{(salesUsers || []).find(u => u.user_id === l.assigned_to)?.username || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 text-right">{(l.expected_value ?? 0).toLocaleString('en-GB')}</td>
                  <td className="px-4 text-right">
                    <Link className="text-brand-700  underline decoration-brand-400 underline-offset-4" to={`/leads/${l.lead_id}`}>View more</Link>
                  </td>
                </tr>
              ))}
              {(!isLoading && (data?.items || []).length === 0) && <tr><td className="p-4" colSpan="8">No leads found.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-white">
          <div className="text-xs text-slate-500">Page {page} of {totalPages} • Total {data?.total || 0}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-slate-50">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      <CreateLeadModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={() => { toast.success('Lead created'); qc.invalidateQueries({ queryKey: ['leads'] }) }} />

      <BulkAssignModal
        open={openBulkAssign}
        onClose={() => setOpenBulkAssign(false)}
        users={salesUsers || []}
        onConfirm={async (assigned_to) => {
          try {
            await LeadsAPI.bulkAssign({ lead_ids: Array.from(selected), assigned_to })
            toast.success('Bulk assign complete')
            setOpenBulkAssign(false)
            clearSelected()
            qc.invalidateQueries({ queryKey: ['leads'] })
          } catch {
            toast.error('Bulk assign failed')
          }
        }}
      />
      <BulkStatusModal
        open={openBulkStatus}
        onClose={() => setOpenBulkStatus(false)}
        onConfirm={async (status) => {
          try {
            await LeadsAPI.bulkStatus({ lead_ids: Array.from(selected), status })
            toast.success('Bulk status update complete')
            setOpenBulkStatus(false)
            clearSelected()
            qc.invalidateQueries({ queryKey: ['leads'] })
          } catch {
            toast.error('Bulk status update failed')
          }
        }}
      />
      <BulkTempModal
        open={openBulkTemp}
        onClose={() => setOpenBulkTemp(false)}
        onConfirm={async (temperature) => {
          try {
            await LeadsAPI.bulkTemperature({ lead_ids: Array.from(selected), temperature })
            toast.success('Bulk temperature update complete')
            setOpenBulkTemp(false)
            clearSelected()
            qc.invalidateQueries({ queryKey: ['leads'] })
          } catch {
            toast.error('Bulk temperature update failed')
          }
        }}
      />
      <BulkStageModal
        open={openBulkStage}
        onClose={() => setOpenBulkStage(false)}
        onConfirm={async (stage) => {
          try {
            await LeadsAPI.bulkStage({ lead_ids: Array.from(selected), pipeline_stage: stage })
            toast.success('Bulk stage update complete')
            setOpenBulkStage(false)
            clearSelected()
            qc.invalidateQueries({ queryKey: ['leads'] })
          } catch {
            toast.error('Bulk stage update failed')
          }
        }}
      />
      <SaveViewModal
        open={openSaveView}
        onClose={() => setOpenSaveView(false)}
        onConfirm={async (name) => {
          try {
            const toSave = { status: status || undefined, temperature: temperature || undefined, pipeline_stage: pipeline_stage || undefined, q: q || undefined, assigned_to: isManager ? (assigned_to || undefined) : undefined }
            await ViewsAPI.create({ name, params: toSave })
            toast.success('View saved')
            setOpenSaveView(false)
          } catch {
            toast.error('Save view failed')
          }
        }}
      />

      <BulkCsvImportModal
        open={openCsvImport}
        onClose={() => setOpenCsvImport(false)}
        onConfirm={async (file) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await LeadsAPI.bulkCsvUpload(formData);
            toast.success(`${result.created_count} leads imported successfully`);
            setOpenCsvImport(false);
            qc.invalidateQueries({ queryKey: ['leads'] });
          } catch (e) {
            toast.error(e.response?.data?.detail || 'CSV import failed');
          }
        }}
      />
    </div>
  )
}

function BulkAssignModal({ open, onClose, users, onConfirm }) {
  const [assigned, setAssigned] = useState('')
  const confirm = () => onConfirm(assigned || null)
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Bulk Assign</Dialog.Title>
              <div className="mt-3 text-sm">Assign selected leads to a sales user. Choose empty to unassign.</div>
              <div className="mt-3">
                <select className="w-full" value={assigned} onChange={e => setAssigned(e.target.value)}>
                  <option value="">UNASSIGNED</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.username}</option>)}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">Confirm</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function BulkStatusModal({ open, onClose, onConfirm }) {
  const [status, setStatus] = useState('OPEN')
  const confirm = () => onConfirm(status)
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Bulk Status Update</Dialog.Title>
              <div className="mt-3">
                <select className="w-full" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="OPEN">OPEN</option>
                  <option value="WIP">WIP</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>
              <div className="mt-4 text-xs text-slate-500">This will update status for all selected leads.</div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">Confirm</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function BulkTempModal({ open, onClose, onConfirm }) {
  const [temperature, setTemperature] = useState('COLD')
  const confirm = () => onConfirm(temperature)
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Bulk Temperature Update</Dialog.Title>
              <div className="mt-3">
                <select className="w-full" value={temperature} onChange={e => setTemperature(e.target.value)}>
                  <option value="COLD">COLD</option>
                  <option value="WARM">WARM</option>
                  <option value="HOT">HOT</option>
                </select>
              </div>
              <div className="mt-4 text-xs text-slate-500">This will update temperature for all selected leads.</div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">Confirm</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function BulkStageModal({ open, onClose, onConfirm }) {
  const [stage, setStage] = useState('NEW')
  const confirm = () => onConfirm(stage)
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Bulk Stage Update</Dialog.Title>
              <div className="mt-3">
                <select className="w-full" value={stage} onChange={e => setStage(e.target.value)}>
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="DEMO">DEMO</option>
                  <option value="PROPOSAL">PROPOSAL</option>
                  <option value="NEGOTIATION">NEGOTIATION</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>
              <div className="mt-4 text-xs text-slate-500">This will update pipeline stage for all selected leads.</div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">Confirm</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function BulkCsvImportModal({ open, onClose, onConfirm }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const confirm = () => {
    if (file) {
      onConfirm(file);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Bulk CSV Import</Dialog.Title>
              <div className="mt-3 text-sm">Upload a CSV file to bulk create leads.</div>
              <div className="mt-3">
                <input type="file" accept=".csv" onChange={handleFileChange} className="w-full" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} disabled={!file} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm disabled:opacity-50">Import</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}

function SaveViewModal({ open, onClose, onConfirm }) {
  const [name, setName] = useState('')
  const confirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim())
  }
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-5">
              <Dialog.Title className="text-lg font-semibold">Save Current Filters</Dialog.Title>
              <div className="mt-3">
                <input className="w-full" placeholder="View name (e.g., My Overdue)" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Cancel</button>
                <button onClick={confirm} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">Save</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}