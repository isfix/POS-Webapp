'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { subDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { generateFinancialStatements, type FinancialStatementResults } from '@/actions/financials';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

function StatementRow({ label, value, isSub, isTotal, isNegative, isHeader }: { label: string; value: string | number; isSub?: boolean; isTotal?: boolean; isNegative?: boolean; isHeader?: boolean }) {
    return (
        <TableRow className={cn("[&_td:not(:last-child)]:border-r", isHeader ? "bg-accent" : "")}>
            <TableCell className={`
                ${isSub ? 'pl-10' : ''} 
                ${isTotal || isHeader ? 'font-bold' : ''}
                whitespace-nowrap
            `}>
                {label}
            </TableCell>
            <TableCell className={`text-right font-mono whitespace-nowrap ${isTotal ? 'font-bold border-t-2' : ''} ${isNegative ? 'text-destructive' : ''}`}>
                {typeof value === 'number' ? formatCurrency(value) : value}
            </TableCell>
        </TableRow>
    )
}

function PnLStatement({ data }: { data: FinancialStatementResults['profitAndLoss'] }) {
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader className="bg-accent">
                    <TableRow className="[&_th:not(:last-child)]:border-r">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount (IDR)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <StatementRow label="Revenue" value={data.revenue} isHeader />
                    <StatementRow label="Cost of Goods Sold (COGS)" value={data.cogs} isSub isNegative />
                    <StatementRow label="Gross Profit" value={data.grossProfit} isTotal />
                    
                    <StatementRow label="Operating Expenses" value="" isHeader />
                    {data.expenses.map(exp => (
                        <StatementRow key={exp.category} label={exp.category} value={exp.total} isSub isNegative />
                    ))}
                    <StatementRow label="Total Operating Expenses" value={data.totalExpenses} isSub isTotal isNegative/>
                    
                    <StatementRow label="Depreciation" value={data.depreciation} isSub isNegative/>

                    <StatementRow label="Operating Income (EBIT)" value={data.operatingIncome} isTotal />
                    
                    <StatementRow label="Taxes" value={data.taxes} isSub isNegative/>
                    
                    <StatementRow label="Net Income" value={data.netIncome} isTotal />

                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}

function CashFlowStatement({ data }: { data: FinancialStatementResults['cashFlow'] }) {
    return (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
             <Table>
                <TableHeader className="bg-accent">
                    <TableRow className="[&_th:not(:last-child)]:border-r">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount (IDR)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <StatementRow label="Net Income" value={data.netIncome} isHeader />
                    <StatementRow label="Adjustments to Reconcile Net Income to Net Cash" value="" isHeader />
                    <StatementRow label="Depreciation" value={data.depreciation} isSub />
                    <StatementRow label="Net Cash from Operating Activities" value={data.cashFromOperations} isTotal />
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
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
            toast({ title: 'Error', description: 'Please select a valid date range.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        setStatements(null);

        try {
            const result = await generateFinancialStatements(dateRange.from, dateRange.to);
            setStatements(result);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate financial statements.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Financial Statements</h1>
                    <p className="text-muted-foreground">Generate P&L, Cash Flow, and Balance Sheet reports.</p>
                </div>
                <Button disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Export Full Statements
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Report Period</CardTitle>
                    <CardDescription>Select the date range for the financial statements.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                    <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Report
                    </Button>
                </CardContent>
            </Card>

            {statements && (
                <Tabs defaultValue="pnl">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
                        <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
                        <TabsTrigger value="balance-sheet" disabled>Balance Sheet</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pnl" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profit & Loss Statement</CardTitle>
                                <CardDescription>
                                    For the period of {format(new Date(statements.period.start), 'PP')} to {format(new Date(statements.period.end), 'PP')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                               <PnLStatement data={statements.profitAndLoss} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="cash-flow" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Statement of Cash Flows</CardTitle>
                                <CardDescription>
                                    For the period of {format(new Date(statements.period.start), 'PP')} to {format(new Date(statements.period.end), 'PP')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CashFlowStatement data={statements.cashFlow} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="balance-sheet" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Balance Sheet</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Feature in Development</AlertTitle>
                                    <AlertDescription>
                                        Generating a full balance sheet requires tracking cash accounts, loans, and equity which is not yet available. This feature is planned for a future update.
                                    </AlertDescription>
                            </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
