import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthAPI } from '../api/endpoints'
import { useAuthStore } from '../auth/store'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { User, Lock } from 'lucide-react'

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
})

export default function Login() {
  const nav = useNavigate()
  const setToken = useAuthStore(s => s.setToken)
  const setUser = useAuthStore(s => s.setUser)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: 'manager1', password: 'password' }
  })

  const onSubmit = async (values) => {
    try {
      const t = await AuthAPI.login(values)
      setToken(t.access_token)
      const me = await AuthAPI.me()
      setUser(me)
      toast.success('Logged in')
      nav('/')
    } catch (e) {
      toast.error('Login failed', { description: e?.response?.data?.detail || 'Invalid credentials' })
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-gradient-to-b from-brand-50 to-white">
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full bg-accent-500/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[360px] h-[360px] rounded-full bg-brand-500/20 blur-3xl" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(600px_circle_at_20%_0%,rgba(20,184,166,0.08),transparent_60%)]" />
      <div className="w-full max-w-lg bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl shadow-card p-8 animate-in-pop">
        <div className="text-center">
          <div className="text-3xl font-semibold tracking-tight">Good to see you again</div>
          <div className="text-sm text-slate-500 mt-1">Login with demo: manager1 / sales1 / sales2</div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="mt-1 w-full pl-9 h-12 rounded-xl" placeholder="e.g. manager1" {...register('username')} />
            </div>
            {errors.username && <div className="text-xs text-rose-600 mt-1">{errors.username.message}</div>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" className="mt-1 w-full pl-9 h-12 rounded-xl" placeholder="••••••••" {...register('password')} />
            </div>
            {errors.password && <div className="text-xs text-rose-600 mt-1">{errors.password.message}</div>}
          </div>
          <button disabled={isSubmitting} className="w-full rounded-full py-3 text-white disabled:opacity-60 shadow-soft hover:shadow-hover bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500 text-center">
          Backend http://localhost:8000 • Frontend http://localhost:5173
        </div>
      </div>
    </div>
  )
}
