'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { recordAudit } from '@/actions/audit';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

import { DataTable, type MenuItem } from '@/components/data/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, Calendar as CalendarIcon, History, Database, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { parseSafeDate } from '@/lib/utils';

export type ActivityLog = {
  id: string;
  user: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
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
            entityType: l.entity_type || l.entityType,
            entityId: l.entity_id || l.entityId,
            details: l.details,
            timestamp: l.created_at || l.timestamp || new Date().toISOString(),
          })),
        }
      );
      setActivityLogs(logs);
      setLogsLoading(false);
    };

    fetchData();
  }, []);

  const addActivityLog = async (action: string, entityType?: any, entityId?: string, details?: Record<string, any>) => {
    const operatorName = user?.displayName || user?.email || 'Staf Kasir';
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user: operatorName,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev].slice(0, 100));

    await recordAudit({
      action,
      entityType: entityType || 'menu_item',
      entityId,
      details,
      userName: operatorName,
    });
  };

  const handleAddItem = async (newItemData: Omit<MenuItem, 'id'>) => {
    const tempId = `menu-${Date.now()}`;
    const newItem: MenuItem = {
      ...newItemData,
      id: tempId,
    };
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    addActivityLog(`Menambah produk '${newItemData.name}'`, 'menu_item', tempId, {
      name: newItemData.name,
      price: newItemData.price,
      category: newItemData.category,
    });

    const res = await mutateWithLocalSync('rotikita_menu', updated, () =>
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

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Produk baru berhasil ditambahkan.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Produk tersimpan lokal dan akan disinkronkan saat online.',
      });
    }
  };

  const handleEditItem = async (itemToUpdate: MenuItem) => {
    const updated = menuItems.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    setMenuItems(updated);
    addActivityLog(`Memperbarui produk '${itemToUpdate.name}'`, 'menu_item', itemToUpdate.id, {
      name: itemToUpdate.name,
      price: itemToUpdate.price,
      category: itemToUpdate.category,
    });

    const res = await mutateWithLocalSync('rotikita_menu', updated, () =>
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

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Data produk berhasil diperbarui.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Perubahan tersimpan lokal dan akan disinkronkan saat online.',
      });
    }
  };

  const handleDeleteItem = async (itemToDelete: MenuItem) => {
    const filtered = menuItems.filter(item => item.id !== itemToDelete.id);
    setMenuItems(filtered);
    addActivityLog(`Menghapus produk '${itemToDelete.name}'`, 'menu_item', itemToDelete.id, {
      name: itemToDelete.name,
    });

    const res = await mutateWithLocalSync('rotikita_menu', filtered, () =>
      supabase.from('menu_items').delete().eq('id', itemToDelete.id)
    );

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Produk berhasil dihapus.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Perubahan tersimpan lokal.',
      });
    }
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

  const handleExportLogs = async () => {
    const dataToExport = filteredLogs.map(log => ({
      Waktu: format(parseSafeDate(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      Pengguna: log.user,
      Entitas: log.entityType || '-',
      ID_Entitas: log.entityId || '-',
      Aktivitas: log.action,
      Detail: log.details ? JSON.stringify(log.details) : '-',
    }));

    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Log Aktivitas");
    xlsx.writeFile(wb, `Log_Aktivitas_RotiKita_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-500" />
            Katalog & Master Data
          </h1>
          <p className="text-xs text-muted-foreground">
            Kelola data menu roti, harga jual, margin HPP, serta rekam jejak audit sistem.
          </p>
        </div>
      </div>

      <Tabs defaultValue="menu" className="space-y-4">
        <TabsList className="bg-muted/80 p-1 border border-border">
          <TabsTrigger value="menu" className="text-xs font-semibold data-[state=active]:bg-background">
            Daftar Menu Roti ({menuItems.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-semibold data-[state=active]:bg-background flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Log Aktivitas ({activityLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-4">
          <DataTable
            menuItems={menuItems}
            loading={loading}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="border border-border shadow-sm bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Log Aktivitas Operasional</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Rekam jejak setiap perubahan menu, harga, pesanan, dan persediaan.</CardDescription>
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
                    <TableHead className="w-40 text-xs font-bold">Waktu</TableHead>
                    <TableHead className="w-32 text-xs font-bold">Pengguna</TableHead>
                    <TableHead className="w-28 text-xs font-bold">Entitas</TableHead>
                    <TableHead className="text-xs font-bold">Aktivitas</TableHead>
                    <TableHead className="w-48 text-xs font-bold">Detail Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-28" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-24" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-16" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-48" /></TableCell>
                        <TableCell><div className="h-4 bg-muted animate-pulse rounded w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
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
                        <TableCell className="text-xs">
                          {log.entityType ? (
                            <Badge variant="outline" className="text-[10px] font-mono capitalize">
                              {log.entityType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 max-w-[200px] truncate" title={JSON.stringify(log.details, null, 2)}>
                              {JSON.stringify(log.details)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">-</span>
                          )}
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
