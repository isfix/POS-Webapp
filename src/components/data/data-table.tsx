'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Loader2, FileDown, Search, Filter, Image as ImageIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { supabase, supabaseBucketName } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import * as xlsx from 'xlsx';

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  imageUrl?: string;
  ingredients?: string[];
  availability: boolean;
};

export const BAKERY_MENU_CATEGORIES = [
  'Roti Manis',
  'Roti Tawar',
  'Cake & Tart',
  'Pastry & Croissant',
  'Donat & Cookies',
  'Minuman',
];

type ItemFormData = {
  name: string;
  category: string;
  price: string;
  costPrice: string;
  imageFile?: File | null;
  imageUrl?: string;
  ingredients: string;
  availability: boolean;
};

type DataTableProps = {
  menuItems: MenuItem[];
  onAddItem: (newItemData: Omit<MenuItem, 'id'>) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
  loading?: boolean;
};

const emptyFormState: ItemFormData = {
  name: '',
  category: 'Roti Manis',
  price: '',
  costPrice: '',
  imageFile: null,
  imageUrl: '',
  ingredients: '',
  availability: true,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export function DataTable({ menuItems, onAddItem, onEditItem, onDeleteItem }: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const menuCategories = useMemo(() => {
    const fromItems = menuItems.map(item => item.category);
    return [...new Set([...BAKERY_MENU_CATEGORIES, ...fromItems])].filter(Boolean);
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return (Array.isArray(menuItems) ? menuItems : []).filter(item => {
      if (!item) return false;
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
      const searchMatch = String(item.name || (item as any).title || '').toLowerCase().includes(String(searchQuery || '').toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [menuItems, categoryFilter, searchQuery]);
  
  useEffect(() => {
    if (formData.imageFile) {
      const url = URL.createObjectURL(formData.imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [formData.imageFile]);

  const handleOpenForm = (item: MenuItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        costPrice: (item.costPrice || 0).toString(),
        imageUrl: item.imageUrl || '',
        imageFile: null,
        ingredients: item.ingredients?.join(', ') || '',
        availability: item.availability,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormState);
    }
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, imageFile: e.target.files![0] }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, availability: checked }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.price || !formData.costPrice) {
      toast({ title: 'Perhatian', description: 'Mohon lengkapi Nama, Kategori, Harga Jual, dan Harga Modal (HPP).', variant: 'destructive' });
      return;
    }
    
    setUploading(true);

    let uploadedImageUrl = editingItem?.imageUrl || '';

    if (formData.imageFile && supabase && supabaseBucketName) {
      try {
        const file = formData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from(supabaseBucketName)
          .upload(filePath, file, { contentType: file.type });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(supabaseBucketName)
            .getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            uploadedImageUrl = urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Image upload skipped or failed, saving without new image: ", err);
      }
    }

    const submissionData = {
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      costPrice: parseFloat(formData.costPrice),
      imageUrl: uploadedImageUrl,
      ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      availability: formData.availability,
    };

    if (editingItem) {
      onEditItem({ ...submissionData, id: editingItem.id });
    } else {
      onAddItem(submissionData);
    }

    setUploading(false);
    setIsFormOpen(false);
  };

  const handleExport = () => {
    if (filteredMenuItems.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada daftar produk untuk diekspor.', variant: 'default' });
      return;
    }
    toast({ title: 'Mengekspor...', description: 'File Excel sedang dipersiapkan.' });

    const dataToExport = filteredMenuItems.map(item => ({
      "Nama Produk Roti": item.name,
      "Kategori": item.category,
      "Harga Modal / HPP (Rp)": item.costPrice || 0,
      "Harga Jual (Rp)": item.price,
      "Status": item.availability ? 'Tersedia' : 'Kosong',
      "Bahan Utama": item.ingredients?.join(', ') || '-',
      "URL Gambar": item.imageUrl || '-',
    }));

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Katalog Produk");
    xlsx.writeFile(wb, "Katalog_Menu_Produk.xlsx");
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 pb-2 border-b border-border/60">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Katalog Menu Roti & Kue</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Kelola daftar produk jualan, harga modal HPP, dan status etalase</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleOpenForm()} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Produk
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs font-semibold border-border">
              <FileDown className="mr-1.5 h-3.5 w-3.5" /> Ekspor Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-secondary/50 rounded-lg border border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama roti, cake, pastry..."
                className="pl-8 h-8 text-xs bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue placeholder="Semua Kategori Produk" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">Semua Kategori Produk</SelectItem>
                  {menuCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-border overflow-hidden">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="[&_th]:py-2 [&_th]:text-xs">
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga Modal (HPP)</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-center">Status Etalase</TableHead>
                    <TableHead className="text-right w-16">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMenuItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-20 text-xs text-muted-foreground">
                        {searchQuery ? `Tidak ada produk roti dengan kata kunci "${searchQuery}"` : "Belum ada produk yang ditambahkan."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMenuItems.map((item) => (
                      <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5">
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground whitespace-nowrap">
                          {formatCurrency(item.costPrice || 0)}
                        </TableCell>
                        <TableCell className="text-right font-black text-primary whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline"
                            className={item.availability ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold' : 'bg-muted text-muted-foreground text-[10px] font-medium'}
                          >
                            {item.availability ? 'Tersedia' : 'Habis'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                <span className="sr-only">Menu aksi</span>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 text-xs font-semibold">
                              <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Menu
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus Menu
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {editingItem ? 'Edit Produk Roti / Menu' : 'Tambah Produk Roti Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Lengkapi data produk roti atau kue untuk ditampilkan pada kasir POS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold">Nama Produk <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Contoh: Roti Cokelat Keju Spesial" className="h-8 text-xs"/>
          </div>

          <div className="space-y-1">
            <Label htmlFor="category" className="text-xs font-semibold">Kategori Bakery <span className="text-destructive">*</span></Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(p => ({...p, category: value}))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih kategori roti" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {BAKERY_MENU_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="costPrice" className="text-xs font-semibold">Harga Modal HPP (Rp) <span className="text-destructive">*</span></Label>
              <Input id="costPrice" name="costPrice" type="number" value={formData.costPrice} onChange={handleInputChange} placeholder="Contoh: 4500" className="h-8 text-xs"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="price" className="text-xs font-semibold">Harga Jual (Rp) <span className="text-destructive">*</span></Label>
              <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="Contoh: 9000" className="h-8 text-xs"/>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ingredients" className="text-xs font-semibold">Bahan Utama / Deskripsi Singkat</Label>
            <Input id="ingredients" name="ingredients" value={formData.ingredients} onChange={handleInputChange} placeholder="Contoh: Cokelat Belgia, Keju Cheddar" className="h-8 text-xs"/>
          </div>

          <div className="space-y-1">
            <Label htmlFor="imageFile" className="text-xs font-semibold">Foto Produk</Label>
            <div className="mt-1 flex items-center justify-center rounded-lg border border-dashed border-input p-3 bg-muted/20">
              {(previewUrl || formData.imageUrl) ? (
                <div className="relative group w-24 h-24">
                  <img src={previewUrl || formData.imageUrl} alt="Preview" className="h-full w-full object-cover rounded-md border" />
                  <label htmlFor="imageFile" className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md">
                    Ganti Foto
                  </label>
                  <Input id="imageFile" name="imageFile" type="file" className="sr-only" accept="image/*" onChange={handleImageChange}/>
                </div>
              ) : (
                <div className="text-center py-2">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <div className="mt-1 flex text-xs justify-center text-muted-foreground">
                    <label htmlFor="imageFile" className="relative cursor-pointer rounded font-bold text-primary hover:underline">
                      <span>Pilih file foto</span>
                      <Input id="imageFile" name="imageFile" type="file" className="sr-only" accept="image/*" onChange={handleImageChange}/>
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG hingga 2MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/30">
            <div>
              <Label htmlFor="availability" className="text-xs font-bold text-foreground">Status Ketersediaan</Label>
              <p className="text-[10px] text-muted-foreground">Aktifkan agar produk muncul di kasir</p>
            </div>
            <Switch id="availability" checked={formData.availability} onCheckedChange={handleSwitchChange} />
          </div>
        </div>
        <DialogFooter className="gap-1.5 pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-8 text-xs">
            Batal
          </Button>
          <Button type="submit" size="sm" onClick={handleSubmit} disabled={uploading} className="h-8 text-xs font-bold bg-primary text-primary-foreground">
            {uploading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Simpan Produk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
