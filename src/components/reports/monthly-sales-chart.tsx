'use client';

import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MonthlyData = {
  date: string;
  sales: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export function MonthlySalesChart({ chartData }: { chartData: MonthlyData[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">Tren Penjualan Harian Bulan Ini</CardTitle>
          <CardDescription className="text-xs">Grafik fluktuasi pendapatan per hari</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
              <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={2} />
              <YAxis
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(val: number) =>
                  val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${Math.round(val / 1000)}rb`
                }
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                labelFormatter={(label) => `Tanggal: ${label}`}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--foreground)',
                }}
              />
              <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
