import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthAPI } from "../api/endpoints";
import { useAuthStore } from "../auth/store";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
});

export default function Login() {
  const nav = useNavigate();
  const setToken = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "manager1", password: "password" },
  });

  const onSubmit = async (values) => {
    try {
      const t = await AuthAPI.login(values);
      useAuthStore.getState().setToken(t.access_token);
      const me = await AuthAPI.me();
      useAuthStore.getState().setUser(me);
      toast.success("Logged in");
      nav("/");
    } catch (e) {
      toast.error("Login failed", {
        description: e?.response?.data?.detail || "Invalid credentials",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-slate-100">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-brand-600" />
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-card p-7 animate-in-pop">
        <div className="text-center">
          <div className="text-xl font-semibold tracking-tight text-slate-950">
            CRM Leads
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Login: admin / manager1 / sales1 / sales2
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Username
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-slate-300 pl-9 h-9 rounded-md"
                placeholder="e.g. vihan"
                {...register("username")}
              />
            </div>
            {errors.username && (
              <div className="text-xs text-rose-600 mt-1">
                {errors.username.message}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                className="mt-1 placeholder:pl-6 w-full  rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-slate-300 pl-9 h-9 rounded-md"
                placeholder="Password"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <div className="text-xs text-rose-600 mt-1">
                {errors.password.message}
              </div>
            )}
          </div>
          <button
            disabled={isSubmitting}
            className="w-full rounded-md py-2 text-xs font-semibold text-white disabled:opacity-60 shadow-soft bg-brand-600 hover:bg-brand-700"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
