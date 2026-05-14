import React from 'react'
import clsx from 'clsx'

const map = {
  OPEN: 'bg-blue-50 text-blue-700 ring-blue-100',
  WIP: 'bg-amber-50 text-amber-700 ring-amber-100',
  CLOSED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  LOST: 'bg-rose-50 text-rose-700 ring-rose-100',
  COLD: 'bg-slate-100 text-slate-700',
  WARM: 'bg-orange-100 text-orange-700',
  HOT: 'bg-red-100 text-red-700',
  NEW: 'bg-slate-100 text-slate-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  DEMO: 'bg-violet-100 text-violet-700',
  PROPOSAL: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-fuchsia-100 text-fuchsia-700',
  WON: 'bg-emerald-100 text-emerald-700',
  LOST_STAGE: 'bg-rose-100 text-rose-700',
  Active: 'bg-emerald-100 text-emerald-700',
  'Not Active': 'bg-rose-100 text-rose-700',
}

export default function Badge({ value }) {
  const cls = map[value] || 'bg-slate-100 text-slate-700'
  const label = value === 'LOST' ? 'LOST' : 
                value === 'Active' ? 'Active' : 
                value === 'Not Active' ? 'Not Active' : 
                value
  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset', cls)}>{label}</span>
}
