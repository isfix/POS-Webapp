'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export type TopItem = {
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
};

type TopItemsCardProps = {
    items: TopItem[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export function TopItemsCard({ items }: TopItemsCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>This week's most popular items by quantity sold.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader className="bg-accent">
                        <TableRow className="[&_th:not(:last-child)]:border-r">
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    No sales data for this week.
                                </TableCell>
                            </TableRow>
                        )}
                        {items.map((item, index) => (
                            <TableRow key={item.name} className="[&_td:not(:last-child)]:border-r">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                                        <span className="truncate">{item.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.profit)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
