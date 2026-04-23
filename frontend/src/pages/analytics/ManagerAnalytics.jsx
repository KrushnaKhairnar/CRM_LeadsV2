import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsManager } from "../../api/endpoints";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, BarChart, XAxis, YAxis, Bar, Legend, AreaChart, Area } from "recharts";
import { UsersAPI } from "../../api/endpoints";

export default function ManagerAnalytics() {
    const [days, setDays] = useState(30);

    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics-manager", days],
        queryFn: () => analyticsManager({ days }),
    });
    const { data: users } = useQuery({ queryKey: ['sales-users'], queryFn: () => UsersAPI.listSales() })

    const statusData = useMemo(() => {
        const m = data?.by_status || {};
        return Object.keys(m).map((k) => ({ name: k, value: m[k] }));
    }, [data]);

    const tempData = useMemo(() => {
        const m = data?.by_temperature || {};
        return Object.keys(m).map((k) => ({ name: k, value: m[k] }));
    }, [data]);

    const bySalesData = useMemo(() => {
        const m = data?.by_sales_person || {};
        const nameOf = (id) =>
            (users || []).find((u) => u.user_id === id)?.username ||
            (id === "UNASSIGNED" ? "UNASSIGNED" : id ? id.slice(-6) : "—");
        return Object.keys(m).map((k) => ({ name: nameOf(k), value: m[k] }));
    }, [data, users]);

    const agingData = useMemo(() => {
        const m = data?.aging || {};
        const order = ["0-7", "8-30", "31-90", "91+"];
        return order.map((k) => ({ bucket: k, value: m[k] || 0 }));
    }, [data]);

    const funnelData = useMemo(() => {
        const stages = data?.funnel?.stages || {};
        const order = ["NEW", "CONTACTED", "DEMO", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
        return order.map((k) => ({ stage: k, value: stages[k] || 0 }));
    }, [data]);

    if (isLoading) return <div className="p-6">Loading analytics…</div>;
    if (error) return <div className="p-6 text-red-600">Failed to load analytics.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">Analytics (Manager)</h1>
                <select
                    className="border rounded px-2 py-1"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                    <div className="font-medium mb-2">Leads by Status</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={["#10b981", "#14b8a6", "#f59e0b", "#0ea5e9", "#f43f5e", "#a3e635"][i % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                    <div className="font-medium mb-2">Leads by Temperature</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={tempData} margin={{ left: 10, right: 10 }}>
                                <defs>
                                    <linearGradient id="gTempAna" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2} fill="url(#gTempAna)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                    <div className="font-medium mb-2">Lead Aging (days since created)</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agingData}>
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                    <div className="font-medium mb-2">Conversion Funnel (by stage)</div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData}>
                                <XAxis dataKey="stage" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        Win rate: {Math.round(((data?.funnel?.win_rate || 0) * 100))}%
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
                <div className="font-medium mb-2">Leads by Sales Person</div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bySalesData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
