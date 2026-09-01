'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { subDays, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { generateFinancialStatements, type FinancialStatementResults } from '@/actions/financials';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import * as xlsx from 'xlsx';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

function StatementRow({ label, value, isSub, isTotal, isNegative, isHeader }: { label: string; value: string | number; isSub?: boolean; isTotal?: boolean; isNegative?: boolean; isHeader?: boolean }) {
  return (
    <TableRow className={cn("text-xs hover:bg-muted/40 transition-colors [&_td]:py-2", isHeader ? "bg-muted/60 font-bold" : "")}>
      <TableCell className={cn(
        isSub ? 'pl-6 text-muted-foreground' : '',
        isTotal || isHeader ? 'font-bold text-foreground' : 'text-foreground',
        'whitespace-nowrap'
      )}>
        {label}
      </TableCell>
      <TableCell className={cn(
        'text-right font-mono whitespace-nowrap',
        isTotal ? 'font-black border-t-2 border-border text-foreground' : '',
        isNegative ? 'text-destructive font-semibold' : 'text-foreground'
      )}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </TableCell>
    </TableRow>
  );
}

function PnLStatement({ data }: { data: FinancialStatementResults['profitAndLoss'] }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="[&_th]:py-2 [&_th]:text-xs">
            <TableHead>Pos Laporan Keuangan</TableHead>
            <TableHead className="text-right">Nominal (Rp)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <StatementRow label="Pendapatan Penjualan Bersih (Omzet)" value={data.revenue} isHeader />
          <StatementRow label="Beban Pokok Penjualan (HPP Bahan Roti)" value={-data.cogs} isSub isNegative />
          <StatementRow label="Laba Kotor (Gross Profit)" value={data.grossProfit} isTotal />
          
          <StatementRow label="Beban Operasional Toko (OPEX)" value="" isHeader />
          {data.expenses.map(exp => (
            <StatementRow key={exp.category} label={exp.category} value={-exp.total} isSub isNegative />
          ))}
          <StatementRow label="Total Beban Operasional" value={-data.totalExpenses} isSub isTotal isNegative/>
          
          <StatementRow label="Biaya Depresiasi Mesin & Peralatan" value={-data.depreciation} isSub isNegative/>

          <StatementRow label="Laba Operasional (EBIT)" value={data.operatingIncome} isTotal />
          
          <StatementRow label="Pajak Penghasilan" value={-data.taxes} isSub isNegative/>
          
          <StatementRow label="Laba Bersih Akhir (Net Income)" value={data.netIncome} isTotal />
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function CashFlowStatement({ data }: { data: FinancialStatementResults['cashFlow'] }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="[&_th]:py-2 [&_th]:text-xs">
            <TableHead>Arus Kas Operasional</TableHead>
            <TableHead className="text-right">Nominal (Rp)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <StatementRow label="Laba Bersih Periode Ini" value={data.netIncome} isHeader />
          <StatementRow label="Penyesuaian Non-Kas" value="" isHeader />
          <StatementRow label="Penyusutan / Depresiasi Aset" value={data.depreciation} isSub />
          <StatementRow label="Arus Kas Bersih dari Operasional" value={data.cashFromOperations} isTotal />
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default function FinancialStatementsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState<FinancialStatementResults | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const handleGenerate = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ title: 'Perhatian', description: 'Silakan pilih rentang tanggal yang valid.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setStatements(null);

    try {
      const result = await generateFinancialStatements(dateRange.from, dateRange.to);
      setStatements(result);
      toast({ title: 'Berhasil', description: 'Laporan keuangan berhasil dibuat.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal menyusun laporan keuangan.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportStatements = () => {
    if (!statements) return;

    toast({ title: 'Mengekspor...', description: 'File Excel sedang dipersiapkan.' });

    const pnl = statements.profitAndLoss;
    const dataToExport = [
      ["Laporan Laba Rugi"],
      [`Periode: ${format(new Date(statements.period.start), 'd MMM yyyy', { locale: idLocale })} s/d ${format(new Date(statements.period.end), 'd MMM yyyy', { locale: idLocale })}`],
      [],
      ["Pos Keuangan", "Nominal (Rp)"],
      ["Pendapatan Bersih (Omzet)", pnl.revenue],
      ["HPP Bahan Baku", -pnl.cogs],
      ["Laba Kotor", pnl.grossProfit],
      ...pnl.expenses.map(e => [e.category, -e.total]),
      ["Total Biaya Operasional", -pnl.totalExpenses],
      ["Penyusutan Peralatan", -pnl.depreciation],
      ["Laba Operasional", pnl.operatingIncome],
      ["Laba Bersih Akhir", pnl.netIncome],
    ];

    const ws = xlsx.utils.aoa_to_sheet(dataToExport);
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Laba Rugi");
    xlsx.writeFile(wb, `Laporan_Laba_Rugi_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Laporan Laba Rugi & Keuangan</h1>
          <p className="text-xs text-muted-foreground">Hitung omzet, HPP modal resep, beban operasional, dan laba bersih toko roti.</p>
        </div>
        {statements && (
          <Button onClick={handleExportStatements} size="sm" variant="outline" className="h-8 text-xs font-semibold border-border">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Ekspor Excel
          </Button>
        )}
      </div>
      
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">Periode Laporan Keuangan</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Tentukan rentang tanggal transaksi yang ingin dihitung</CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button onClick={handleGenerate} disabled={loading} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm w-full sm:w-auto">
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Hitung Laporan
          </Button>
        </CardContent>
      </Card>

      {statements && (
        <Tabs defaultValue="pnl" className="space-y-3">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/80 p-1 border border-border">
            <TabsTrigger value="pnl" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              Laporan Laba Rugi (P&L)
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
              Laporan Arus Kas (Cash Flow)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pnl">
            <Card className="border border-border shadow-sm bg-card">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-sm font-bold text-foreground">Laporan Laba Rugi Toko Roti</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Periode {format(new Date(statements.period.start), 'd MMMM yyyy', { locale: idLocale })} s/d {format(new Date(statements.period.end), 'd MMMM yyyy', { locale: idLocale })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <PnLStatement data={statements.profitAndLoss} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash-flow">
            <Card className="border border-border shadow-sm bg-card">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-sm font-bold text-foreground">Laporan Arus Kas Operasional</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Periode {format(new Date(statements.period.start), 'd MMMM yyyy', { locale: idLocale })} s/d {format(new Date(statements.period.end), 'd MMMM yyyy', { locale: idLocale })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <CashFlowStatement data={statements.cashFlow} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
