import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersAPI } from '../api/endpoints'
import { toast } from 'sonner'

export default function Profile() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['me-profile'], queryFn: () => UsersAPI.me() })
  const [form, setForm] = React.useState({ full_name: '', email: '', phone: '' })

  React.useEffect(() => {
    if (data) setForm({ full_name: data.full_name || '', email: data.email || '', phone: data.phone || '' })
  }, [data])

  const save = useMutation({
    mutationFn: (payload) => UsersAPI.updateMe(payload),
    onSuccess: () => { toast.success('Profile updated'); qc.invalidateQueries({ queryKey: ['me-profile'] }) },
    onError: () => toast.error('Update failed')
  })

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold tracking-tight">My Profile</div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-gradient-to-br from-brand-50 to-white border rounded-2xl p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-lg font-semibold uppercase">
              {(data.full_name || data.username || 'U').slice(0, 1)}
            </div>
            <div>
              <div className="font-medium">{data.full_name || data.username}</div>
              <div className="text-xs text-slate-500">{data.role}</div>
            </div>
          </div>
          <div className="mt-4 text-sm space-y-1">
            <div className="flex justify-between"><span>Username</span><span className="font-medium">{data.username}</span></div>
            {data.email && <div className="flex justify-between"><span>Email</span><span className="font-medium">{data.email}</span></div>}
            {data.phone && <div className="flex justify-between"><span>Phone</span><span className="font-medium">{data.phone}</span></div>}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5">
          <div className="font-medium mb-3">Update Details</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Full Name</div>
              <input className="mt-1 w-full" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <div className="text-sm font-medium">Email</div>
              <input type="email" className="mt-1 w-full" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <div className="text-sm font-medium">Phone</div>
              <input className="mt-1 w-full" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => save.mutate(form)} className="px-3 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">Update</button>
          </div>
        </div>
      </div>
    </div>
  )
}
