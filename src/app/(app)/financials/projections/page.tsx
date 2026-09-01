'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, FileDown, Loader2, Bot, TrendingUp, Wallet, CheckCircle, BarChart } from 'lucide-react';
import { generateFinancialProjection, exportProjectionToExcel, generateAiProjection } from '@/actions/financials';
import type { ProjectionAssumptions, ProjectionResults, AiProjectionOutput } from '@/actions/financials';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type OpexItem = { id: number; category: string; amount: string };
type CapexItem = { id: number; assetName: string; cost: string; purchaseMonth: string; usefulLife: string };

const initialOpex: OpexItem[] = [{ id: 1, category: 'Sewa Toko & Ruko', amount: '5000000' }];
const initialCapex: CapexItem[] = [{ id: 1, assetName: 'Deck Oven Gas Baru', cost: '18500000', purchaseMonth: '3', usefulLife: '5' }];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

function AiProjectionDisplay({ projection }: { projection: AiProjectionOutput }) {
  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">Ringkasan Proyeksi AI (30 Hari ke Depan)</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Berdasarkan pola data transaksi historis toko roti</CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid md:grid-cols-2 gap-4">
          <Card className="border border-border shadow-none bg-secondary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Estimasi Omzet Proyeksi</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-black text-foreground">{formatCurrency(projection.projectedRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-none bg-secondary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Estimasi Laba Bersih</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-black text-emerald-600">{formatCurrency(projection.projectedProfit)}</div>
            </CardContent>
          </Card>
        </CardContent>
        <CardContent className="p-4 pt-0 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <Label className="text-xs font-semibold text-muted-foreground">Tingkat Keyakinan AI (Confidence Score)</Label>
            <span className="font-bold text-foreground">{(projection.confidenceScore * 100).toFixed(0)}%</span>
          </div>
          <Progress value={projection.confidenceScore * 100} className="w-full h-2" />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <BarChart className="h-4 w-4 text-primary"/> Analisis Tren Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-foreground mb-0.5">Tren Omzet</h4>
              <p className="text-muted-foreground">{projection.revenueTrendAnalysis}</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-0.5">Margin Keuntungan</h4>
              <p className="text-muted-foreground">{projection.profitMarginAnalysis}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CheckCircle className="h-4 w-4 text-emerald-600"/> Rekomendasi Bisnis Bakery
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-foreground mb-0.5">Produk Unggulan Terlaris</h4>
              <p className="text-muted-foreground">{projection.topPerformingItems.join(', ')}</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-0.5">Saran & Langkah Tindakan</h4>
              <p className="text-muted-foreground">{projection.recommendations}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FinancialProjectionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [projection, setProjection] = useState<ProjectionResults | null>(null);
  const [aiProjection, setAiProjection] = useState<AiProjectionOutput | null>(null);

  // Form state
  const [projectionPeriod, setProjectionPeriod] = useState('12');
  const [revenueGrowth, setRevenueGrowth] = useState('5');
  const [cogsPercentage, setCogsPercentage] = useState('35');
  const [cogsInflation, setCogsInflation] = useState('3');

  const [startCash, setStartCash] = useState('25000000');
  const [startInventory, setStartInventory] = useState('8000000');
  const [startFixedAssets, setStartFixedAssets] = useState('45000000');
  const [startAccountsPayable, setStartAccountsPayable] = useState('2000000');

  const [opexItems, setOpexItems] = useState<OpexItem[]>(initialOpex);
  const [capexItems, setCapexItems] = useState<CapexItem[]>(initialCapex);

  const handleAddOpex = () => setOpexItems([...opexItems, { id: Date.now(), category: '', amount: '' }]);
  const handleRemoveOpex = (id: number) => setOpexItems(opexItems.filter(item => item.id !== id));
  const handleOpexChange = (id: number, field: 'category' | 'amount', value: string) => {
    setOpexItems(opexItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddCapex = () => setCapexItems([...capexItems, { id: Date.now(), assetName: '', cost: '', purchaseMonth: '', usefulLife: '' }]);
  const handleRemoveCapex = (id: number) => setCapexItems(capexItems.filter(item => item.id !== id));
  const handleCapexChange = (id: number, field: 'assetName' | 'cost' | 'purchaseMonth' | 'usefulLife', value: string) => {
    setCapexItems(capexItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleGenerateProjection = async () => {
    setLoading(true);
    setProjection(null);

    const assumptions: ProjectionAssumptions = {
      projectionPeriod: parseInt(projectionPeriod),
      revenueGrowth: parseFloat(revenueGrowth) / 100,
      cogsPercentage: parseFloat(cogsPercentage) / 100,
      cogsInflation: parseFloat(cogsInflation) / 100,
      startingBalance: {
        cash: parseFloat(startCash),
        inventory: parseFloat(startInventory),
        fixedAssets: parseFloat(startFixedAssets),
        accountsPayable: parseFloat(startAccountsPayable),
      },
      opex: opexItems.map(item => ({ category: item.category, amount: parseFloat(item.amount || '0') })),
      capex: capexItems.map(item => ({
        assetName: item.assetName,
        cost: parseFloat(item.cost || '0'),
        purchaseMonth: parseInt(item.purchaseMonth || '1'),
        usefulLife: parseInt(item.usefulLife || '1'),
      })),
    };

    try {
      const result = await generateFinancialProjection(assumptions);
      setProjection(result);
      toast({ title: 'Berhasil', description: 'Simulasi proyeksi keuangan berhasil dihitung.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal menghitung simulasi proyeksi.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateAiProjection = async () => {
    setAiLoading(true);
    setAiProjection(null);
    try {
      const result = await generateAiProjection();
      setAiProjection(result);
      toast({ title: 'Berhasil', description: 'Proyeksi AI berhasil dihasilkan.' });
    } catch (error) {
      console.error("AI Projection Error:", error);
      toast({ title: 'Gagal', description: 'Gagal menghasilkan proyeksi AI.', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleExport = async () => {
    if (!projection) {
      toast({ title: "Gagal", description: "Tidak ada data proyeksi untuk diekspor.", variant: "destructive" });
      return;
    }
    
    toast({ title: "Mengekspor...", description: "File Excel sedang dipersiapkan." });

    try {
      exportProjectionToExcel(projection);
      toast({ title: "Selesai", description: "File Proyeksi_Keuangan.xlsx berhasil diunduh." });
    } catch (error) {
      console.error("Export failed:", error);
      toast({ title: "Gagal Ekspor", description: "Terjadi kesalahan saat membuat file Excel.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Proyeksi & Simulasi Keuangan Toko</h1>
        <p className="text-xs text-muted-foreground">Rencanakan pertumbuhan bisnis bakery dengan simulasi proyeksi laba rugi dan arus kas.</p>
      </div>
      
      <Tabs defaultValue="manual" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="manual" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Simulasi Proyeksi Manual
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Proyeksi Otomatis (Asisten AI)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">1. Asumsi Dasar Pertumbuhan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Periode Proyeksi</Label>
                <Select value={projectionPeriod} onValueChange={setProjectionPeriod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="12">12 Bulan (1 Tahun)</SelectItem>
                    <SelectItem value="36">36 Bulan (3 Tahun)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Pertumbuhan Omzet (% / bln)</Label>
                <Input type="number" value={revenueGrowth} onChange={e => setRevenueGrowth(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estimasi HPP Bahan (% Omzet)</Label>
                <Input type="number" value={cogsPercentage} onChange={e => setCogsPercentage(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Estimasi Inflasi HPP (% / thn)</Label>
                <Input type="number" value={cogsInflation} onChange={e => setCogsInflation(e.target.value)} className="h-8 text-xs" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">2. Saldo Awal Neraca</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kas / Tabungan Awal (Rp)</Label>
                <Input type="number" value={startCash} onChange={e => setStartCash(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nilai Stok Bahan (Rp)</Label>
                <Input type="number" value={startInventory} onChange={e => setStartInventory(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nilai Mesin & Peralatan (Rp)</Label>
                <Input type="number" value={startFixedAssets} onChange={e => setStartFixedAssets(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Utang Usaha / Supplier (Rp)</Label>
                <Input type="number" value={startAccountsPayable} onChange={e => setStartAccountsPayable(e.target.value)} className="h-8 text-xs" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleGenerateProjection} disabled={loading} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm w-full sm:w-auto">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Hitung Simulasi Proyeksi
            </Button>
          </div>

          {projection && (
            <Card className="border border-border shadow-sm bg-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pb-2 border-b border-border/60">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Hasil Simulasi Proyeksi</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Tabel proyeksi laba rugi dan arus kas per bulan</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs font-semibold border-border">
                  <FileDown className="mr-1.5 h-3.5 w-3.5"/> Ekspor Excel
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="[&_th]:py-2 [&_th]:text-xs">
                        <TableHead>Bulan</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">HPP Bahan</TableHead>
                        <TableHead className="text-right">Laba Kotor</TableHead>
                        <TableHead className="text-right">Beban OPEX</TableHead>
                        <TableHead className="text-right">Laba Bersih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.incomeStatement.map((row, index) => (
                        <TableRow key={index} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2">
                          <TableCell className="font-semibold text-foreground whitespace-nowrap">Bulan {row.month}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(row.cogs)}</TableCell>
                          <TableCell className="text-right font-bold text-foreground">{formatCurrency(row.grossProfit)}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">{formatCurrency(row.totalOPEX)}</TableCell>
                          <TableCell className="text-right font-black text-emerald-600">{formatCurrency(row.netIncome)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">Proyeksi Otomatis AI</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Gunakan asisten AI untuk menganalisis data riwayat penjualan dan menyusun ramalan performa 30 hari ke depan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Button onClick={handleGenerateAiProjection} disabled={aiLoading} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                {aiLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <><Bot className="mr-1.5 h-3.5 w-3.5" /> Jalankan Proyeksi AI</>}
              </Button>
            </CardContent>
          </Card>

          {aiLoading && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 rounded-lg border border-dashed border-border bg-card">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <h3 className="text-sm font-bold text-foreground">AI sedang menganalisis data toko roti...</h3>
              <p className="text-xs text-muted-foreground mt-1">Membaca tren penjualan, margin menu terlaris, dan proyeksi omzet.</p>
            </div>
          )}
          
          {aiProjection && <AiProjectionDisplay projection={aiProjection}/>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
