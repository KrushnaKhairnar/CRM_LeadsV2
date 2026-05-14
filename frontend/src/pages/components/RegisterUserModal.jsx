import React, { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthAPI } from "../../api/endpoints";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const schema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(4, "Password must be at least 4 characters"),
    confirmPassword: z.string().min(4),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function RegisterUserModal({ open, onClose, role, onCreated }) {
  const roleLabel = role === "MANAGER" ? "Manager" : "Sales Person";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (open)
      reset({ username: "", email: "", password: "", confirmPassword: "" });
  }, [open, reset]);

  const onSubmit = async (values) => {
    try {
      await AuthAPI.register({
        username: values.username,
        email: values.email,
        password: values.password,
        role,
      });
      toast.success(
        `${roleLabel} "${values.username}" registered successfully`,
      );
      reset();
      onClose();
      onCreated?.();
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409) {
        toast.error("Username already exists");
      } else if (e?.response?.status === 403) {
        toast.error("Permission denied", {
          description: detail || "You cannot create this role",
        });
      } else {
        toast.error("Registration failed", {
          description: detail || "Unknown error",
        });
      }
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" open={open} onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-card border p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-400 text-white shadow-lg shadow-indigo-200/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-300/40">
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
                <div className="grid grid-cols-1 gap-4">
                  {/* Username */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Username
                    </label>

                    <input
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder={`e.g. ${
                        role === "MANAGER" ? "manager_john" : "sales_alice"
                      }`}
                      {...register("username")}
                    />

                    {errors.username && (
                      <div className="text-xs text-rose-600 mt-1">
                        {errors.username.message}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="e.g. john@example.com"
                      {...register("email")}
                    />

                    {errors.email && (
                      <div className="text-xs text-rose-600 mt-1">
                        {errors.email.message}
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Password
                    </label>

                    <input
                      type="password"
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="••••••••"
                      {...register("password")}
                    />

                    {errors.password && (
                      <div className="text-xs text-rose-600 mt-1">
                        {errors.password.message}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Confirm Password
                    </label>

                    <input
                      type="password"
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="••••••••"
                      {...register("confirmPassword")}
                    />

                    {errors.confirmPassword && (
                      <div className="text-xs text-rose-600 mt-1">
                        {errors.confirmPassword.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Info Card */}
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                  <div className="text-sm font-semibold text-indigo-700">
                    {role} Access
                  </div>

                  <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {role === "MANAGER"
                      ? "This user can manage sales teams, leads, and performance tracking."
                      : "This user can manage assigned leads and follow-up activities."}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-sm transition disabled:opacity-60"
                  >
                    {isSubmitting ? "Registering..." : `Register ${roleLabel}`}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
