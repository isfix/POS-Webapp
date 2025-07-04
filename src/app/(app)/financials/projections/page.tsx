
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

const initialOpex: OpexItem[] = [{ id: 1, category: 'Rent', amount: '22500000' }];
const initialCapex: CapexItem[] = [{ id: 1, assetName: 'New Espresso Machine', cost: '75000000', purchaseMonth: '3', usefulLife: '5' }];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
}

function AiProjectionDisplay({ projection }: { projection: AiProjectionOutput }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Projection Summary (Next 30 Days)</CardTitle>
                    <CardDescription>Based on historical data from the last 90 days.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(projection.projectedRevenue)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Projected Profit</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(projection.projectedProfit)}</div>
                        </CardContent>
                    </Card>
                </CardContent>
                 <CardContent>
                    <Label className="text-sm font-medium">Confidence Score</Label>
                    <div className="flex items-center gap-2">
                         <Progress value={projection.confidenceScore * 100} className="w-full" />
                         <span className="text-sm font-bold">{(projection.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                     <p className="text-xs text-muted-foreground mt-1">How confident the AI is in this projection.</p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><BarChart className="h-5 w-5"/> Trend Analysis</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4 text-sm">
                         <div>
                            <h4 className="font-semibold mb-1">Revenue Trend</h4>
                            <p className="text-muted-foreground">{projection.revenueTrendAnalysis}</p>
                         </div>
                         <div>
                            <h4 className="font-semibold mb-1">Profit Margin Analysis</h4>
                            <p className="text-muted-foreground">{projection.profitMarginAnalysis}</p>
                         </div>
                     </CardContent>
                </Card>
                 <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle className="h-5 w-5"/> Recommendations</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4 text-sm">
                         <div>
                            <h4 className="font-semibold mb-1">Top Performing Items</h4>
                             <p className="text-muted-foreground">{projection.topPerformingItems.join(', ')}</p>
                         </div>
                         <div>
                            <h4 className="font-semibold mb-1">Actionable Advice</h4>
                            <p className="text-muted-foreground">{projection.recommendations}</p>
                         </div>
                     </CardContent>
                </Card>
            </div>
        </div>
    )
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
    const [cogsPercentage, setCogsPercentage] = useState('30');
    const [cogsInflation, setCogsInflation] = useState('2');

    const [startCash, setStartCash] = useState('150000000');
    const [startInventory, setStartInventory] = useState('30000000');
    const [startFixedAssets, setStartFixedAssets] = useState('120000000');
    const [startAccountsPayable, setStartAccountsPayable] = useState('7500000');

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
            opex: opexItems.map(item => ({ category: item.category, amount: parseFloat(item.amount) })),
            capex: capexItems.map(item => ({
                assetName: item.assetName,
                cost: parseFloat(item.cost),
                purchaseMonth: parseInt(item.purchaseMonth),
                usefulLife: parseInt(item.usefulLife),
            })),
        };

        try {
            const result = await generateFinancialProjection(assumptions);
            setProjection(result);
            toast({ title: 'Success', description: 'Financial projection generated successfully.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate projection.', variant: 'destructive' });
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
            toast({ title: 'Success', description: 'AI projection generated successfully.' });
        } catch (error)
        {
            console.error("AI Projection Error:", error);
            toast({ title: 'Error', description: 'Failed to generate AI projection.', variant: 'destructive' });
        } finally {
            setAiLoading(false);
        }
    }

    const handleExport = async () => {
        if (!projection) {
            toast({ title: "Error", description: "No projection data to export.", variant: "destructive" });
            return;
        }
        
        toast({ title: "Exporting...", description: "Your Excel file is being generated." });

        try {
            const base64 = await exportProjectionToExcel(projection);
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'BrewFlow_Financial_Projection.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed:", error);
            toast({ title: "Export Failed", description: "Could not generate the Excel file.", variant: "destructive" });
        }
    };

    const renderProjectionTable = (data: { month: number; [key: string]: number }[], headers: string[]) => (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="[&_th:not(:last-child)]:border-r">
                        {headers.map(header => <TableHead key={header} className={header.toLowerCase() !== 'month' ? 'text-right whitespace-nowrap' : 'whitespace-nowrap'}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} className="[&_td:not(:last-child)]:border-r">
                            {headers.map(header => (
                                <TableCell key={header} className={header.toLowerCase() !== 'month' ? 'text-right whitespace-nowrap' : 'whitespace-nowrap'}>
                                    {header.toLowerCase() === 'month' ? `Month ${row[header.toLowerCase()]}` : (formatCurrency(row[header.toLowerCase()]))}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
    
    const formatBalanceSheetData = (bs: ProjectionResults['balanceSheet']) => {
        const months = bs.assets.map(a => a.month);
        const data: any[] = [];
        
        const itemsConfig: {label: string, isHeader?: boolean, isTotal?: boolean, isFinalTotal?: boolean, getValue: (month: number) => number | undefined}[] = [
            { label: '--- ASSETS ---', isHeader: true, getValue: () => undefined },
            { label: 'Cash', getValue: (m) => bs.assets.find(d => d.month === m)?.value },
            { label: 'Inventory', getValue: (m) => bs.inventory.find(d => d.month === m)?.value },
            { label: 'Fixed Assets, Net', getValue: (m) => bs.fixedAssets.find(d => d.month === m)?.value },
            { label: 'Total Assets', isTotal: true, getValue: (m) => bs.totalAssets.find(d => d.month === m)?.value },
            { label: '--- LIABILITIES & EQUITY ---', isHeader: true, getValue: () => undefined },
            { label: 'Accounts Payable', getValue: (m) => bs.accountsPayable.find(d => d.month === m)?.value },
            { label: 'Total Liabilities', isTotal: true, getValue: (m) => bs.totalLiabilities.find(d => d.month === m)?.value },
            { label: 'Retained Earnings', getValue: (m) => bs.retainedEarnings.find(d => d.month === m)?.value },
            { label: 'Total Equity', isTotal: true, getValue: (m) => bs.totalEquity.find(d => d.month === m)?.value },
            { label: 'Total Liabilities & Equity', isTotal: true, isFinalTotal: true, getValue: (m) => bs.totalLiabilitiesAndEquity.find(d => d.month === m)?.value },
        ];

        itemsConfig.forEach(item => {
            const row: any = { item: item.label, isHeader: item.isHeader, isTotal: item.isTotal, isFinalTotal: item.isFinalTotal };
            months.forEach(month => {
                const value = item.getValue(month);
                row[`month_${month}`] = value !== undefined ? value : (item.isHeader ? '' : 0);
            });
            data.push(row);
        });

        return { months, data };
    };
    
    const renderBalanceSheet = (bs: ProjectionResults['balanceSheet']) => {
        const { months, data } = formatBalanceSheetData(bs);
        return (
             <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="[&_th:not(:last-child)]:border-r">
                            <TableHead className="whitespace-nowrap">Item</TableHead>
                            {months.map(m => <TableHead key={m} className="text-right whitespace-nowrap">Month {m}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} className={cn("[&_td:not(:last-child)]:border-r", row.isHeader ? "bg-muted/50 font-bold" : "")}>
                            <TableCell className={`${row.isTotal ? "font-bold" : ""} whitespace-nowrap`}>{row.item}</TableCell>
                            {months.map(m => (
                                <TableCell key={m} className={`text-right whitespace-nowrap ${row.isTotal ? 'font-bold' : ''} ${row.isFinalTotal ? 'border-t-2 border-primary' : ''}`}>
                                    {typeof row[`month_${m}`] === 'number' 
                                        ? formatCurrency(row[`month_${m}`])
                                        : row[`month_${m}`]
                                    }
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                 <ScrollBar orientation="horizontal" />
             </ScrollArea>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Financial Projections</h1>
                <p className="text-muted-foreground">Define assumptions for a manual projection or generate one automatically using AI.</p>
            </div>
            
             <Tabs defaultValue="manual">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Projection</TabsTrigger>
                    <TabsTrigger value="ai">AI-Powered Projection</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-6 mt-6">
                     <Card>
                        <CardHeader><CardTitle>1. General Assumptions</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label>Projection Period</Label>
                                <Select value={projectionPeriod} onValueChange={setProjectionPeriod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="12">12 Months</SelectItem>
                                        <SelectItem value="36">3 Years</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Projected Monthly Sales Growth (%)</Label>
                                <Input type="number" value={revenueGrowth} onChange={e => setRevenueGrowth(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Baseline COGS (% of Revenue)</Label>
                                <Input type="number" value={cogsPercentage} onChange={e => setCogsPercentage(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Expected Yearly COGS Inflation (%)</Label>
                                <Input type="number" value={cogsInflation} onChange={e => setCogsInflation(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>2. Starting Balance Sheet (Current)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label>Cash (Rp)</Label>
                                <Input type="number" value={startCash} onChange={e => setStartCash(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Inventory (Rp)</Label>
                                <Input type="number" value={startInventory} onChange={e => setStartInventory(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Fixed Assets (Net) (Rp)</Label>
                                <Input type="number" value={startFixedAssets} onChange={e => setStartFixedAssets(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Accounts Payable (Rp)</Label>
                                <Input type="number" value={startAccountsPayable} onChange={e => setStartAccountsPayable(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>3. Monthly Operating Expenses (OPEX)</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleAddOpex}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Expense Category</TableHead><TableHead>Amount (Rp)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {opexItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell><Input value={item.category} onChange={e => handleOpexChange(item.id, 'category', e.target.value)} /></TableCell>
                                                <TableCell><Input type="number" value={item.amount} onChange={e => handleOpexChange(item.id, 'amount', e.target.value)} /></TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveOpex(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                 <ScrollBar orientation="horizontal" />
                             </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>4. Capital Expenditures (CAPEX)</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleAddCapex}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                        </CardHeader>
                        <CardContent>
                           <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset Name</TableHead>
                                            <TableHead>Cost (Rp)</TableHead>
                                            <TableHead>Purchase Month</TableHead>
                                            <TableHead>Useful Life (Years)</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {capexItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell><Input value={item.assetName} onChange={e => handleCapexChange(item.id, 'assetName', e.target.value)} /></TableCell>
                                                <TableCell><Input type="number" value={item.cost} onChange={e => handleCapexChange(item.id, 'cost', e.target.value)} /></TableCell>
                                                <TableCell><Input type="number" value={item.purchaseMonth} onChange={e => handleCapexChange(item.id, 'purchaseMonth', e.target.value)} /></TableCell>
                                                <TableCell><Input type="number" value={item.usefulLife} onChange={e => handleCapexChange(item.id, 'usefulLife', e.target.value)} /></TableCell>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveCapex(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                           </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                        <Button size="lg" onClick={handleGenerateProjection} disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Projection
                        </Button>
                    </div>

                    {projection && (
                        <Card>
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <CardTitle>Projection Results</CardTitle>
                                    <CardDescription>Generated financial statements based on your assumptions.</CardDescription>
                                </div>
                                <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto"><FileDown className="mr-2 h-4 w-4"/> Export to Excel</Button>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="income">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="income">Income Statement</TabsTrigger>
                                        <TabsTrigger value="cashflow">Cash Flow Statement</TabsTrigger>
                                        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="income" className="mt-4">
                                        {renderProjectionTable(projection.incomeStatement, ['Month', 'Revenue', 'COGS', 'GrossProfit', 'TotalOPEX', 'EBITDA', 'Depreciation', 'EBIT', 'Taxes', 'NetIncome'])}
                                    </TabsContent>
                                    <TabsContent value="cashflow" className="mt-4">
                                        {renderProjectionTable(projection.cashFlowStatement, ['Month', 'NetIncome', 'Depreciation', 'Capex', 'NetCashFlow', 'EndingCashBalance'])}
                                    </TabsContent>
                                    <TabsContent value="balance-sheet" className="mt-4">
                                        {renderBalanceSheet(projection.balanceSheet)}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="ai" className="space-y-6 mt-6">
                    <Card>
                         <CardHeader>
                            <CardTitle>Automated Projection</CardTitle>
                            <CardDescription>
                                Let Aura AI analyze your historical data to generate a 30-day financial forecast. 
                                This process reviews sales, profit, and menu performance from the last 90 days.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleGenerateAiProjection} disabled={aiLoading} className="w-full sm:w-auto">
                                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Bot className="mr-2 h-4 w-4" /> Generate AI Projection</>}
                            </Button>
                        </CardContent>
                    </Card>

                    {aiLoading && (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 rounded-lg border-2 border-dashed">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <h3 className="text-lg font-semibold">Aura is analyzing your financials...</h3>
                            <p>This may take a moment. The AI is reviewing your sales, profit margins, and item performance.</p>
                        </div>
                    )}
                    
                    {aiProjection && <AiProjectionDisplay projection={aiProjection}/>}
                </TabsContent>
            </Tabs>
        </div>
    );
}
