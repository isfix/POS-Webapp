'use client';

import { useState, useMemo } from 'react';
import { format } from "date-fns";
import { id as idLocale } from 'date-fns/locale/id';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Search, FileDown, AlertTriangle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export type InventoryItem = {
  id: string;
  name: string;
  category: 'Tepung & Ragi' | 'Dairy, Mentega & Telur' | 'Gula & Pemanis' | 'Isian & Topping' | 'Kemasan & Dus Roti' | 'Perlengkapan & Kebersihan' | string;
  quantity: number;
  unitType: string;
  minThreshold: number;
  supplier?: string;
  expirationDate?: any;
  costPerUnit: number;
  lastUpdated?: any;
};

export const BAKERY_INVENTORY_CATEGORIES = [
  'Tepung & Ragi',
  'Dairy, Mentega & Telur',
  'Gula & Pemanis',
  'Isian & Topping',
  'Kemasan & Dus Roti',
  'Perlengkapan & Kebersihan',
] as const;

type ItemFormData = {
  name: string;
  category: string;
  quantity: string;
  unitType: string;
  minThreshold: string;
  supplier: string;
  expirationDate?: Date;
  costPerUnit: string;
};

type DataTableProps = {
  inventoryItems: InventoryItem[];
  onAddItem: (newItemData: Omit<InventoryItem, 'id'>) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  loading: boolean;
};

const emptyFormState: ItemFormData = {
  name: '',
  category: 'Tepung & Ragi',
  quantity: '',
  unitType: 'kg',
  minThreshold: '',
  supplier: '',
  expirationDate: undefined,
  costPerUnit: '',
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
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'd MMM yyyy', { locale: idLocale });
  } catch (e) {
    return '-';
  }
};

export function InventoryTable({
  inventoryItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  loading,
}: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  const handleOpenForm = (item: InventoryItem | null = null) => {
    if (item) {
      setEditingItem(item);
      const expDate = item.expirationDate ? (item.expirationDate.toDate ? item.expirationDate.toDate() : new Date(item.expirationDate)) : undefined;
      setFormData({
        name: item.name,
        category: item.category,
        quantity: item.quantity.toString(),
        unitType: item.unitType,
        minThreshold: item.minThreshold.toString(),
        supplier: item.supplier || '',
        expirationDate: expDate,
        costPerUnit: item.costPerUnit.toString(),
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormState);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setFormData(emptyFormState);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: 'category' | 'unitType', value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, expirationDate: date }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.quantity || !formData.costPerUnit) {
      toast({
        title: 'Form Belum Lengkap',
        description: 'Nama bahan, jumlah stok, dan harga satuan wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    const numericQuantity = parseFloat(formData.quantity);
    const numericMinThreshold = parseFloat(formData.minThreshold) || 0;
    const numericCost = parseFloat(formData.costPerUnit);

    if (isNaN(numericQuantity) || isNaN(numericCost)) {
      toast({
        title: 'Input Tidak Valid',
        description: 'Jumlah stok dan harga harus berupa angka valid.',
        variant: 'destructive',
      });
      return;
    }

    const itemData = {
      name: formData.name,
      category: formData.category,
      quantity: numericQuantity,
      unitType: formData.unitType,
      minThreshold: numericMinThreshold,
      supplier: formData.supplier || '',
      expirationDate: formData.expirationDate ? formData.expirationDate.toISOString() : null,
      costPerUnit: numericCost,
      lastUpdated: new Date().toISOString(),
    };

    if (editingItem) {
      onEditItem({ id: editingItem.id, ...itemData } as InventoryItem);
    } else {
      onAddItem(itemData as any);
    }

    handleCloseForm();
  };

  const filteredItems = useMemo(() => {
    return (Array.isArray(inventoryItems) ? inventoryItems : []).filter((item) => {
      if (!item) return false;
      const name = String(item.name || (item as any).title || '').toLowerCase();
      const supplier = String(item.supplier || item.category || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();
      const matchesSearch = name.includes(query) || supplier.includes(query);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchQuery, categoryFilter]);

  const handleExport = async () => {
    if (filteredItems.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada data stok untuk diekspor.', variant: 'default' });
      return;
    }

    toast({ title: 'Mengekspor...', description: 'File Excel sedang dipersiapkan.' });

    const dataToExport = filteredItems.map((item) => ({
      'Nama Bahan': item.name || 'Bahan Baku',
      'Kategori': item.category || 'Lain-lain',
      'Jumlah Stok': Number(item.quantity || 0),
      'Satuan': item.unitType || 'kg',
      'Batas Minimum': Number(item.minThreshold || 0),
      'Harga Beli Satuan (Rp)': Number(item.costPerUnit || 0),
      'Total Nilai Stok (Rp)': Number(item.quantity || 0) * Number(item.costPerUnit || 0),
      'Pemasok / Supplier': item.supplier || '-',
      'Tgl Kedaluwarsa': formatDateSafe(item.expirationDate),
      'Status': Number(item.quantity || 0) <= Number(item.minThreshold || 0) ? 'MENIPIS' : 'AMAN',
    }));

    const exportFileName = `Stok_Bahan_Baku_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Bahan Baku');
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
        </TableRow>
      ));
    }
    
    if (filteredItems.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="text-center h-24 text-xs text-muted-foreground">
            {searchQuery ? `Tidak ada bahan baku dengan kata kunci "${searchQuery}"` : "Belum ada bahan baku yang terdaftar."}
          </TableCell>
        </TableRow>
      );
    }

    return filteredItems.map((item) => {
      const qty = Number(item.quantity || 0);
      const minThresh = Number(item.minThreshold || 0);
      const isLowStock = qty <= minThresh;
      return (
        <TableRow key={item.id} className={cn("text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5", isLowStock && 'bg-destructive/5')}>
          <TableCell className="font-semibold text-foreground whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              {isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              <span>{item.name || 'Bahan Baku'}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="text-[10px] font-semibold bg-secondary text-foreground">
              {item.category || 'Bahan Baku'}
            </Badge>
          </TableCell>
          <TableCell className="text-right whitespace-nowrap font-bold">
            <span className={cn(isLowStock ? 'text-destructive font-black' : 'text-foreground')}>
              {qty}
            </span>
            <span className="text-muted-foreground text-[11px]"> / min {minThresh}</span>
          </TableCell>
          <TableCell className="whitespace-nowrap font-medium text-muted-foreground">{item.unitType || 'kg'}</TableCell>
          <TableCell className="text-right whitespace-nowrap font-bold text-foreground">
            {formatCurrency(Number(item.costPerUnit || 0))}
          </TableCell>
          <TableCell className="whitespace-nowrap text-muted-foreground">
            {formatDateSafe(item.expirationDate)}
          </TableCell>
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
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Bahan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus Bahan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 pb-2 border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Daftar Bahan Baku & Persediaan</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Kelola stok resep, harga beli modal, dan tanggal kedaluwarsa</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handleOpenForm()} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm" data-testid="add-inventory-btn">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Bahan
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs font-semibold border-border">
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Ekspor Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-secondary/50 rounded-lg border border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari nama bahan atau supplier..."
                  className="pl-8 h-8 text-xs bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs bg-card font-medium">
                    <SelectValue placeholder="Semua Kategori Bahan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">Semua Kategori</SelectItem>
                    {BAKERY_INVENTORY_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category} className="text-xs">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent [&_th]:py-2.5 text-xs font-bold text-foreground">
                      <TableHead>Nama Bahan Baku</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Stok Fisik</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Harga Modal</TableHead>
                      <TableHead>Kedaluwarsa</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderTableBody()}</TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Modal Form Dialog */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingItem ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan informasi detail persediaan bahan baku dapur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-semibold">Nama Bahan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Tepung Terigu Protein Tinggi"
                className="h-8 text-xs"
                data-testid="inventory-name-input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs font-semibold">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger id="category" className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAKERY_INVENTORY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="unitType" className="text-xs font-semibold">Satuan Unit</Label>
                <Select
                  value={formData.unitType}
                  onValueChange={(value) => handleSelectChange('unitType', value)}
                >
                  <SelectTrigger id="unitType" className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg" className="text-xs">Kilogram (kg)</SelectItem>
                    <SelectItem value="gram" className="text-xs">Gram (g)</SelectItem>
                    <SelectItem value="liter" className="text-xs">Liter (L)</SelectItem>
                    <SelectItem value="butir" className="text-xs">Butir</SelectItem>
                    <SelectItem value="dus" className="text-xs">Dus / Box</SelectItem>
                    <SelectItem value="pcs" className="text-xs">Pcs / Lembar</SelectItem>
                    <SelectItem value="pack" className="text-xs">Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-xs font-semibold">Jumlah Stok Fisik</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="h-8 text-xs"
                  data-testid="inventory-qty-input"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="minThreshold" className="text-xs font-semibold">Batas Minimum Peringatan</Label>
                <Input
                  id="minThreshold"
                  type="number"
                  step="any"
                  value={formData.minThreshold}
                  onChange={handleInputChange}
                  placeholder="Contoh: 5"
                  className="h-8 text-xs"
                  data-testid="inventory-threshold-input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="costPerUnit" className="text-xs font-semibold">Harga Modal per Satuan (Rp)</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  value={formData.costPerUnit}
                  onChange={handleInputChange}
                  placeholder="Contoh: 15000"
                  className="h-8 text-xs"
                  data-testid="inventory-cost-input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="supplier" className="text-xs font-semibold">Supplier / Pemasok</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  placeholder="Contoh: PT Bogasari"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tanggal Kedaluwarsa (Opsional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-8 justify-start text-left text-xs font-normal',
                      !formData.expirationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.expirationDate ? (
                      format(formData.expirationDate, 'd MMMM yyyy', { locale: idLocale })
                    ) : (
                      <span>Pilih tanggal kedaluwarsa...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expirationDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseForm} className="h-8 text-xs">
                Batal
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground" data-testid="save-inventory-btn">
                {editingItem ? 'Simpan Perubahan' : 'Tambah Bahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
