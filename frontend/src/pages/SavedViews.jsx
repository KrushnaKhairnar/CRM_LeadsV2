import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ViewsAPI } from '../api/endpoints'
import { useNavigate } from 'react-router-dom'

export default function SavedViews() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data } = useQuery({ queryKey: ['views'], queryFn: () => ViewsAPI.list() })
  const items = data || []

  const apply = (v) => {
    const params = new URLSearchParams()
    Object.entries(v.params || {}).forEach(([k, val]) => {
      if (val != null && val !== '') params.set(k, String(val))
    })
    nav(`/leads?${params.toString()}`)
  }
  const remove = async (id) => {
    await ViewsAPI.delete(id)
    qc.invalidateQueries({ queryKey: ['views'] })
  }

  const quick = async (type) => {
    if (type === 'my-overdue') {
      await ViewsAPI.create({ name: 'My Overdue', params: { status: 'OPEN', q: '', pipeline_stage: '', temperature: '', /* next_followup_at<now handled by backend filters later if added */ } })
    } else if (type === 'hot-leads') {
      await ViewsAPI.create({ name: 'Hot Leads', params: { temperature: 'HOT' } })
    } else if (type === 'new-this-week') {
      await ViewsAPI.create({ name: 'New This Week', params: {} })
    }
    qc.invalidateQueries({ queryKey: ['views'] })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Saved Views</div>
        <div className="text-sm text-slate-500">Reuse common filters like “My Overdue”, “Hot Leads”, “New This Week”.</div>
      </div>
      {items.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-4">
          <div className="text-sm font-medium mb-2">Quick Create</div>
          <div className="flex gap-2">
            <button onClick={() => quick('my-overdue')} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Create “My Overdue”</button>
            <button onClick={() => quick('hot-leads')} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Create “Hot Leads”</button>
            <button onClick={() => quick('new-this-week')} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Create “New This Week”</button>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(v => (
          <div key={v._id} className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="font-medium">{v.name}</div>
              <div className="text-[10px] px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">View</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(v.params || {}).filter(([_,val])=>val != null && val !== '').map(([k, val]) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-50 text-brand-700 border border-brand-100">
                  {k}: {String(val || '')}
                </span>
              ))}
              {Object.keys(v.params || {}).length === 0 && <span className="text-xs text-slate-500">No filters</span>}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => apply(v)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Apply</button>
              <button onClick={() => remove(v._id)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft text-slate-500">No saved views yet.</div>
        )}
      </div>
    </div>
  )
}
