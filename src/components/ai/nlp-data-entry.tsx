'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Loader2, Wand2, PlusCircle } from 'lucide-react';
import { aiPoweredDataEntry as runAiPoweredDataEntry } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

type FormData = {
  name: string;
  category: string;
  price: number | string;
};

export function NlpDataEntry() {
  const [naturalInput, setNaturalInput] = useState('');
  const [formData, setFormData] = useState<FormData>({ name: '', category: '', price: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePrefill = async () => {
    if (!naturalInput) {
      toast({ title: 'Perhatian', description: 'Masukkan kalimat deskripsi produk terlebih dahulu.', variant: 'destructive' });
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
      toast({ title: 'Berhasil', description: 'Formulir berhasil diisi otomatis oleh AI.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal memproses input kalimat.', variant: 'destructive' });
    }
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="p-4 pb-2 border-b border-border/60">
        <CardTitle className="text-sm font-bold text-foreground">Input Data Otomatis dengan Bahasa Alami (AI)</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Ketik kalimat instruksi, AI akan mengekstrak informasi dan mengisi kolom formulir secara otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="naturalInput" className="text-xs font-semibold">Deskripsi Produk Bebas</Label>
          <div className="flex gap-2">
            <Textarea 
              id="naturalInput"
              placeholder="Contoh: 'Buat menu baru Croissant Butter di kategori Pastry harga 25.000'"
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              rows={2}
              className="text-xs bg-background"
            />
            <Button onClick={handlePrefill} disabled={loading} variant="outline" size="icon" className="h-auto w-10 border-border shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Wand2 className="h-4 w-4 text-primary" />}
              <span className="sr-only">Isi Otomatis</span>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">Nama Produk</Label>
            <Input id="name" name="name" placeholder="Roti Cokelat Almond" value={formData.name} onChange={handleInputChange} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="category" className="text-xs font-semibold">Kategori</Label>
            <Input id="category" name="category" placeholder="Roti Manis" value={formData.category} onChange={handleInputChange} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="price" className="text-xs font-semibold">Harga Jual (Rp)</Label>
            <Input id="price" name="price" type="number" placeholder="14000" value={formData.price} onChange={handleInputChange} className="h-8 text-xs" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
