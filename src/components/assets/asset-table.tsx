'use client';

import { useState, useMemo } from 'react';
import { format } from "date-fns";
import { id as idLocale } from 'date-fns/locale/id';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Search, FileDown, Wrench } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn, parseSafeDate } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { supabase, supabaseBucketName } from '@/lib/supabase';

export type Asset = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  condition: string;
  purchaseDate: any;
  assignedTo?: string;
  location: string;
  maintenanceDate?: any;
  status: string;
  notes?: string;
  imageUrl?: string;
};

export const BAKERY_ASSET_CATEGORIES = [
  'Oven & Pemanggang',
  'Mixer & Pengaduk Adonan',
  'Showcase & Etalase Kaca',
  'Peralatan Loyang & Dapur',
  'Elektronik Kasir & POS',
  'Lain-lain',
] as const;

export const ASSET_CONDITIONS = ['Sangat Baik (Baru)', 'Baik', 'Perlu Servis', 'Rusak'] as const;
export const ASSET_STATUSES = ['Aktif / Digunakan', 'Dalam Perbaikan', 'Tidak Aktif', 'Afkir'] as const;

type ItemFormData = {
  name: string;
  category: string;
  otherCategory: string;
  quantity: string;
  price: string;
  condition: string;
  purchaseDate?: Date;
  assignedTo: string;
  location: string;
  maintenanceDate?: Date;
  status: string;
  notes: string;
  imageFile?: File | null;
  imageUrl?: string;
};

type DataTableProps = {
  assets: Asset[];
  onAddItem: (newItemData: Omit<Asset, 'id'>) => void;
  onEditItem: (item: Asset) => void;
  onDeleteItem: (item: Asset) => void;
  onExport: (data: Asset[]) => void;
  loading: boolean;
};

const emptyFormState: ItemFormData = { 
  name: '',
  category: 'Oven & Pemanggang',
  otherCategory: '',
  quantity: '1',
  price: '',
  condition: 'Baik',
  purchaseDate: new Date(),
  assignedTo: '',
  location: 'Dapur Utama',
  maintenanceDate: undefined,
  status: 'Aktif / Digunakan',
  notes: '',
  imageFile: null,
  imageUrl: '',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDateSafe = (date: any) => {
  if (!date) return '-';
  try {
    const d = parseSafeDate(date);
    return format(d, 'd MMM yyyy', { locale: idLocale });
  } catch (e) {
    return '-';
  }
};

export function AssetTable({
  assets,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onExport,
  loading,
}: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  const handleOpenForm = (item: Asset | null = null) => {
    if (item) {
      setEditingItem(item);
      const isPredefinedCategory = BAKERY_ASSET_CATEGORIES.includes(item.category as any);
      const pDate = item.purchaseDate ? (item.purchaseDate.toDate ? item.purchaseDate.toDate() : new Date(item.purchaseDate)) : new Date();
      const mDate = item.maintenanceDate ? (item.maintenanceDate.toDate ? item.maintenanceDate.toDate() : new Date(item.maintenanceDate)) : undefined;

      setFormData({
        name: item.name,
        category: isPredefinedCategory ? item.category : 'Lain-lain',
        otherCategory: isPredefinedCategory ? '' : item.category,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        condition: item.condition,
        purchaseDate: pDate,
        assignedTo: item.assignedTo || '',
        location: item.location,
        maintenanceDate: mDate,
        status: item.status,
        notes: item.notes || '',
        imageFile: null,
        imageUrl: item.imageUrl || '',
      });
    } else {
      setEditingItem(null);
      setFormData({ ...emptyFormState, purchaseDate: new Date() });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData(emptyFormState);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'category' | 'condition' | 'status', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleDateSelect = (field: 'purchaseDate' | 'maintenanceDate', date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: date }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryToSave = formData.category === 'Lain-lain' ? formData.otherCategory || 'Lain-lain' : formData.category;

    if (!formData.name || !categoryToSave || !formData.quantity || !formData.price || !formData.condition || !formData.purchaseDate || !formData.location || !formData.status) {
      toast({
        title: 'Form Belum Lengkap',
        description: 'Nama alat, kategori, jumlah, harga, kondisi, dan lokasi wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    const numericQuantity = parseInt(formData.quantity, 10);
    const numericPrice = parseFloat(formData.price);

    if (isNaN(numericQuantity) || isNaN(numericPrice)) {
      toast({
        title: 'Input Tidak Valid',
        description: 'Jumlah unit dan harga harus berupa angka yang valid.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    let finalImageUrl = formData.imageUrl || '';

    if (formData.imageFile && supabaseBucketName) {
      try {
        const file = formData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `assets/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(supabaseBucketName)
          .upload(fileName, file);

        if (uploadError) {
          console.warn("Storage upload error:", uploadError);
        } else {
          const { data } = supabase.storage.from(supabaseBucketName).getPublicUrl(fileName);
          if (data?.publicUrl) finalImageUrl = data.publicUrl;
        }
      } catch (error) {
        console.warn("Using offline image placeholder");
      }
    }

    const submissionData = {
      name: formData.name,
      category: categoryToSave,
      quantity: numericQuantity,
      price: numericPrice,
      condition: formData.condition,
      purchaseDate: formData.purchaseDate.toISOString(),
      assignedTo: formData.assignedTo || '',
      location: formData.location,
      status: formData.status,
      notes: formData.notes || '',
      imageUrl: finalImageUrl,
      maintenanceDate: formData.maintenanceDate ? formData.maintenanceDate.toISOString() : null,
    };

    if (editingItem) {
      onEditItem({ ...editingItem, ...submissionData });
    } else {
      onAddItem(submissionData as Omit<Asset, 'id'>);
    }
    
    setUploading(false);
    setIsFormOpen(false);
  };

  const filteredAssets = useMemo(() => {
    return (Array.isArray(assets) ? assets : []).filter((item) => {
      if (!item) return false;
      const name = String(item.name || (item as any).title || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();
      const assignedTo = String(item.assignedTo || (item as any).assigned_to || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();
      const matchesSearch = name.includes(query) || location.includes(query) || assignedTo.includes(query);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, categoryFilter]);

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 4 }).map((_, index) => (
        <TableRow key={index} className="[&_td]:py-2.5">
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-7 w-7 ml-auto" /></TableCell>
        </TableRow>
      ));
    }
    
    if (filteredAssets.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="text-center h-20 text-xs text-muted-foreground">
            {searchQuery ? `Tidak ada peralatan dengan kata kunci "${searchQuery}"` : "Belum ada peralatan atau aset yang terdaftar."}
          </TableCell>
        </TableRow>
      );
    }

    return filteredAssets.map((item) => (
      <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5">
        <TableCell className="font-semibold text-foreground whitespace-nowrap">{item.name || (item as any).title || 'Peralatan Toko'}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px] font-semibold">
            {item.category || 'Peralatan'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] font-semibold", 
              item.status === 'Aktif / Digunakan' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
              item.status === 'Dalam Perbaikan' && 'bg-amber-50 text-amber-700 border-amber-300',
              item.status === 'Tidak Aktif' && 'bg-slate-100 text-slate-700',
              item.status === 'Afkir' && 'bg-destructive/10 text-destructive border-destructive/30'
            )}
          >
            {item.status || 'Aktif'}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{item.condition || 'Baik'}</TableCell>
        <TableCell className="text-right font-bold text-foreground">{item.quantity || 1} Unit</TableCell>
        <TableCell className="text-right font-bold text-foreground">{formatCurrency(Number(item.price || (item as any).cost || 0))}</TableCell>
        <TableCell className="text-muted-foreground">{item.location || '-'}</TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateSafe(item.purchaseDate)}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-xs font-semibold">
              <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Peralatan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus Aset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 pb-2 border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Inventaris Mesin & Peralatan Bakery</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Catat oven gas deck, spiral mixer, proofer, dan etalase showcase</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handleOpenForm()} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Mesin / Alat
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport(filteredAssets)} className="h-8 text-xs font-semibold border-border">
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Ekspor Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-secondary/50 rounded-lg border border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari nama mesin, lokasi, penanggung jawab..."
                  className="pl-8 h-8 text-xs bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue placeholder="Pilih Kategori Mesin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">Semua Kategori Peralatan</SelectItem>
                  {BAKERY_ASSET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-bold text-foreground h-9">Nama Peralatan</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Kategori</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Status</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Kondisi</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9 text-right">Jumlah</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9 text-right">Harga Perolehan</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Lokasi</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Tgl Beli</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9 text-right w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderTableBody()}</TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Modal Form Tambah/Edit */}
        <DialogContent className="max-w-md p-5">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingItem ? 'Ubah Informasi Peralatan' : 'Tambah Peralatan / Mesin Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingItem ? 'Perbarui data teknis, kondisi mesin, atau status servis.' : 'Daftarkan unit mesin atau peralatan toko baru.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-semibold">Nama Mesin / Peralatan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Gas Deck Oven 2 Pintu Sinmag"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kategori Mesin</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => handleSelectChange('category', val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAKERY_ASSET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status Operasional</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleSelectChange('status', val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-xs font-semibold">Jumlah Unit</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price" className="text-xs font-semibold">Harga Pembelian (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Contoh: 28500000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kondisi Mesin</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(val) => handleSelectChange('condition', val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond} className="text-xs">{cond}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs font-semibold">Lokasi Penempatan</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Contoh: Dapur Produksi Utama"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tanggal Perolehan / Beli</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-8 justify-start text-left text-xs font-normal',
                      !formData.purchaseDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.purchaseDate ? (
                      format(formData.purchaseDate, 'd MMMM yyyy', { locale: idLocale })
                    ) : (
                      <span>Pilih tanggal pembelian...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.purchaseDate}
                    onSelect={(d) => handleDateSelect('purchaseDate', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseForm} className="h-8 text-xs">
                Batal
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground" disabled={uploading}>
                {editingItem ? 'Simpan Perubahan' : 'Tambah Peralatan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
