import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { InvoicesAPI } from '../api/endpoints'
import { toast } from 'sonner'

function calc(items) {
  const subtotal = items.reduce((a, i) => a + (Number(i.quantity || 1) * Number(i.unit_price || 0)), 0)
  const tax = +(subtotal * 0.18).toFixed(2)
  const total = +(subtotal + tax).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), tax, total }
}

export default function Invoices() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['invoices'], queryFn: () => InvoicesAPI.list({ page: 1, page_size: 20 }) })
  const items = data?.items || []
  const send = useMutation({ mutationFn: (id) => InvoicesAPI.patch(id, { status: 'SENT' }), onSuccess: () => { toast.success('Marked as SENT'); qc.invalidateQueries({ queryKey: ['invoices'] }) } })
  const paid = useMutation({ mutationFn: (id) => InvoicesAPI.patch(id, { status: 'PAID' }), onSuccess: () => { toast.success('Marked as PAID'); qc.invalidateQueries({ queryKey: ['invoices'] }) } })
  const [open, setOpen] = React.useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">Invoices</div>
        <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">+ New Proforma</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(inv => (
          <div key={inv._id} className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="font-medium">{inv.invoice_no}</div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'SENT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
            </div>
            <div className="mt-1 text-sm">{inv.client_name}{inv.client_company ? ` • ${inv.client_company}` : ''}</div>
            <div className="mt-1 text-xs text-slate-500">Total • {inv.currency} {inv.total.toLocaleString('en-GB')}</div>
            <div className="mt-3 flex justify-end gap-2">
              <a className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50" href={`/invoice/${inv._id}`} target="_blank" rel="noreferrer">Open</a>
              {inv.status !== 'SENT' && <button onClick={() => send.mutate(inv._id)} className="px-3 py-2 rounded-lg border text-sm">Send</button>}
              {inv.status !== 'PAID' && <button onClick={() => paid.mutate(inv._id)} className="px-3 py-2 rounded-lg border text-sm">Mark Paid</button>}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-soft text-slate-500">No invoices yet.</div>
        )}
      </div>
      {open && <CreateInvoice onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['invoices'] }); }} />}
    </div>
  )
}

function CreateInvoice({ onClose, onCreated }) {
  const [form, setForm] = React.useState({
    client_name: '',
    client_company: '',
    client_address: '',
    currency: 'INR',
    items: [{ product: '', quantity: 1, unit_price: 0 }],
    notes: '',
  })
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product: '', quantity: 1, unit_price: 0 }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, patch) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }))
  const totals = calc(form.items)

  const create = useMutation({
    mutationFn: () => InvoicesAPI.create(form),
    onSuccess: () => { toast.success('Invoice created'); onCreated() },
    onError: () => toast.error('Create failed'),
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">New Proforma Invoice</div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Close</button>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-xs text-slate-500">Client Name</div>
            <input className="mt-1 w-full" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Client Company</div>
            <input className="mt-1 w-full" value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Client Address</div>
            <textarea className="mt-1 w-full" rows="2" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} />
          </div>
        </div>

        <div className="mt-4">
          <div className="font-medium">Items</div>
          <div className="space-y-2 mt-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="col-span-6" placeholder="Product" value={it.product} onChange={e => updateItem(i, { product: e.target.value })} />
                <input type="number" className="col-span-2" value={it.quantity} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} />
                <input type="number" className="col-span-3" value={it.unit_price} onChange={e => updateItem(i, { unit_price: Number(e.target.value) })} />
                <button onClick={() => removeItem(i)} className="col-span-1 px-2 py-2 rounded-lg border text-sm">×</button>
              </div>
            ))}
            <button onClick={addItem} className="px-3 py-2 rounded-lg border text-sm">+ Add item</button>
          </div>
          <div className="mt-3 text-sm text-right space-y-1">
            <div>Subtotal: {form.currency} {totals.subtotal.toLocaleString('en-GB')}</div>
            <div>Tax (18%): {form.currency} {totals.tax.toLocaleString('en-GB')}</div>
            <div className="font-medium">Total: {form.currency} {totals.total.toLocaleString('en-GB')}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs text-slate-500">Notes</div>
          <textarea className="mt-1 w-full" rows="3" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, bank details, etc." />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => create.mutate()} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">Create</button>
        </div>
      </div>
    </div>
  )
}
