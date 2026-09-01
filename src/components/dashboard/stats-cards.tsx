'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';

export type WeeklyStats = {
  weeklyRevenue: number;
  weeklyOrders: number;
  weeklyProfit: number;
  bestProfitDay: { day: string; profit: number };
};

type StatsCardsProps = {
  stats: WeeklyStats;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export function StatsCards({ stats }: StatsCardsProps) {
  const statCards = [
    {
      title: 'Pendapatan 7 Hari',
      value: formatCurrency(stats.weeklyRevenue),
      icon: DollarSign,
      description: 'Total omzet kotor',
    },
    {
      title: 'Estimasi Laba Bersih',
      value: formatCurrency(stats.weeklyProfit),
      icon: Wallet,
      description: `Rata-rata ${formatCurrency(Math.round(stats.weeklyProfit / 7))}/hari`,
    },
    {
      title: 'Total Transaksi',
      value: `${stats.weeklyOrders.toLocaleString('id-ID')} Pesanan`,
      icon: ShoppingBag,
      description: 'Pesanan terselesaikan',
    },
    {
      title: 'Hari Penjualan Terbaik',
      value: stats.bestProfitDay.day,
      icon: TrendingUp,
      description: `Laba: ${formatCurrency(stats.bestProfitDay.profit)}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
