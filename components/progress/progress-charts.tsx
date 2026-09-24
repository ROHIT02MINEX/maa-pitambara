"use client";
import { useLanguage } from "@/hooks/use-language";
import { translate } from "@/lib/i18n";
import { T } from "@/components/translated-text";


import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PASS_PERCENTAGE } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TimelinePoint = { attempt: number; label: string; percentage: number };
type TopicPoint = { topic: string; accuracy: number; attempts: number };

const AXIS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 12,
};

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "0.8rem",
  color: "hsl(var(--popover-foreground))",
};

export function ScoreTrendChart({ data }: { data: TimelinePoint[] }) {
  const { language } = useLanguage();
  const t = (text: string) => translate(text, language);
  return (
    <Card>
      <CardHeader>
        <CardTitle><T>{"Score trend"}</T></CardTitle>
        <CardDescription><T>{" Percentage achieved in each attempt, oldest first. The dashed line is the"}</T><T>{" "}</T>
          <T>{PASS_PERCENTAGE}</T><T>{"% pass mark. "}</T></CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="Take a test to start building your trend." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} {...AXIS} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} {...AXIS} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value}%`, t("Score")]}
              />
              <ReferenceLine
                y={PASS_PERCENTAGE}
                stroke="hsl(var(--chart-2))"
                strokeDasharray="6 4"
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--chart-1))" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TopicAccuracyChart({ data }: { data: TopicPoint[] }) {
  const { language } = useLanguage();
  const t = (text: string) => translate(text, language);
  const top = data.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle><T>{"Accuracy by topic"}</T></CardTitle>
        <CardDescription><T>{"Weakest topics first. These are worth revising."}</T></CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyChart message="Topic accuracy appears once you have completed a test." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, top.length * 42)}>
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} {...AXIS} />
              <YAxis
                type="category"
                tickFormatter={t} dataKey="topic"
                width={130}
                tickLine={false}
                axisLine={false}
                {...AXIS}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, _name, item) => [
                  `${value}% over ${(item?.payload as TopicPoint)?.attempts ?? 0} question(s)`,
                  "Accuracy",
                ]}
              />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={18}>
                {top.map((entry) => (
                  <Cell
                    key={entry.topic}
                    fill={
                      entry.accuracy >= PASS_PERCENTAGE
                        ? "hsl(var(--chart-2))"
                        : entry.accuracy >= 40
                          ? "hsl(var(--chart-3))"
                          : "hsl(var(--chart-5))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function PassFailChart({ passed, failed }: { passed: number; failed: number }) {
  const { language } = useLanguage();
  const t = (text: string) => translate(text, language);
  const data = [
    { name: t("Passed"), value: passed, fill: "hsl(var(--chart-2))" },
    { name: t("Failed"), value: failed, fill: "hsl(var(--chart-5))" },
  ].filter((slice) => slice.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle><T>{"Pass / fail split"}</T></CardTitle>
        <CardDescription><T>{"Across all your completed attempts."}</T></CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="No completed attempts yet." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-[220px] place-items-center rounded-lg border border-dashed">
      <p className="px-6 text-center text-sm text-muted-foreground"><T>{message}</T></p>
    </div>
  );
}
