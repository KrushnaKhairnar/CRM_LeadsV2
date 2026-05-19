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
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Target,
  UserPlus,
  Users2,
} from "lucide-react";
import RegisterUserModal from "./components/RegisterUserModal";
import { useAuthStore } from "../auth/store";

const formatISTDate = (value) => {
  if (!value) return "-";

  try {
    return new Date(
      typeof value === "string" && !value.endsWith("Z") ? value + "Z" : value,
    ).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
};

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
        sort_by: "created_at",
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
    "#4338ca",
    "#10b981",
    "#f59e0b",
    "#2563eb",
    "#f43f5e",
    "#8b5cf6",
  ];

  return (
    <div className="space-y-6 animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-950">
            Manager Dashboard
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Overview and team performance
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenRegister(true)}
            className="crm-btn crm-btn-primary"
          >
            <UserPlus size={16} />
            Register Sales Person
          </button>

          <select
            className="text-xs rounded-xl border px-3 py-2 bg-white shadow-sm"
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
        <Card
          tone="purple"
          icon={<Users2 size={18} />}
          title="My Sales Team"
          value={myTeam?.length ?? 0}
          hint="Active users"
        />
        <Card
          tone="blue"
          icon={<Target size={18} />}
          title="Total Leads"
          value={data?.total_leads ?? 0}
          hint={`Last ${days} days`}
        />
        <Card
          tone="orange"
          icon={<Clock3 size={18} />}
          title="Overdue Followups"
          value={data?.overdue_followups ?? 0}
          hint="Needs attention"
        />
        <Card
          tone="green"
          icon={<CheckCircle2 size={18} />}
          title="Today's Followups"
          value={data?.today_followups ?? 0}
          hint="Scheduled today"
        />
        <Card
          tone="mint"
          icon={<Banknote size={18} />}
          title="Revenue (today)"
          value={(rev?.today ?? 0).toLocaleString("en-GB")}
          hint="Collected today"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status */}
        <Panel title="Sales Overview" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={rev?.last15 || []}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Area
                  dataKey="total"
                  stroke="#4338ca"
                  strokeWidth={3}
                  fill="#4338ca18"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Leads by Status">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={4}
                >
                  {statusData.map((_, idx) => (
                    <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Leads by Temperature">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={tempData}>
                <defs>
                  <linearGradient
                    id="projectGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#818cf8"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 6px 20px rgba(15,23,42,0.08)",
                  }}
                />

                <Legend />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#projectGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Leads by Sales Person" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={salesData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4338ca" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

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
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="py-2">{l.name}</td>
                  <td>{l.company || "-"}</td>
                  <td>{l.status}</td>
                  <td>
                    {formatISTDate(l.next_followup_at) || "-"}
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/leads/${l.lead_id}`}
                      className="text-brand-700 hover:underline"
                    >
                      View more
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

function Card({ title, value, hint, icon, tone = "blue" }) {
  const tones = {
    purple: "bg-[#f1efff] text-brand-700 ring-brand-100",
    blue: "bg-[#eef4ff] text-blue-700 ring-blue-100",
    green: "bg-[#effbf5] text-emerald-700 ring-emerald-100",
    mint: "bg-[#effbf5] text-emerald-700 ring-emerald-100",
    orange: "bg-[#fff5ec] text-orange-700 ring-orange-100",
  };

  return (
    <div
      className={`crm-card crm-card-hover p-4 ${tones[tone]?.split(" ")[0] || ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-600">{title}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
        </div>
        <div className={`rounded-xl p-2 ring-1 ${tones[tone] || tones.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <div className={`crm-card p-4 ${className}`}>
      <div className="crm-panel-title">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
