'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const chartConfig = {
  profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

const formatChartCurrency = (value: number) => `Rp ${Math.floor(value / 1000)}k`;

type ProfitChartProps = {
    chartData: { date: string; profit: number }[];
    className?: string;
}

export function ProfitChart({ chartData, className }: ProfitChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weekly Profit</CardTitle>
        <CardDescription>Profit overview for the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatChartCurrency}
                />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />}
                />
                <Bar
                  dataKey="profit"
                  fill="var(--color-profit)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
