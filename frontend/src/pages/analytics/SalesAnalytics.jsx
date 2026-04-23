import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsSalesMe } from "../../api/endpoints";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function SalesAnalytics() {
    const [days, setDays] = useState(30);

    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics-sales-me", days],
        queryFn: () => analyticsSalesMe({ days }),
    });

    const stageData = useMemo(() => {
        const m = data?.by_stage || {};
        const order = ["NEW", "CONTACTED", "DEMO", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
        return order.map((k) => ({ name: k, value: m[k] || 0 }));
    }, [data]);

    const agingData = useMemo(() => {
        const m = data?.aging || {};
        const order = ["0-7", "8-30", "31-90", "91+"];
        return order.map((k) => ({ bucket: k, value: m[k] || 0 }));
    }, [data]);

    if (isLoading) return <div className="p-6">Loading analytics…</div>;
    if (error) return <div className="p-6 text-red-600">Failed to load analytics.</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">My Analytics (Sales)</h1>
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
                    <div className="font-medium mb-2">Pipeline Stage Breakdown</div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageData}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                    <div className="font-medium mb-2">Lead Aging (days since created)</div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agingData}>
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
