'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { runDataEntryTool } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';

export function AutomatedInput() {
    const [announcement, setAnnouncement] = useState('');
    const [result, setResult] = useState<{dataUpdateSummary: string, updatedData: any} | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!announcement) {
            toast({ title: 'Error', description: 'Please enter a staff announcement.', variant: 'destructive'});
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await runDataEntryTool({ staffAnnouncement: announcement });
            setResult(res);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to process announcement.', variant: 'destructive'});
        }
        setLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Automated Input Tool</CardTitle>
                <CardDescription>
                    AI Agent that automatically inputs and adjusts data from staff announcements.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    placeholder="Paste staff announcement here. e.g., 'Starting next week, the price of Latte will increase by $0.25. We're also introducing a new 'Caramel Macchiato' for $4.75.'"
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    rows={6}
                />
                {result && (
                    <Card className="bg-muted/50">
                        <CardHeader className="flex-row items-start gap-3 space-y-0">
                           <div className="p-2 bg-primary/20 rounded-lg">
                             <Bot className="h-5 w-5 text-primary" />
                           </div>
                           <div>
                            <CardTitle>AI Generated Update</CardTitle>
                            <CardDescription>Review the suggested changes below.</CardDescription>
                           </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           <p className="font-semibold">Summary:</p>
                           <p className="text-sm">{result.dataUpdateSummary}</p>
                           <p className="font-semibold mt-4">Updated Data (JSON):</p>
                           <pre className="bg-background p-2 rounded-md text-sm overflow-x-auto">
                            <code>{JSON.stringify(result.updatedData, null, 2)}</code>
                           </pre>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">Powered by Aura AI</p>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Process Announcement
                </Button>
            </CardFooter>
        </Card>
    );
}
