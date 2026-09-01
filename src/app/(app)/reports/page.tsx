import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, ArrowRight, Calendar, Clock, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Laporan Keuangan & Penjualan</h1>
        <p className="text-xs text-muted-foreground">Pilih jenis laporan yang ingin Anda lihat atau cetak ke format Excel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/reports/daily-sales" className="group">
          <Card className="h-full border border-border hover:border-primary/60 hover:shadow-md transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Riwayat Transaksi Harian</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Daftar struk transaksi penjualan kasir secara kronologis per jam dan per hari.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reports/end-of-day" className="group">
          <Card className="h-full border border-border hover:border-primary/60 hover:shadow-md transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Tutup Kasir Harian (End of Day)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ringkasan rekonsiliasi kas masuk, total uang tunai, dan pembayaran non-tunai QRIS hari ini.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reports/end-of-month" className="group">
          <Card className="h-full border border-border hover:border-primary/60 hover:shadow-md transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Rekap Penjualan Bulanan (End of Month)</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Grafik performa omzet harian sepanjang bulan berjalan serta hari penjualan tertinggi.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/reports/financial-statements" className="group">
          <Card className="h-full border border-border hover:border-primary/60 hover:shadow-md transition-all">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Laporan Laba Rugi & Arus Kas</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Laporan komprehensif pendapatan, HPP modal, beban operasional, dan laba bersih bakery.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
