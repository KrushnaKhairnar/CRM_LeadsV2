import React, { Fragment, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthAPI } from '../../api/endpoints'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  confirmPassword: z.string().min(4),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function RegisterUserModal({ open, onClose, role, onCreated }) {
  const roleLabel = role === 'MANAGER' ? 'Manager' : 'Sales Person'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (open) reset({ username: '', password: '', confirmPassword: '' })
  }, [open, reset])

  const onSubmit = async (values) => {
    try {
      await AuthAPI.register({
        username: values.username,
        password: values.password,
        role,
      })
      toast.success(`${roleLabel} "${values.username}" registered successfully`)
      reset()
      onClose()
      onCreated?.()
    } catch (e) {
      const detail = e?.response?.data?.detail
      if (e?.response?.status === 409) {
        toast.error('Username already exists')
      } else if (e?.response?.status === 403) {
        toast.error('Permission denied', { description: detail || 'You cannot create this role' })
      } else {
        toast.error('Registration failed', { description: detail || 'Unknown error' })
      }
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child as={Fragment}
          enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="transition ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment}
            enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft">
                  <UserPlus size={20} />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-semibold tracking-tight">
                    Register {roleLabel}
                  </Dialog.Title>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a new {roleLabel.toLowerCase()} account
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input
                    className="mt-1 w-full"
                    placeholder={`e.g. ${role === 'MANAGER' ? 'manager_john' : 'sales_alice'}`}
                    {...register('username')}
                  />
                  {errors.username && <div className="text-xs text-rose-600 mt-1">{errors.username.message}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  {errors.password && <div className="text-xs text-rose-600 mt-1">{errors.password.message}</div>}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && <div className="text-xs text-rose-600 mt-1">{errors.confirmPassword.message}</div>}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    Role: <span className="font-semibold text-brand-700">{role}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {role === 'MANAGER'
                      ? 'This user will be able to manage sales teams and leads.'
                      : 'This user will be assigned to your team and can manage leads.'}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-700 hover:to-accent-700 text-sm disabled:opacity-60 shadow-soft hover:shadow-hover transition"
                  >
                    {isSubmitting ? 'Registering…' : `Register ${roleLabel}`}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
