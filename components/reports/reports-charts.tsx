"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatCompact } from "@/lib/utils";

const COLORS = ["#7c5cff", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"];

type Series = { name: string; value: number }[];

export function ReportsCharts({
  monthly,
  byCountry,
  byStablecoin,
  byDepartment,
}: {
  monthly: Series;
  byCountry: Series;
  byStablecoin: Series;
  byDepartment: Series;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly payroll spend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={48} />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#7c5cff" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by country</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCountry} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={90} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {byCountry.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stablecoin usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStablecoin} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                {byStablecoin.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {byStablecoin.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend by department</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDepartment}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={12} width={48} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(value) => formatMoney(Number(value))}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
