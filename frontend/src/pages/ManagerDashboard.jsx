import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnalyticsAPI, LeadsAPI, UsersAPI } from "../api/endpoints";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import RegisterUserModal from "./components/RegisterUserModal";
import { useAuthStore } from "../auth/store";

export default function ManagerDashboard() {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [openRegister, setOpenRegister] = useState(false);

  // ✅ Logged in manager
  const me = useAuthStore((s) => s.user);

  // ✅ Manager analytics (backend should filter by manager)
  const { data } = useQuery({
    queryKey: ["analytics-manager", days],
    queryFn: () => AnalyticsAPI.manager({ days }),
  });

  // ✅ Revenue
  const { data: rev } = useQuery({
    queryKey: ["rev-manager", days],
    queryFn: () => AnalyticsAPI.revenueManager({ days }),
  });

  // ✅ My team only
  const { data: myTeam } = useQuery({
    queryKey: ["my-team"],
    queryFn: () => UsersAPI.myTeam(),
  });

  // ✅ Recent leads only created by this manager
  const { data: leads } = useQuery({
    queryKey: ["manager-leads", me?.user_id],
    enabled: !!me?.user_id,
    queryFn: () =>
      LeadsAPI.list({
        page: 1,
        page_size: 10,
        sort_by: "updated_at",
        created_by: me.user_id,
      }),
  });

  const statusData = useMemo(() => {
    const m = data?.by_status || {};
    return Object.keys(m).map((k) => ({
      name: k,
      value: m[k],
    }));
  }, [data]);

  const tempData = useMemo(() => {
    const m = data?.by_temperature || {};
    return Object.keys(m).map((k) => ({
      name: k,
      value: m[k],
    }));
  }, [data]);

  const salesData = useMemo(() => {
    const m = data?.by_sales_person || {};
    const users = myTeam || [];

    const getName = (id) => {
      const found = users.find((u) => u.user_id === id);
      return found?.username || "UNASSIGNED";
    };

    return Object.keys(m).map((k) => ({
      name: getName(k),
      value: m[k],
    }));
  }, [data, myTeam]);

  const pieColors = [
    "#10b981",
    "#14b8a6",
    "#f59e0b",
    "#0ea5e9",
    "#f43f5e",
    "#a3e635",
  ];

  return (
    <div className="space-y-6 animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            Manager Dashboard
          </div>
          <div className="text-sm text-slate-500">
            Overview and team performance
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenRegister(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 text-white hover:from-brand-700 hover:to-accent-700 text-sm shadow-soft transition"
          >
            <UserPlus size={16} />
            Register Sales Person
          </button>

          <select
            className="text-sm rounded-xl border px-3 py-2"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card title="My Sales Team" value={myTeam?.length ?? 0} />
        <Card title="Total Leads" value={data?.total_leads ?? 0} />
        <Card title="Overdue Followups" value={data?.overdue_followups ?? 0} />
        <Card title="Today's Followups" value={data?.today_followups ?? 0} />
        <Card
          title="Revenue (today)"
          value={(rev?.today_total ?? 0).toLocaleString("en-GB")}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status */}
        <Panel title="Leads by Status">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  outerRadius={90}
                  label
                >
                  {statusData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={pieColors[idx % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Temperature */}
        <Panel title="Leads by Temperature">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={tempData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  dataKey="value"
                  stroke="#14b8a6"
                  fill="#14b8a620"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Sales */}
        <Panel title="Leads by Sales Person">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={salesData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Revenue */}
      <Panel title="Revenue (last 15 days)">
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={rev?.last15 || []}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                dataKey="total"
                stroke="#10b981"
                fill="#10b98120"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Recent Leads */}
      <Panel title="Recent Leads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Next Followup</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {(leads?.items || []).map((l) => (
                <tr key={l._id} className="border-t">
                  <td className="py-2">{l.name}</td>
                  <td>{l.company || "-"}</td>
                  <td>{l.status}</td>
                  <td>
                    {l.next_followup_at
                      ? new Date(l.next_followup_at).toLocaleString("en-GB")
                      : "-"}
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/leads/${l.lead_id}`}
                      className="text-brand-700 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal */}
      <RegisterUserModal
        open={openRegister}
        onClose={() => setOpenRegister(false)}
        role="SALES"
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["my-team"] });
          qc.invalidateQueries({ queryKey: ["manager-leads"] });
        }}
      />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border rounded-2xl p-4 shadow-soft">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border rounded-2xl p-4 shadow-soft">
      <div className="font-medium">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}