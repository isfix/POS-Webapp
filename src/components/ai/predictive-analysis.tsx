'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { runFinancialAnomalyAlerts } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

export function PredictiveAnalysis() {
    const [salesData, setSalesData] = useState('');
    const [expensesData, setExpensesData] = useState('');
    const [marketData, setMarketData] = useState('');
    const [result, setResult] = useState<{alerts: string} | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!salesData || !expensesData || !marketData) {
            toast({ title: 'Error', description: 'Please fill all data fields.', variant: 'destructive'});
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await runFinancialAnomalyAlerts({ 
                salesData, 
                expensesData,
                marketResearchData: marketData
            });
            setResult(res);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to generate alerts.', variant: 'destructive'});
        }
        setLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Predictive Analysis Tool</CardTitle>
                <CardDescription>
                    AI-driven analysis to discover trends and generate alerts for financial abnormalities.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="salesData">Sales Data</Label>
                        <Textarea id="salesData" placeholder="e.g., Weekly sales trend: +5%" value={salesData} onChange={e => setSalesData(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="expensesData">Expenses Data</Label>
                        <Textarea id="expensesData" placeholder="e.g., Milk supplier cost increased by 10%" value={expensesData} onChange={e => setExpensesData(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="marketData">Market Research</Label>
                        <Textarea id="marketData" placeholder="e.g., New competitor opened nearby" value={marketData} onChange={e => setMarketData(e.target.value)} />
                    </div>
                </div>

                {result && (
                    <Card className="bg-muted/50">
                        <CardHeader className="flex-row items-start gap-3 space-y-0">
                           <div className="p-2 bg-destructive/20 rounded-lg">
                             <AlertTriangle className="h-5 w-5 text-destructive" />
                           </div>
                           <div>
                            <CardTitle>AI Generated Alerts</CardTitle>
                            <CardDescription>Potential financial abnormalities detected.</CardDescription>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-sm">{result.alerts || "No significant anomalies detected."}</p>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">Powered by Aura AI</p>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Alerts
                </Button>
            </CardFooter>
        </Card>
    );
}
