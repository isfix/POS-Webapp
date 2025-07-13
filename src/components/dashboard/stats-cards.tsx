'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';

export type WeeklyStats = {
    weeklyRevenue: number;
    weeklyOrders: number;
    weeklyProfit: number;
    bestProfitDay: { day: string; profit: number };
};

type StatsCardsProps = {
    stats: WeeklyStats;
}

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
            title: 'Weekly Revenue',
            value: formatCurrency(stats.weeklyRevenue),
            icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
            description: 'Total gross revenue for the last 7 days.'
        },
        {
            title: 'Weekly Profit',
            value: formatCurrency(stats.weeklyProfit),
            icon: <Wallet className="h-5 w-5 text-muted-foreground" />,
            description: `Avg. daily profit: ${formatCurrency(stats.weeklyProfit / 7)}`
        },
        {
            title: 'Weekly Orders',
            value: stats.weeklyOrders.toLocaleString(),
            icon: <ShoppingCart className="h-5 w-5 text-muted-foreground" />,
            description: 'Total orders placed in the last 7 days.'
        },
        {
            title: 'Best Profit Day',
            value: stats.bestProfitDay.day,
            icon: <TrendingUp className="h-5 w-5 text-muted-foreground" />,
            description: `Profit: ${formatCurrency(stats.bestProfitDay.profit)}`
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        {stat.icon}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
