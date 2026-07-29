"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Occupation } from "@prisma/client";

import { OCCUPATION_LABELS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "0.8rem",
  color: "hsl(var(--popover-foreground))",
};

const AXIS = { stroke: "hsl(var(--muted-foreground))", fontSize: 12 };

export function OccupationUsersChart({
  data,
}: {
  data: { occupation: Occupation; users: number }[];
}) {
  const chartData = data.map((row) => ({
    name: OCCUPATION_LABELS[row.occupation],
    value: row.users,
  }));
  const hasData = chartData.some((row) => row.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users by occupation</CardTitle>
        <CardDescription>How the cohort is distributed across the four trades.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty message="No users have chosen an occupation yet." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={96}
                paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function OccupationScoresChart({
  data,
}: {
  data: { occupation: Occupation; average: number; attempts: number }[];
}) {
  const chartData = data.map((row) => ({
    name: OCCUPATION_LABELS[row.occupation],
    average: row.average,
    attempts: row.attempts,
  }));
  const hasData = chartData.some((row) => row.attempts > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average score by occupation</CardTitle>
        <CardDescription>Mean percentage across all completed attempts.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty message="No tests have been completed yet." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} {...AXIS} interval={0} height={54} angle={-15} textAnchor="end" />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} {...AXIS} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, _name, item) => [
                  `${value}% over ${(item?.payload as { attempts: number })?.attempts ?? 0} attempt(s)`,
                  "Average",
                ]}
              />
              <Bar dataKey="average" radius={[6, 6, 0, 0]} barSize={44}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="grid h-[220px] place-items-center rounded-lg border border-dashed">
      <p className="px-6 text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
