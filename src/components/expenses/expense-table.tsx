'use client';

import { useState, useMemo } from 'react';
import { format } from "date-fns";
import { id as idLocale } from 'date-fns/locale';
import * as xlsx from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Filter, Search, FileDown } from 'lucide-react';
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

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: any;
  notes?: string;
  createdAt?: any;
};

export const BAKERY_EXPENSE_CATEGORIES = [
  'Bahan Baku & Dapur',
  'Operasional & Utilitas (Listrik/Gas Oven)',
  'Gaji & Upah Karyawan',
  'Kemasan & Dus Roti',
  'Perawatan Mesin & Oven',
  'Sewa Tempat & Bangunan',
  'Lain-lain',
] as const;

type ItemFormData = {
  title: string;
  category: string;
  amount: string;
  expenseDate?: Date;
  notes: string;
};

type DataTableProps = {
  expenses: Expense[];
  onAddItem: (newItemData: Omit<Expense, 'id' | 'createdAt'>) => void;
  onEditItem: (item: Expense) => void;
  onDeleteItem: (item: Expense) => void;
  loading: boolean;
};

const emptyFormState: ItemFormData = {
  title: '',
  category: 'Bahan Baku & Dapur',
  amount: '',
  expenseDate: new Date(),
  notes: '',
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

export function ExpenseTable({
  expenses,
  onAddItem,
  onEditItem,
  onDeleteItem,
  loading,
}: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  const handleOpenForm = (item: Expense | null = null) => {
    if (item) {
      setEditingItem(item);
      const dateVal = item.expenseDate ? (item.expenseDate.toDate ? item.expenseDate.toDate() : new Date(item.expenseDate)) : new Date();
      setFormData({
        title: item.title,
        category: item.category,
        amount: item.amount.toString(),
        expenseDate: dateVal,
        notes: item.notes || '',
      });
    } else {
      setEditingItem(null);
      setFormData({ ...emptyFormState, expenseDate: new Date() });
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

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, expenseDate: date }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.amount || !formData.expenseDate) {
      toast({
        title: 'Form Belum Lengkap',
        description: 'Judul pengeluaran, kategori, nominal, dan tanggal wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: 'Nominal Tidak Valid',
        description: 'Masukkan jumlah biaya dengan format angka yang benar.',
        variant: 'destructive',
      });
      return;
    }

    const itemData = {
      title: formData.title,
      category: formData.category,
      amount: numericAmount,
      expenseDate: formData.expenseDate.toISOString(),
      notes: formData.notes,
    };

    if (editingItem) {
      onEditItem({ id: editingItem.id, ...itemData } as Expense);
    } else {
      onAddItem(itemData);
    }

    handleCloseForm();
  };

  const filteredExpenses = useMemo(() => {
    return (Array.isArray(expenses) ? expenses : []).filter((item) => {
      if (!item) return false;
      const title = String(item.title || (item as any).name || (item as any).description || '').toLowerCase();
      const notes = String(item.notes || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();
      const matchesSearch = title.includes(query) || notes.includes(query);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada data pengeluaran untuk diekspor.', variant: 'default' });
      return;
    }

    toast({ title: 'Mengekspor...', description: 'File Excel sedang dipersiapkan.' });

    const dataToExport = filteredExpenses.map((item) => ({
      'Judul Pengeluaran': item.title || (item as any).name || (item as any).description || 'Pengeluaran',
      'Kategori Biaya': item.category || 'Beban Lain-lain',
      'Nominal Biaya (Rp)': Number(item.amount || 0),
      'Tanggal Pengeluaran': formatDateSafe(item.expenseDate),
      'Catatan / Keterangan': item.notes || '-',
    }));

    const exportFileName = `Beban_Operasional_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Beban Pengeluaran');
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
        </TableRow>
      ));
    }
    
    if (filteredExpenses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center h-24 text-xs text-muted-foreground">
            {searchQuery ? `Tidak ada pengeluaran dengan kata kunci "${searchQuery}"` : "Belum ada catatan pengeluaran."}
          </TableCell>
        </TableRow>
      );
    }

    return filteredExpenses.map((item) => (
      <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition-colors [&_td]:py-2.5">
        <TableCell className="font-semibold text-foreground whitespace-nowrap">
          {item.title || (item as any).name || (item as any).description || 'Pengeluaran'}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-[10px] font-semibold bg-secondary text-foreground">
            {item.category || 'Beban Lain-lain'}
          </Badge>
        </TableCell>
        <TableCell className="text-right whitespace-nowrap font-bold text-destructive">
          {formatCurrency(Number(item.amount || 0))}
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatDateSafe(item.expenseDate)}
        </TableCell>
        <TableCell className="text-muted-foreground max-w-xs truncate text-[11px]">
          {item.notes || '-'}
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
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Biaya
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus Biaya
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
              <CardTitle className="text-sm font-bold text-foreground">Daftar Beban & Pengeluaran Toko</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Catat biaya listrik/gas oven, gaji karyawan, dan perawatan mesin</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handleOpenForm()} size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Catat Beban
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs font-semibold border-border">
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
                  placeholder="Cari transaksi pengeluaran atau catatan..."
                  className="pl-8 h-8 text-xs bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue placeholder="Pilih Kategori Beban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">Semua Kategori Beban</SelectItem>
                  {BAKERY_EXPENSE_CATEGORIES.map((cat) => (
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
                      <TableHead className="text-xs font-bold text-foreground h-9">Deskripsi / Judul Beban</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Kategori</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9 text-right">Nominal (Rp)</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Tanggal</TableHead>
                      <TableHead className="text-xs font-bold text-foreground h-9">Catatan</TableHead>
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
              {editingItem ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran Operasional Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan informasi biaya operasional bakery ke laporan keuangan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs font-semibold">Judul Pengeluaran</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Contoh: Tagihan Gas Oven & Token Listrik Dapur"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kategori Beban</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAKERY_EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs font-semibold">Nominal Biaya (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Contoh: 1250000"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tanggal Transaksi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-8 justify-start text-left text-xs font-normal',
                      !formData.expenseDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.expenseDate ? (
                      format(formData.expenseDate, 'd MMMM yyyy', { locale: idLocale })
                    ) : (
                      <span>Pilih tanggal transaksi...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expenseDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-semibold">Catatan Tambahan (Opsional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Rincian nomor invoice / keperluan..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseForm} className="h-8 text-xs">
                Batal
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground">
                {editingItem ? 'Simpan Perubahan' : 'Catat Biaya'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
