'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Package, XCircle, Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { generateAndStoreDailyAnalysis, getLatestDailyInsight, type DailyInsight } from '@/actions/insights';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

type InsightCategory = 'lowStockItems' | 'topSellingItems' | 'slowMovingItems' | 'idleAssets' | 'profitAnomalies';

const insightMeta: Record<InsightCategory, { title: string; icon: React.ReactNode }> = {
    lowStockItems: { title: 'Low Stock Alerts', icon: <AlertTriangle className="h-4 w-4 text-destructive" /> },
    topSellingItems: { title: 'Top Selling Items', icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
    slowMovingItems: { title: 'Slow Moving Items', icon: <Package className="h-4 w-4 text-amber-500" /> },
    idleAssets: { title: 'Idle Assets', icon: <AlertCircle className="h-4 w-4 text-blue-500" /> },
    profitAnomalies: { title: 'Profit Anomalies', icon: <XCircle className="h-4 w-4 text-red-700" /> },
};


export function DailyInsights() {
    const [insight, setInsight] = useState<DailyInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getLatestDailyInsight();
            setInsight(data);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not fetch daily insights.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const newInsight = await generateAndStoreDailyAnalysis();
            setInsight(newInsight);
            toast({ title: 'Success', description: 'New insights & notifications generated.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate new analysis.', variant: 'destructive' });
        } finally {
            setGenerating(false);
        }
    };
    
    const renderInsightList = (category: InsightCategory) => {
        if (!insight) return null;
        const items = insight[category];
        if (!items || items.length === 0) return null;

        return (
            <div>
                <h4 className="flex items-center gap-2 font-semibold mb-2 text-sm">
                    {insightMeta[category].icon}
                    {insightMeta[category].title}
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                    {items.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        )
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary"/>
                        <span>AI Daily Insights</span>
                    </CardTitle>
                    <CardDescription>
                        {insight 
                            ? `Generated ${formatDistanceToNow(insight.timestamp.toDate(), { addSuffix: true })}`
                            : 'No insights generated yet for today.'}
                    </CardDescription>
                </div>
                <Button onClick={handleGenerate} disabled={generating} size="sm">
                    {generating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Bot className="mr-2 h-4 w-4" />
                    )}
                    Generate Now
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {insight ? (
                    <>
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="font-semibold text-sm">Aura's Summary:</p>
                            <p className="text-muted-foreground">{insight.overallSummary}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {renderInsightList('lowStockItems')}
                           {renderInsightList('topSellingItems')}
                           {renderInsightList('slowMovingItems')}
                           {renderInsightList('idleAssets')}
                           {renderInsightList('profitAnomalies')}
                        </div>
                    </>

                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                        <Bot className="h-16 w-16 mb-4 text-primary" />
                        <h3 className="font-semibold">No insights available</h3>
                        <p>Click "Generate Now" to get your first AI-powered analysis of the day.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
