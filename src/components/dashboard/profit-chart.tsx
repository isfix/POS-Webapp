'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const chartConfig = {
  profit: {
    label: 'Laba Bersih',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatTickNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${Math.round(value / 1000)}rb`;
  return `${value}`;
};

type ProfitChartProps = {
  chartData: { date: string; profit: number }[];
  className?: string;
};

export function ProfitChart({ chartData, className }: ProfitChartProps) {
  const totalProfit = chartData.reduce((acc, curr) => acc + (curr.profit || 0), 0);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Grafik Laba Bersih</CardTitle>
          <CardDescription className="text-xs">Estimasi keuntungan setelah HPP</CardDescription>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-foreground">{formatCurrency(totalProfit)}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="h-[180px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatTickNumber}
                width={48}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />}
              />
              <Bar
                dataKey="profit"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
