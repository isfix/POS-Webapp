
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon, Banknote, QrCode } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type Sale = {
    id: string;
    time: string;
    item: string;
    amount: number;
    paymentMethod: 'cash' | 'qris';
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function DailySalesPage() {
    const [date, setDate] = useState<Date>(new Date());
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const start = startOfDay(date);
        const end = endOfDay(date);

        const q = query(collection(db, 'orders'), where('timestamp', '>=', start), where('timestamp', '<=', end));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSales: Sale[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedSales.push({
                    id: doc.id,
                    time: (data.timestamp as Timestamp).toDate().toLocaleTimeString(),
                    item: data.items.map((item: any) => item.name).join(', '),
                    amount: data.total,
                    paymentMethod: data.paymentMethod,
                });
            });
            setSales(fetchedSales.sort((a,b) => b.time.localeCompare(a.time)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching daily sales: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [date]);

    const handleExport = () => {
        if (sales.length === 0) {
            toast({ title: 'No Data', description: 'There are no sales to export for the selected date.', variant: 'default' });
            return;
        }

        toast({ title: 'Exporting...', description: 'Your Excel file is being generated.' });
        
        const dataToExport = sales.map(sale => ({
            "Transaction ID": sale.id,
            "Time": sale.time,
            "Items": sale.item,
            "Payment Method": sale.paymentMethod,
            "Amount": sale.amount,
        }));

        const ws = xlsx.utils.json_to_sheet(dataToExport, {
            header: ["Transaction ID", "Time", "Items", "Payment Method", "Amount"],
        });

        const range = xlsx.utils.decode_range(ws['!ref']!);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cell_address = {c: 4, r: R}; // Amount column
            const cell_ref = xlsx.utils.encode_cell(cell_address);
            if (ws[cell_ref]) {
                ws[cell_ref].t = 'n';
                ws[cell_ref].z = '"Rp"#,##0';
            }
        }
        
        const colWidths = Object.keys(dataToExport[0]).map((key, i) => {
             const dataForCol = dataToExport.map(row => String(row[key as keyof typeof row]));
             const header = ["Transaction ID", "Time", "Items", "Payment Method", "Amount"][i];
             const maxLength = Math.max(
                (header || '').toString().length,
                ...dataForCol.map(cell => cell.length)
             );
             return { wch: maxLength + 4 };
        });
        if (colWidths[0]) colWidths[0].wch = 20; // Transaction ID
        if (colWidths[2]) colWidths[2].wch = 50; // Items
        ws['!cols'] = colWidths;
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = xlsx.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                const defaultStyle = {
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        top: { style: 'thin', color: { rgb: "DDDDDD" } },
                        bottom: { style: 'thin', color: { rgb: "DDDDDD" } },
                        left: { style: 'thin', color: { rgb: "DDDDDD" } },
                        right: { style: 'thin', color: { rgb: "DDDDDD" } },
                    }
                };
                
                if (R === 0) {
                     ws[cellRef].s = {
                        ...defaultStyle,
                        font: { bold: true },
                        fill: { fgColor: { rgb: "D9E1F2" } } // A light blue
                     };
                } else {
                    ws[cellRef].s = defaultStyle;
                    if(C === 4) { // Right align Amount column
                       ws[cellRef].s.alignment.horizontal = 'right';
                    }
                }
            }
        }

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Daily Sales");
        xlsx.writeFile(wb, `BrewFlow_DailySales_${date.toISOString().split('T')[0]}.xlsx`);
    };

    const renderTableBody = () => {
        if (loading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-md" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
            ));
        }

        if (sales.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        No sales for the selected date.
                    </TableCell>
                </TableRow>
            );
        }

        return sales.map(sale => (
            <TableRow key={sale.id} className="[&_td:not(:last-child)]:border-r">
                <TableCell className="font-mono text-xs">{sale.id}</TableCell>
                <TableCell>{sale.time}</TableCell>
                <TableCell className="font-medium max-w-xs truncate">{sale.item}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                         {sale.paymentMethod === 'cash' ? <Banknote className="h-4 w-4 text-muted-foreground"/> : <QrCode className="h-4 w-4 text-muted-foreground"/>}
                         <span className="capitalize">{sale.paymentMethod}</span>
                    </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(sale.amount)}</TableCell>
            </TableRow>
        ));
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Daily Sales History</h1>
                    <p className="text-muted-foreground">A chronological list of all transactions for a selected day.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start md:w-auto">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date.toLocaleDateString()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar 
                                mode="single" 
                                selected={date} 
                                onSelect={(d) => d && setDate(d)} 
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                        <Table>
                            <TableHeader className="bg-accent">
                                <TableRow className="[&_th:not(:last-child)]:border-r">
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Payment Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderTableBody()}
                            </TableBody>
                        </Table>
                         <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
