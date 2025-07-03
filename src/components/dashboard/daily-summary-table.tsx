'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getLatestDailySummaries, generateDailySummaryForDate, type DailySummary } from '@/actions/summaries';
import { format } from 'date-fns';
import { ChevronDown, RefreshCw, AlertCircle, Package, Wrench, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

function DailySummaryRow({ summary }: { summary: DailySummary }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <TableRow onClick={() => setIsOpen(!isOpen)} className="cursor-pointer [&_td:not(:last-child)]:border-r">
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{format(summary.timestamp.toDate(), 'EEE, MMM d')}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(summary.totalRevenue)}</TableCell>
                <TableCell className="text-right">{summary.totalOrders}</TableCell>
                <TableCell>{summary.topItems[0]?.name || 'N/A'}</TableCell>
                <TableCell className="text-right">{summary.lowStockCount > 0 ? (
                    <Badge variant="destructive">{summary.lowStockCount}</Badge>
                ) : summary.lowStockCount}</TableCell>
                <TableCell className="text-right">{summary.maintenanceAssetsCount > 0 ? (
                        <Badge variant="outline" className="text-orange-500 border-orange-500">{summary.maintenanceAssetsCount}</Badge>
                ) : summary.maintenanceAssetsCount}</TableCell>
            </TableRow>
            {isOpen && (
                <TableRow className="bg-muted/80 hover:bg-muted">
                    <TableCell colSpan={6} className="p-0">
                         <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4"/> Top 5 Items</h4>
                                <ul className="list-decimal list-inside text-sm text-muted-foreground">
                                    {summary.topItems.length > 0 ? summary.topItems.map(item => (
                                        <li key={item.name}>{item.name} ({item.quantity} sold)</li>
                                    )) : <li>No items sold.</li>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Low Stock Items</h4>
                                <p className="text-sm text-muted-foreground">
                                    {summary.lowStockItems.length > 0 ? summary.lowStockItems.join(', ') : 'No items are low on stock.'}
                                </p>
                            </div>
                                <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Wrench className="h-4 w-4"/> Assets in Repair</h4>
                                <p className="text-sm text-muted-foreground">
                                    {summary.maintenanceAssets.length > 0 ? summary.maintenanceAssets.join(', ') : 'No assets in maintenance.'}
                                </p>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

export function DailySummaryTable() {
    const [summaries, setSummaries] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();

    const fetchSummaries = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getLatestDailySummaries(10);
            setSummaries(data);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not fetch daily summaries.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSummaries();
    }, [fetchSummaries]);

    const handleGenerateToday = async () => {
        setGenerating(true);
        try {
            await generateDailySummaryForDate(new Date());
            toast({ title: 'Success', description: "Today's summary has been generated." });
            fetchSummaries(); // Refresh the list
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate today\'s summary.', variant: 'destructive' });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Daily Summaries</CardTitle>
                    <CardDescription>Key metrics from the last 10 days of operations.</CardDescription>
                </div>
                <Button onClick={handleGenerateToday} disabled={generating || loading} size="sm">
                     {generating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Generate Today's Summary
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader className="bg-accent">
                        <TableRow className="[&_th:not(:last-child)]:border-r">
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead>Top Item</TableHead>
                            <TableHead className="text-right">Low Stock</TableHead>
                            <TableHead className="text-right">In Repair</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : summaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No daily summaries found. Generate one for today to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            summaries.map(summary => <DailySummaryRow key={summary.id} summary={summary} />)
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
