'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Bot, Loader2 } from 'lucide-react';
import { aiPoweredDataEntry } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';

export function AutomatedInput() {
  const [announcement, setAnnouncement] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!announcement) {
      toast({ title: 'Perhatian', description: 'Masukkan pengumuman atau instruksi.', variant: 'destructive'});
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await aiPoweredDataEntry({ naturalLanguageInput: announcement });
      setResult(res);
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal memproses pengumuman.', variant: 'destructive'});
    }
    setLoading(false);
  };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="p-4 pb-2 border-b border-border/60">
        <CardTitle className="text-sm font-bold text-foreground">Alat Input Pengumuman Staf (AI)</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Ekstrak otomatis perubahan harga atau menu dari pengumuman staf/dapur.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Textarea 
          placeholder="Contoh: 'Mulai minggu depan, harga Roti Cokelat naik menjadi 12.000 dan ada varian baru Croissant Keju seharga 18.000.'"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          rows={4}
          className="text-xs bg-background"
        />
        {result && (
          <Card className="bg-secondary/40 border border-border">
            <CardHeader className="p-3 pb-1 flex-row items-center gap-2 space-y-0">
              <Bot className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs font-bold">Hasil Ekstraksi Data AI</CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              <pre className="bg-background p-2 rounded-md font-mono text-[11px] overflow-x-auto border">
                <code>{JSON.stringify(result.formData || result, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t border-border flex justify-between">
        <p className="text-[11px] text-muted-foreground">Didukung Aura AI</p>
        <Button onClick={handleSubmit} disabled={loading} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Proses Pengumuman
        </Button>
      </CardFooter>
    </Card>
  );
}
