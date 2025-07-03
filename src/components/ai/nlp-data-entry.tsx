'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { runAiPoweredDataEntry } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

type FormData = {
    name: string;
    category: string;
    price: number | string;
}

export function NlpDataEntry() {
    const [naturalInput, setNaturalInput] = useState('');
    const [formData, setFormData] = useState<FormData>({ name: '', category: '', price: '' });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handlePrefill = async () => {
        if (!naturalInput) {
            toast({ title: 'Error', description: 'Please enter a description.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const res = await runAiPoweredDataEntry({ naturalLanguageInput: naturalInput });
            const parsedData = res.formData || {};
            setFormData({
                name: parsedData.name || '',
                category: parsedData.category || '',
                price: parsedData.price || '',
            });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to parse input.', variant: 'destructive' });
        }
        setLoading(false);
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI-Powered Data Entry</CardTitle>
                <CardDescription>
                    Describe a new menu item in plain language, and Aura AI will pre-fill the form for you.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="naturalInput">Item Description</Label>
                    <div className="flex gap-2">
                        <Textarea 
                            id="naturalInput"
                            placeholder="e.g., 'Add a new coffee called a Flat White. It should be in the coffee category and cost Rp 60,000'"
                            value={naturalInput}
                            onChange={(e) => setNaturalInput(e.target.value)}
                            rows={3}
                        />
                        <Button onClick={handlePrefill} disabled={loading} variant="outline" size="icon" className="h-auto">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                            <span className="sr-only">Pre-fill form</span>
                        </Button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Flat White" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input id="category" name="category" placeholder="e.g., Coffee" value={formData.category} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" name="price" type="number" placeholder="e.g., 60000" value={formData.price} onChange={handleInputChange} />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                 <p className="text-sm text-muted-foreground">Powered by Aura AI</p>
                <Button>Add Menu Item</Button>
            </CardFooter>
        </Card>
    );
}
