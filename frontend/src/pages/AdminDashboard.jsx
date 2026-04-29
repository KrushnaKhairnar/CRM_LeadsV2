import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Pencil, Shield, UserPlus, Users2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UsersAPI } from "../api/endpoints";
import RegisterUserModal from "./components/RegisterUserModal";

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [openRegister, setOpenRegister] = useState(false);

  const { data: managers, isLoading } = useQuery({
    queryKey: ["managers"],
    queryFn: () => UsersAPI.listManagers(),
  });

  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    is_active: true,
  });

  const openEditModal = (manager) => {
    setSelected(manager);

    setForm({
      username: manager.username || "",
      email: manager.email || "",
      is_active: manager.is_active ?? true,
    });

    setOpenEdit(true);
  };

  const saveManager = async () => {
    try {
      await UsersAPI.updateManager(selected.user_id, form);

      qc.invalidateQueries({ queryKey: ["managers"] });

      toast.success("Manager updated successfully");

      setOpenEdit(false);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error("Username already exists, Please Choose another username");
      } else {
        toast.error("Username already exists, Choose another username ");
      }
    }
  };

  const managerCount = managers?.length || 0;

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Admin Dashboard
          </div>
          <div className="text-sm text-slate-500">
            Manage your organization's team hierarchy
          </div>
        </div>

        <button
          onClick={() => setOpenRegister(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-700 hover:to-accent-700 text-sm shadow-soft"
        >
          <UserPlus size={16} />
          Register Manager
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={<Users2 size={20} />}
          title="Total Managers"
          value={managerCount}
          gradient="from-brand-500 to-brand-600"
        />
        <StatCard
          icon={<Shield size={20} />}
          title="Role"
          value="ADMIN"
          gradient="from-accent-500 to-accent-600"
        />
        <StatCard
          icon={<Clock size={20} />}
          title="System"
          value="Active"
          gradient="from-emerald-500 to-emerald-600"
        />
      </div>

      {/* Managers Table */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-soft overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="font-medium text-slate-800">Registered Managers</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Each manager can create and manage their own sales team
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Update</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-4" colSpan="7">
                    Loading...
                  </td>
                </tr>
              )}

              {!isLoading &&
                (managers || [])
                  .sort((a, b) => b.user_id.localeCompare(a.user_id))
                  .map((m, idx) => (
                    <tr
                      key={m.user_id}
                      className="border-t odd:bg-white even:bg-slate-50/60"
                    >
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>

                      <td className="py-3 px-4 font-medium">{m.username}</td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
                          <Shield size={12} />
                          {m.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {m.created_at
                          ? new Date(m.created_at).toLocaleDateString("en-GB")
                          : "—"}
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {m.user_id}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            m.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* EDIT */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openEditModal(m)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-xs"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <RegisterUserModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        role="MANAGER"
        onCreated={() => qc.invalidateQueries({ queryKey: ["managers"] })}
      />

      {openEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-semibold">Edit Manager</h2>

            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
              className="w-full border rounded-lg px-3 py-2"
            />

            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="w-full border rounded-lg px-3 py-2"
            />

            {/* <select
        value={form.is_active ? 'true' : 'false'}
        onChange={(e) =>
          setForm({
            ...form,
            is_active: e.target.value === 'true'
          })
        }
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select> */}

            <div className="flex items-center justify-between border rounded-xl px-4 py-3">
              <span className="font-medium text-slate-700">
                {form.is_active ? "Active" : "Inactive"}
              </span>

              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    is_active: !form.is_active,
                  })
                }
                className={`w-10 h-6 flex items-center rounded-full p-1 transition ${
                  form.is_active ? "bg-green-500" : "bg-red-500"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    form.is_active ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpenEdit(false)}
                className="flex-1 border rounded-lg py-2"
              >
                Cancel
              </button>

              <button
                onClick={saveManager}
                className="flex-1 bg-brand-600 text-white rounded-lg py-2"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, gradient }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white`}
        >
          {icon}
        </div>

        <div>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="text-2xl font-semibold mt-0.5">{value}</div>
        </div>
      </div>
    </div>
  );
}
