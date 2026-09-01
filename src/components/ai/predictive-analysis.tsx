'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { runGenerateDailyInsights } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

export function PredictiveAnalysis() {
  const [salesData, setSalesData] = useState('');
  const [expensesData, setExpensesData] = useState('');
  const [marketData, setMarketData] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!salesData && !expensesData && !marketData) {
      toast({ title: 'Perhatian', description: 'Silakan isi setidaknya satu kolom data.', variant: 'destructive'});
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await runGenerateDailyInsights({ 
        salesData: [{ name: salesData || 'Roti Manis', quantity: 10, profit: 50000, date: new Date().toISOString() }], 
        inventoryData: [],
        assetData: []
      });
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal membuat analisis.', variant: 'destructive'});
    }
    setLoading(false);
  };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="p-4 pb-2 border-b border-border/60">
        <CardTitle className="text-sm font-bold text-foreground">Alat Analisis Prediktif Bakery (AI)</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Temukan pola tren penjualan dan anomali margin toko roti.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="salesData" className="text-xs font-semibold">Data Penjualan</Label>
            <Textarea id="salesData" placeholder="Contoh: Tren penjualan mingguan +5%" value={salesData} onChange={e => setSalesData(e.target.value)} rows={3} className="text-xs bg-background" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expensesData" className="text-xs font-semibold">Data Pengeluaran</Label>
            <Textarea id="expensesData" placeholder="Contoh: Biaya mentega naik 10%" value={expensesData} onChange={e => setExpensesData(e.target.value)} rows={3} className="text-xs bg-background" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="marketData" className="text-xs font-semibold">Riset Pasar</Label>
            <Textarea id="marketData" placeholder="Contoh: Buka jam 07:00 pagi saat jam berangkat kantor" value={marketData} onChange={e => setMarketData(e.target.value)} rows={3} className="text-xs bg-background" />
          </div>
        </div>

        {result && (
          <Card className="bg-secondary/40 border border-border">
            <CardHeader className="p-3 pb-1 flex-row items-center gap-2 space-y-0">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-xs font-bold">Ringkasan Analisis AI</CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              <p className="text-muted-foreground">{result.overallSummary}</p>
            </CardContent>
          </Card>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t border-border flex justify-between">
        <p className="text-[11px] text-muted-foreground">Didukung Aura AI</p>
        <Button onClick={handleSubmit} disabled={loading} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Jalankan Analisis
        </Button>
      </CardFooter>
    </Card>
  );
}
