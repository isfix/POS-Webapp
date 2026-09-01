'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as xlsx from 'xlsx';

import { DataTable, type MenuItem } from '@/components/data/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, Calendar as CalendarIcon, History, Database, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { parseSafeDate } from '@/lib/utils';

export type ActivityLog = {
  id: string;
  user: string;
  action: string;
  timestamp: string;
};

export default function DataManagementPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLogsLoading(true);

      const items = await withFallback<MenuItem>(
        () => supabase.from('menu_items').select('*').order('name', { ascending: true }),
        'rotikita_menu',
        {
          transform: (data) => data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            price: Number(d.price || 0),
            costPrice: Number(d.cost_price || d.costPrice || 0),
            imageUrl: d.image_url || d.imageUrl,
            availability: d.availability !== false,
            ingredients: d.ingredients || [],
          })),
        }
      );
      setMenuItems(items);
      setLoading(false);

      const logs = await withFallback<ActivityLog>(
        () => supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
        'rotikita_logs',
        {
          transform: (data) => data.map((l: any) => ({
            id: l.id,
            user: l.user_name || l.user || 'Admin',
            action: l.action,
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
          })),
        }
      );
      setActivityLogs(logs);
      setLogsLoading(false);
    };

    fetchData();
  }, []);

  const addActivityLog = async (action: string) => {
    const operatorName = user?.displayName || user?.email || 'Staf Kasir';
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user: operatorName,
      action,
      timestamp: new Date().toISOString(),
    };
    const updatedLogs = [newLog, ...activityLogs].slice(0, 100);
    setActivityLogs(updatedLogs);

    await mutateWithLocalSync('rotikita_logs', updatedLogs, () =>
      supabase.from('activity_logs').insert([{
        user_name: operatorName,
        action,
      }])
    );
  };

  const handleAddItem = async (newItemData: Omit<MenuItem, 'id'>) => {
    const tempId = `menu-${Date.now()}`;
    const newItem: MenuItem = {
      ...newItemData,
      id: tempId,
    };
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    addActivityLog(`Menambah produk '${newItemData.name}'`);
    toast({ title: 'Berhasil', description: 'Produk baru berhasil ditambahkan.' });

    await mutateWithLocalSync('rotikita_menu', updated, () =>
      supabase.from('menu_items').insert([{
        name: newItemData.name,
        category: newItemData.category,
        price: newItemData.price,
        cost_price: newItemData.costPrice,
        image_url: newItemData.imageUrl,
        availability: newItemData.availability,
        ingredients: newItemData.ingredients,
      }])
    );
  };

  const handleEditItem = async (itemToUpdate: MenuItem) => {
    const updated = menuItems.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    setMenuItems(updated);
    addActivityLog(`Memperbarui produk '${itemToUpdate.name}'`);
    toast({ title: 'Berhasil', description: 'Data produk berhasil diperbarui.' });

    await mutateWithLocalSync('rotikita_menu', updated, () =>
      supabase.from('menu_items').update({
        name: itemToUpdate.name,
        category: itemToUpdate.category,
        price: itemToUpdate.price,
        cost_price: itemToUpdate.costPrice,
        image_url: itemToUpdate.imageUrl,
        availability: itemToUpdate.availability,
        ingredients: itemToUpdate.ingredients,
      }).eq('id', itemToUpdate.id)
    );
  };

  const handleDeleteItem = async (itemToDelete: MenuItem) => {
    const filtered = menuItems.filter(item => item.id !== itemToDelete.id);
    setMenuItems(filtered);
    addActivityLog(`Menghapus produk '${itemToDelete.name}'`);
    toast({ title: 'Berhasil', description: 'Produk berhasil dihapus.' });

    await mutateWithLocalSync('rotikita_menu', filtered, () =>
      supabase.from('menu_items').delete().eq('id', itemToDelete.id)
    );
  };

  const filteredLogs = useMemo(() => {
    if (!dateRange?.from) return activityLogs;
    
    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    return activityLogs.filter(log => {
      try {
        const logDate = new Date(log.timestamp);
        return logDate >= fromDate && logDate <= toDate;
      } catch (e) {
        return true;
      }
    });
  }, [activityLogs, dateRange]);

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada aktivitas pada rentang tanggal ini.', variant: 'default' });
      return;
    }

    toast({ title: 'Mengekspor...', description: 'Log aktivitas sedang disiapkan.' });
    
    const dataToExport = filteredLogs.map(log => ({
      'Waktu': format(parseSafeDate(log.timestamp), 'd MMMM yyyy, HH:mm:ss', { locale: idLocale }),
      'Pengguna': log.user,
      'Aktivitas': log.action,
    }));

    const exportFileName = `Log_Aktivitas_${format(parseSafeDate(dateRange?.from), 'yyyy-MM-dd')}.xlsx`;

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Log Aktivitas");
    xlsx.writeFile(wb, exportFileName);
    toast({ title: 'Selesai', description: `File ${exportFileName} berhasil diunduh.` });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Katalog Menu & Riwayat</h1>
        <p className="text-xs text-muted-foreground">Kelola penetapan harga jual, HPP per porsi/item, dan pantau log audit sistem.</p>
      </div>

      <Tabs defaultValue="menu" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-secondary/80 p-1 border border-border">
          <TabsTrigger value="menu" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">
            <Database className="h-3.5 w-3.5 mr-1.5" />
            Katalog Produk & HPP
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Log Aktivitas & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-4">
          <DataTable
            menuItems={menuItems}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Log Aktivitas Operasional</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Rekam jejak setiap perubahan menu, harga, dan persediaan.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-border">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(parseSafeDate(dateRange.from), "d MMM", { locale: idLocale })} - {format(parseSafeDate(dateRange.to), "d MMM yyyy", { locale: idLocale })}
                          </>
                        ) : (
                          format(parseSafeDate(dateRange.from), "d MMMM yyyy", { locale: idLocale })
                        )
                      ) : (
                        "Pilih Rentang Tanggal"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Button onClick={handleExportLogs} variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-border">
                  <Download className="h-3.5 w-3.5" />
                  Ekspor Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-48 text-xs font-bold">Waktu</TableHead>
                    <TableHead className="w-40 text-xs font-bold">Pengguna</TableHead>
                    <TableHead className="text-xs font-bold">Aktivitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-32" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-24" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-64" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-xs">
                        Tidak ada aktivitas yang tercatat pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(parseSafeDate(log.timestamp), 'd MMM yyyy, HH:mm', { locale: idLocale })}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground">
                          {log.user}
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          {log.action}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
