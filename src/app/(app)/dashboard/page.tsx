'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit } from 'firebase/firestore';
import { subDays, startOfDay, format } from 'date-fns';

import { StatsCards, type WeeklyStats } from '@/components/dashboard/stats-cards';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { ProfitChart } from '@/components/dashboard/profit-chart';
import { TopItemsCard, type TopItem } from '@/components/dashboard/top-items-card';
import { DailyInsights } from '@/components/dashboard/daily-insights';
import { DailySummaryTable } from '@/components/dashboard/daily-summary-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Recent Transactions types
type Transaction = {
    id: string;
    itemsSummary: string;
    date: string;
    amount: string;
    status: string;
};

type SalesChartData = { date: string; sales: number };
type ProfitChartData = { date: string; profit: number };

// Main state for the dashboard
type DashboardData = {
    stats: WeeklyStats;
    salesChartData: SalesChartData[];
    profitChartData: ProfitChartData[];
    topItems: TopItem[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function DashboardPage() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date();
        const sevenDaysAgo = startOfDay(subDays(today, 6));

        // Listener for weekly data
        const weeklyQuery = query(collection(db, 'orders'), where('timestamp', '>=', sevenDaysAgo));
        const unsubscribeWeekly = onSnapshot(weeklyQuery, (snapshot) => {
            const weeklyOrders = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    grossRevenue: data.grossRevenue || 0,
                    totalProfit: data.totalProfit || 0,
                    items: data.items || [],
                    timestamp: data.timestamp as Timestamp,
                };
            });

            let weeklyRevenue = 0;
            let weeklyProfit = 0;
            const weeklyOrdersCount = weeklyOrders.length;

            const dailySales: { [key: string]: number } = {};
            const dailyProfits: { [key: string]: number } = {};
            const itemCounts: { [key: string]: { quantity: number; revenue: number; profit: number } } = {};
            
            for (let i = 6; i >= 0; i--) {
                const date = format(subDays(today, i), 'EEE');
                dailySales[date] = 0;
                dailyProfits[date] = 0;
            }

            weeklyOrders.forEach(order => {
                const orderDate = order.timestamp.toDate();
                const dayOfWeek = format(orderDate, 'EEE');
                
                weeklyRevenue += order.grossRevenue;
                weeklyProfit += order.totalProfit;
                
                if (dailySales[dayOfWeek] !== undefined) {
                    dailySales[dayOfWeek] += order.grossRevenue;
                }
                 if (dailyProfits[dayOfWeek] !== undefined) {
                    dailyProfits[dayOfWeek] += order.totalProfit;
                }

                order.items.forEach((item: any) => {
                    if (!itemCounts[item.name]) {
                        itemCounts[item.name] = { quantity: 0, revenue: 0, profit: 0 };
                    }
                    const itemRevenue = item.price * item.quantity;
                    const itemCost = (item.costPrice || 0) * item.quantity;
                    itemCounts[item.name].quantity += item.quantity;
                    itemCounts[item.name].revenue += itemRevenue;
                    itemCounts[item.name].profit += (itemRevenue - itemCost);
                });
            });

            const salesChartData = Object.entries(dailySales).map(([date, sales]) => ({ date, sales }));
            const profitChartData = Object.entries(dailyProfits).map(([date, profit]) => ({ date, profit }));

            const topItems = Object.entries(itemCounts)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
            
            const bestProfitDay = Object.entries(dailyProfits).reduce(
                (max, entry) => (entry[1] > max.profit ? { day: entry[0], profit: entry[1] } : max),
                { day: 'N/A', profit: 0 }
            );
            
            setDashboardData({
                stats: {
                    weeklyRevenue,
                    weeklyOrders: weeklyOrdersCount,
                    weeklyProfit,
                    bestProfitDay,
                },
                salesChartData,
                profitChartData,
                topItems,
            });
            
            setLoading(false);
        }, (error) => {
            console.error("Error fetching weekly data: ", error);
            setLoading(false);
        });

        // Listener for recent transactions
        const recentTrxQuery = query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(5));
        const unsubscribeTrx = onSnapshot(recentTrxQuery, (querySnapshot) => {
            const fetchedTransactions: Transaction[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const items = data.items.map((item: any) => `${item.name} (x${item.quantity})`).join(', ');
                fetchedTransactions.push({
                    id: doc.id,
                    itemsSummary: items,
                    date: (data.timestamp as Timestamp).toDate().toLocaleDateString(),
                    amount: formatCurrency(data.total),
                    status: data.status,
                });
            });
            setTransactions(fetchedTransactions);
        });

        return () => {
            unsubscribeWeekly();
            unsubscribeTrx();
        };
    }, []);
    
    const renderTableBody = () => {
        if (loading && transactions.length === 0) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                </TableRow>
            ));
        }

        if (transactions.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No recent transactions found.
                    </TableCell>
                </TableRow>
            );
        }

        return transactions.map(trx => (
            <TableRow key={trx.id} className="[&_td:not(:last-child)]:border-r">
                <TableCell className="font-mono text-xs">{trx.id}</TableCell>
                <TableCell className="font-medium max-w-xs truncate">{trx.itemsSummary}</TableCell>
                <TableCell>{trx.date}</TableCell>
                <TableCell className="text-right">{trx.amount}</TableCell>
                <TableCell>
                    <Badge 
                        variant={trx.status === 'completed' ? 'default' : 'secondary'} 
                        className={trx.status === 'completed' ? 'bg-green-500/20 text-green-700' : 'bg-yellow-500/20 text-yellow-700'}
                    >
                        {trx.status}
                    </Badge>
                </TableCell>
            </TableRow>
        ));
    };

    if (loading || !dashboardData) {
        return (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
                    ))}
                </div>
                <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-[350px] w-full" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-[350px] w-full" /></CardContent></Card>
                </div>
                 <Card><CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        )
    }
    
    return (
        <div className="flex flex-col gap-6">
            <StatsCards stats={dashboardData.stats} />
            <div className="grid grid-cols-1 gap-6">
                <DailyInsights />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SalesChart chartData={dashboardData.salesChartData} />
                <ProfitChart chartData={dashboardData.profitChartData} />
            </div>
            <div className="grid grid-cols-1 gap-6">
                 <TopItemsCard items={dashboardData.topItems} />
            </div>
            <div className="grid grid-cols-1 gap-6">
                <DailySummaryTable />
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-accent">
                                <TableRow className="[&_th:not(:last-child)]:border-r">
                                    <TableHead>ID</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderTableBody()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
