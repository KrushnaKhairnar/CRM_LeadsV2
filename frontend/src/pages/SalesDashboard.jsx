import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeadsAPI, AnalyticsAPI } from "../api/endpoints";
import { Link } from "react-router-dom";
import Badge from "../components/Badge";
import CreateLeadModal from "./components/CreateLeadModal";
import { CheckCircle2, Clock3, Plus, Target, TrendingDown } from "lucide-react";

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

export default function SalesDashboard() {
  const { data } = useQuery({
    queryKey: ["leads-sales", { page: 1 }],
    queryFn: () => LeadsAPI.list({ page: 1, page_size: 10 }),
  });
  const { data: ana } = useQuery({
    queryKey: ["analytics-sales"],
    queryFn: () => AnalyticsAPI.salesMe({ days: 30 }),
  });
  const [openCreate, setOpenCreate] = useState(false);

  const overdue = useMemo(
    () => (data?.items || []).filter((l) => l.is_overdue),
    [data],
  );
  const dueToday = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return (data?.items || []).filter(
      (l) =>
        l.next_followup_at &&
        new Date(l.next_followup_at) >= start &&
        new Date(l.next_followup_at) < end,
    );
  }, [data]);

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-950">
            Sales Dashboard
          </div>
          <div className="text-sm text-slate-500 mt-1">
            Your assigned/created leads and followups
          </div>
        </div>
        <div>
          <button
            onClick={() => setOpenCreate(true)}
            className="crm-btn crm-btn-primary"
          >
            <Plus size={16} /> Quick Add Lead
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card
          tone="blue"
          icon={<Target size={18} />}
          title="My Leads (30d)"
          value={ana?.total ?? "-"}
          hint="Assigned / created"
        />
        <Card
          tone="green"
          icon={<CheckCircle2 size={18} />}
          title="Won"
          value={ana?.won ?? "-"}
          hint="Won successfully"
        />
        <Card
          tone="rose"
          icon={<TrendingDown size={18} />}
          title="Lost"
          value={ana?.lost ?? "-"}
          hint="Lost opportunities"
        />
        <Card
          tone="orange"
          icon={<Clock3 size={18} />}
          title="Overdue"
          value={ana?.overdue ?? "-"}
          hint="Needs followup"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={`Followups Due Today (${dueToday.length})`}>
          <div className="space-y-2">
            {dueToday.length === 0 && (
              <div className="text-sm text-slate-500">Nothing due today.</div>
            )}
            {dueToday.map((l) => (
              <Link
                key={l._id}
                to={`/leads/${l.lead_id}`}
                className="block border border-slate-100 rounded-xl p-3 hover:bg-brand-50/50 transition"
              >
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-slate-500">
                   {formatISTDate(l.next_followup_at)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title={`Overdue Followups (${overdue.length})`}>
          <div className="space-y-2">
            {overdue.length === 0 && (
              <div className="text-sm text-slate-500">
                No overdue followups.
              </div>
            )}
            {overdue.map((l) => (
              <Link
                key={l._id}
                to={`/leads/${l.lead_id}`}
                className="block border border-rose-100 rounded-xl p-3 hover:bg-rose-50 transition"
              >
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-rose-700">
                  Overdue since{" "}
                   {formatISTDate(l.next_followup_at)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="My Assigned / Created Leads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Name</th>
                <th>Status</th>
                <th>Temp</th>
                <th>Pipeline Stage</th>
                <th>Next Followup</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="py-2">{l.name}</td>
                  <td>
                    <Badge value={l.status} />
                  </td>
                  <td>
                    <Badge value={l.temperature} />
                  </td>
                  <td>
                    {l.pipeline_stage ? (
                      <Badge value={l.pipeline_stage} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>{formatISTDate(l.next_followup_at)}</td>
                  <td className="text-right">
                    <Link
                      className="text-brand-700 underline decoration-brand-400 underline-offset-4"
                      to={`/leads/${l.lead_id}`}
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
      <CreateLeadModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => setOpenCreate(false)}
      />
    </div>
  );
}

function Card({ title, value, hint, icon, tone = "blue" }) {
  const tones = {
    blue: "bg-[#eef4ff] text-blue-700 ring-blue-100",
    green: "bg-[#effbf5] text-emerald-700 ring-emerald-100",
    orange: "bg-[#fff5ec] text-orange-700 ring-orange-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
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

function Panel({ title, children }) {
  return (
    <div className="crm-card p-4 transition hover:shadow-hover">
      <div className="crm-panel-title">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
