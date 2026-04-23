import React from 'react'
import clsx from 'clsx'

const map = {
  OPEN: 'bg-blue-100 text-blue-700',
  WIP: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
  LOST: 'bg-rose-100 text-rose-700',
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
  return <span className={clsx('px-2 py-1 rounded-full text-xs font-medium shadow-soft ring-1 ring-inset ring-black/5', cls)}>{label}</span>
}
