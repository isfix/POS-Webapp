'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Package, XCircle, Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { generateAndStoreDailyAnalysis, getLatestDailyInsight, type DailyInsight } from '@/actions/insights';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { parseSafeDate } from '@/lib/utils';

type InsightCategory = 'lowStockItems' | 'topSellingItems' | 'slowMovingItems' | 'idleAssets' | 'profitAnomalies';

const insightMeta: Record<InsightCategory, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  lowStockItems: { title: 'Peringatan Stok Menipis', icon: AlertTriangle },
  topSellingItems: { title: 'Produk Terlaris', icon: TrendingUp },
  slowMovingItems: { title: 'Produk Slow Moving', icon: Package },
  idleAssets: { title: 'Peralatan Perlu Perhatian', icon: AlertCircle },
  profitAnomalies: { title: 'Evaluasi Margin / HPP', icon: XCircle },
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
      toast({ title: 'Gagal', description: 'Gagal mengambil analisis AI harian.', variant: 'destructive' });
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
      toast({ title: 'Berhasil', description: 'Analisis AI & rekomendasi operasional berhasil diperbarui.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal menjalankan analisis AI.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };
  
  const renderInsightList = (category: InsightCategory) => {
    if (!insight) return null;
    const items = insight[category];
    if (!items || items.length === 0) return null;
    const Icon = insightMeta[category].icon;

    return (
      <div className="rounded-lg border border-border p-3 bg-muted/20">
        <h4 className="flex items-center gap-2 font-medium text-xs mb-1.5 text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {insightMeta[category].title}
        </h4>
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary"/>
            <span>Wawasan AI Operasional</span>
          </CardTitle>
          <CardDescription>
            {insight 
              ? `Dibuat ${formatDistanceToNow(parseSafeDate(insight.timestamp), { addSuffix: true, locale: idLocale })}`
              : 'Belum ada analisis yang dibuat untuk hari ini.'}
          </CardDescription>
        </div>
        <Button onClick={handleGenerate} disabled={generating} size="sm" variant="outline" className="h-8 text-xs font-medium">
          {generating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bot className="mr-1.5 h-3.5 w-3.5" />
          )}
          Analisis Ulang
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {insight ? (
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Ikhtisar:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.overallSummary}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderInsightList('lowStockItems')}
              {renderInsightList('topSellingItems')}
              {renderInsightList('slowMovingItems')}
              {renderInsightList('idleAssets')}
              {renderInsightList('profitAnomalies')}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Bot className="h-8 w-8 mb-2 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Belum ada analisis harian</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Klik tombol di atas untuk menjalankan analisis otomatis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
