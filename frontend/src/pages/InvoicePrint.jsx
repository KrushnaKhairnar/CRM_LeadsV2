import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { InvoicesAPI } from '../api/endpoints'

export default function InvoicePrint() {
  const { id } = useParams()
  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: () => InvoicesAPI.get(id) })
  if (isLoading) return <div>Loading…</div>
  const subtotal = inv.subtotal.toLocaleString()
  const tax = inv.tax.toLocaleString()
  const total = inv.total.toLocaleString()
  return (
    <div className="min-h-screen p-8 bg-white text-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold tracking-tight">Digikore Studio Limited</div>
            <div className="text-xs text-slate-500 mt-1">Proforma Invoice</div>
          </div>
          <div className="text-right">
            <div className="text-sm">Invoice #{inv.invoice_no}</div>
            <div className="text-xs text-slate-500">Issue: {new Date(inv.issue_date).toLocaleDateString()}</div>
            {inv.due_date && <div className="text-xs text-slate-500">Due: {new Date(inv.due_date).toLocaleDateString()}</div>}
            <button onClick={()=>window.print()} className="mt-2 px-3 py-2 rounded-lg border text-sm">Print / Save PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gradient-to-br from-brand-50 to-white border rounded-2xl p-4">
            <div className="text-xs text-slate-500">Bill To</div>
            <div className="font-medium mt-1">{inv.client_name}</div>
            {inv.client_company && <div className="text-sm">{inv.client_company}</div>}
            {inv.client_address && <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{inv.client_address}</div>}
          </div>
          <div className="border rounded-2xl p-4">
            <div className="text-xs text-slate-500">From</div>
            <div className="font-medium mt-1">Digikore Studio Limited</div>
            <div className="text-xs text-slate-500 mt-1">digikore.com</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="py-3 px-4">Product</th>
                <th className="px-4">Qty</th>
                <th className="px-4">Unit Price</th>
                <th className="px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-3 px-4">{it.product}</td>
                  <td className="px-4">{it.quantity}</td>
                  <td className="px-4">{inv.currency} {Number(it.unit_price).toLocaleString()}</td>
                  <td className="px-4 text-right">{inv.currency} {(Number(it.quantity)*Number(it.unit_price)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-start justify-between">
          <div className="text-xs text-slate-500 whitespace-pre-wrap">{inv.notes}</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-8"><span>Subtotal</span><span>{inv.currency} {subtotal}</span></div>
            <div className="flex justify-between gap-8"><span>Tax (18%)</span><span>{inv.currency} {tax}</span></div>
            <div className="flex justify-between gap-8 font-medium text-lg"><span>Total</span><span>{inv.currency} {total}</span></div>
          </div>
        </div>

        <div className="mt-10 text-xs text-slate-500">This is a system-generated proforma invoice.</div>
      </div>
    </div>
  )
}
