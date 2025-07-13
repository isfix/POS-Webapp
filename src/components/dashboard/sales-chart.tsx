'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
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

type SalesChartProps = {
    chartData: { date: string; sales: number }[];
    className?: string;
}

export function SalesChart({ chartData, className }: SalesChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Weekly Sales</CardTitle>
        <CardDescription>Sales overview for the last 7 days.</CardDescription>
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
                  dataKey="sales"
                  fill="var(--color-sales)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
