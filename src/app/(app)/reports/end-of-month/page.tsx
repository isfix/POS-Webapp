'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Banknote, QrCode } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartTooltipContent, ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';

type MonthlyData = {
    date: string;
    sales: number;
};

type MonthlySummary = {
    totalSales: number;
    totalCashSales: number;
    totalQrisSales: number;
    busiestDay: { day: string, sales: number };
};

const chartConfig = {
    sales: {
      label: 'Sales',
      color: 'hsl(var(--primary))',
    },
} satisfies ChartConfig;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

const formatChartCurrency = (value: number) => `Rp ${Math.floor(value / 1000)}k`;

export default function EndOfMonthReportPage() {
    const [chartData, setChartData] = useState<MonthlyData[]>([]);
    const [summary, setSummary] = useState<MonthlySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        const q = query(collection(db, 'orders'), where('timestamp', '>=', monthStart), where('timestamp', '<=', monthEnd));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const dailySales: Record<string, number> = {};
            daysInMonth.forEach(day => {
                dailySales[format(day, 'dd')] = 0;
            });

            let totalSales = 0;
            let totalCashSales = 0;
            let totalQrisSales = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const orderDate = (data.timestamp as Timestamp).toDate();
                const dayOfMonth = format(orderDate, 'dd');
                if (dailySales[dayOfMonth] !== undefined) {
                    dailySales[dayOfMonth] += data.total;
                }
                totalSales += data.total;
                if (data.paymentMethod === 'cash') {
                    totalCashSales += data.total;
                } else if (data.paymentMethod === 'qris') {
                    totalQrisSales += data.total;
                }
            });

            const newChartData = Object.entries(dailySales).map(([date, sales]) => ({ date, sales }));
            setChartData(newChartData);

            const busiest = Object.entries(dailySales).reduce((busiest, [date, sales]) => {
                if (sales > busiest.sales) {
                    const fullDate = new Date(today.getFullYear(), today.getMonth(), parseInt(date));
                    return { day: format(fullDate, 'eeee'), sales };
                }
                return busiest;
            }, { day: 'N/A', sales: 0 });

            setSummary({ totalSales, totalCashSales, totalQrisSales, busiestDay: busiest });
            setLoading(false);
        }, (error) => {
            console.error("Error fetching end of month report: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleExport = () => {
        if (!summary || chartData.length === 0) {
            toast({ title: 'No Data', description: 'There is no summary data to export.', variant: 'default' });
            return;
        }
        toast({ title: 'Exporting...', description: 'Your Excel file is being generated.' });
        
        const wb = xlsx.utils.book_new();
        const headerColor = "E2EFDA"; // Light Green
        
        // --- Sheet 1: Summary ---
        const summaryData = [
            ["End of Month Report", format(new Date(), 'MMMM yyyy')],
            [],
            ["Metric", "Value"],
            ["Total Sales", summary.totalSales],
            ["Total Cash Sales", summary.totalCashSales],
            ["Total QRIS Sales", summary.totalQrisSales],
            ["Busiest Day", summary.busiestDay.day],
            ["Busiest Day Sales", summary.busiestDay.sales]
        ];
        const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 25 }];
        wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
        
        const styleSheet = (ws: xlsx.WorkSheet, color: string) => {
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
                    
                    const isHeaderRow = (R === 0 && ws['!merges']?.find(m => m.s.r === R)) ||
                                        (ws[cellRef].v && ['Metric', 'Value', 'Date', 'Sales'].includes(ws[cellRef].v));

                    if (isHeaderRow) {
                         ws[cellRef].s = { 
                            ...ws[cellRef].s,
                            font: { bold: true, sz: R === 0 ? 16 : 12 },
                            fill: { fgColor: { rgb: color } }
                        };
                    }
                }
             }
        };

        styleSheet(wsSummary, headerColor);

        for (let R = 3; R <= 7; R++) {
            const labelCell = xlsx.utils.encode_cell({c: 0, r: R});
            if(wsSummary[labelCell]) wsSummary[labelCell].s.alignment.horizontal = 'left';
            
            const valueCell = xlsx.utils.encode_cell({c: 1, r: R});
            if (wsSummary[valueCell] && [3,4,5,7].includes(R)) {
                wsSummary[valueCell].t = 'n';
                wsSummary[valueCell].z = '"Rp"#,##0';
                wsSummary[valueCell].s.alignment.horizontal = 'right';
            }
        }
        xlsx.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");

        // --- Sheet 2: Daily Sales Data ---
        const dailyData = chartData.map(d => ({ "Date": d.date, "Sales": d.sales }));
        const wsDaily = xlsx.utils.json_to_sheet(dailyData);
        wsDaily['!cols'] = [{ wch: 15 }, { wch: 25 }];
        styleSheet(wsDaily, headerColor);
        
        const rangeDaily = xlsx.utils.decode_range(wsDaily['!ref']!);
        for (let R = rangeDaily.s.r + 1; R <= rangeDaily.e.r; ++R) {
            const cell_address = {c: 1, r: R};
            const cell_ref = xlsx.utils.encode_cell(cell_address);
            if (wsDaily[cell_ref]) {
                wsDaily[cell_ref].t = 'n';
                wsDaily[cell_ref].z = '"Rp"#,##0';
                wsDaily[cell_ref].s.alignment.horizontal = 'right';
            }
        }
        xlsx.utils.book_append_sheet(wb, wsDaily, "Daily Sales Data");

        xlsx.writeFile(wb, `BrewFlow_EOM_Report_${format(new Date(), 'yyyy-MM')}.xlsx`);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-72 mt-2" />
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
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48 mt-1" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-[350px] w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">End of Month Report</h1>
                    <p className="text-muted-foreground">Aggregated daily data for a monthly overview.</p>
                </div>
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader><CardTitle>Total Sales</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{summary ? formatCurrency(summary.totalSales) : '...'}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Cash Sales</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{summary ? formatCurrency(summary.totalCashSales) : '...'}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>QRIS Sales</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{summary ? formatCurrency(summary.totalQrisSales) : '...'}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Busiest Day</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold">{summary?.busiestDay.day}</p>
                        <p className="text-sm text-muted-foreground">{summary ? formatCurrency(summary.busiestDay.sales) : '...'} in sales</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daily Sales Trend</CardTitle>
                    <CardDescription>Sales performance throughout the month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <BarChart accessibilityLayer data={chartData}>
                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toString().padStart(2, '0')} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatChartCurrency} />
                            <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)}/>} />
                            <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
