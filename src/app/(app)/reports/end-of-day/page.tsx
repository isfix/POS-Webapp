'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Banknote, QrCode, ShoppingCart, DollarSign } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';

type DailySummary = {
    date: string;
    totalSales: number;
    totalOrders: number;
    totalCashSales: number;
    totalQrisSales: number;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};


export default function EndOfDayReportPage() {
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const q = query(collection(db, 'orders'), where('timestamp', '>=', start), where('timestamp', '<=', end));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalSales = 0;
            let totalCashSales = 0;
            let totalQrisSales = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                totalSales += data.total;
                if (data.paymentMethod === 'cash') {
                    totalCashSales += data.total;
                } else if (data.paymentMethod === 'qris') {
                    totalQrisSales += data.total;
                }
            });

            setSummary({
                date: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                totalSales,
                totalOrders: snapshot.size,
                totalCashSales,
                totalQrisSales,
            });
            setLoading(false);
        }, (error) => {
            console.error("Error fetching end of day report: ", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, []);

    const handleExport = () => {
        if (!summary) {
            toast({ title: 'No Data', description: 'There is no summary to export.', variant: 'default' });
            return;
        }

        toast({ title: 'Exporting...', description: 'Your Excel file is being generated.' });

        const dataToExport = [
            ["End of Day Report", summary.date],
            [],
            ["Metric", "Value"],
            ["Total Sales", summary.totalSales],
            ["Total Orders", summary.totalOrders],
            ["Cash Sales", summary.totalCashSales],
            ["QRIS Sales", summary.totalQrisSales]
        ];

        const ws = xlsx.utils.aoa_to_sheet(dataToExport);

        ws['!cols'] = [{ wch: 25 }, { wch: 25 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        
        const range = xlsx.utils.decode_range(ws['!ref']!);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = xlsx.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                ws[cellRef].s = {
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: "DDDDDD" } },
                        bottom: { style: 'thin', color: { rgb: "DDDDDD" } },
                        left: { style: 'thin', color: { rgb: "DDDDDD" } },
                        right: { style: 'thin', color: { rgb: "DDDDDD" } },
                    }
                };

                if (C === 1 && (R === 3 || R === 5 || R === 6)) {
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = '"Rp"#,##0';
                    ws[cellRef].s.alignment.horizontal = 'right';
                }
                 if(C === 0) {
                    ws[cellRef].s.alignment.horizontal = 'left';
                }

                if (R === 0) {
                    ws[cellRef].s = { 
                        ...ws[cellRef].s,
                        alignment: { ...ws[cellRef].s.alignment, horizontal: 'center'},
                        font: { bold: true, sz: 16 },
                        fill: { fgColor: { rgb: "FCE4D6" } } // light orange
                    };
                } else if (R === 2) {
                    ws[cellRef].s = { 
                        ...ws[cellRef].s,
                        font: { bold: true },
                        fill: { fgColor: { rgb: "FCE4D6" } }
                    };
                    if(C === 0) ws[cellRef].s.alignment.horizontal = 'center';
                }
            }
        }
        
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "End of Day Report");
        xlsx.writeFile(wb, `BrewFlow_EOD_Report_${summary.date.replace(/, /g, '_').replace(/ /g, '_')}.xlsx`);
    };

    if (loading) {
        return (
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                   {Array.from({length: 4}).map((_, i) => (
                     <Card key={i}>
                        <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
                        <CardContent><Skeleton className="h-8 w-32" /></CardContent>
                    </Card>
                   ))}
                </div>
            </div>
        )
    }

    if (!summary) return null;


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">End of Day Report</h1>
                    <p className="text-muted-foreground">Summary for {summary.date}</p>
                </div>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{summary.totalOrders}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalCashSales)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">QRIS Sales</CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalQrisSales)}</p></CardContent>
                </Card>
            </div>
        </div>
    )
}
