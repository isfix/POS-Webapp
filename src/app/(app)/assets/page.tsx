'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';

import { AssetTable, type Asset } from '@/components/assets/asset-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, CheckCircle2, ShieldAlert } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSupabaseAssets = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          const items: Asset[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            quantity: Number(d.quantity || 1),
            price: Number(d.price || 0),
            condition: d.condition || 'Baik',
            purchaseDate: d.purchase_date || d.purchaseDate || new Date().toISOString(),
            assignedTo: d.assigned_to || d.assignedTo || '',
            location: d.location || 'Dapur Utama',
            status: d.status || 'Aktif / Digunakan',
            notes: d.notes || '',
            imageUrl: d.image_url || d.imageUrl || '',
            maintenanceDate: d.maintenance_date || d.maintenanceDate || null,
          }));
          setAssets(items);
          localStorage.setItem('pos_assets', JSON.stringify(items));
        } else {
          const saved = localStorage.getItem('pos_assets');
          if (saved) setAssets(JSON.parse(saved));
        }
      } catch (e) {
        const saved = localStorage.getItem('pos_assets');
        if (saved) setAssets(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseAssets();
  }, []);

  const saveLocalAssets = (items: Asset[]) => {
    setAssets(items);
    try {
      localStorage.setItem('pos_assets', JSON.stringify(items));
    } catch (e) {}
  };

  const handleAddItem = async (newItemData: Omit<Asset, 'id'>) => {
    const tempId = `asset-${Date.now()}`;
    const newItem: Asset = {
      ...newItemData,
      id: tempId,
    };
    saveLocalAssets([newItem, ...assets]);
    toast({ title: 'Berhasil', description: 'Peralatan mesin baru berhasil didaftarkan.' });

    try {
      const { data, error } = await supabase.from('assets').insert([{
        name: newItemData.name,
        category: newItemData.category,
        quantity: newItemData.quantity,
        price: newItemData.price,
        condition: newItemData.condition,
        purchase_date: newItemData.purchaseDate,
        assigned_to: newItemData.assignedTo,
        location: newItemData.location,
        status: newItemData.status,
        notes: newItemData.notes,
        image_url: newItemData.imageUrl,
        maintenance_date: newItemData.maintenanceDate,
      }]).select().single();

      if (data && !error) {
        setAssets(prev => prev.map(a => a.id === tempId ? { ...a, id: data.id } : a));
      }
    } catch (error) {
      console.warn("Saved to local storage fallback");
    }
  };

  const handleEditItem = async (itemToUpdate: Asset) => {
    const updated = assets.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    saveLocalAssets(updated);
    toast({ title: 'Berhasil', description: 'Data peralatan berhasil diperbarui.' });

    try {
      await supabase.from('assets').update({
        name: itemToUpdate.name,
        category: itemToUpdate.category,
        quantity: itemToUpdate.quantity,
        price: itemToUpdate.price,
        condition: itemToUpdate.condition,
        purchase_date: itemToUpdate.purchaseDate,
        assigned_to: itemToUpdate.assignedTo,
        location: itemToUpdate.location,
        status: itemToUpdate.status,
        notes: itemToUpdate.notes,
        image_url: itemToUpdate.imageUrl,
        maintenance_date: itemToUpdate.maintenanceDate,
      }).eq('id', itemToUpdate.id);
    } catch (error) {
      console.warn("Saved to local storage fallback");
    }
  };

  const handleDeleteItem = async (itemToDelete: Asset) => {
    const filtered = assets.filter(item => item.id !== itemToDelete.id);
    saveLocalAssets(filtered);
    toast({ title: 'Berhasil', description: 'Peralatan berhasil dihapus dari inventaris.' });

    try {
      await supabase.from('assets').delete().eq('id', itemToDelete.id);
    } catch (error) {
      console.warn("Saved to local store fallback");
    }
  };

  const handleExportAssets = (dataToExport: Asset[]) => {
    if (dataToExport.length === 0) {
      toast({ title: 'Data Kosong', description: 'Tidak ada data aset untuk diekspor.', variant: 'default' });
      return;
    }
    toast({ title: 'Mengekspor...', description: 'File Excel aset sedang dipersiapkan.' });
    const formatted = dataToExport.map(item => ({
      'Nama Peralatan': item.name,
      'Kategori': item.category,
      'Jumlah Unit': item.quantity,
      'Harga Perolehan (Rp)': item.price,
      'Total Nilai (Rp)': item.price * item.quantity,
      'Kondisi': item.condition,
      'Status Operasional': item.status,
      'Lokasi': item.location,
      'Penanggung Jawab': item.assignedTo || '-',
      'Tanggal Beli': item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('id-ID') : '-',
      'Jadwal Servis Berikutnya': item.maintenanceDate ? new Date(item.maintenanceDate).toLocaleDateString('id-ID') : '-',
      'Catatan': item.notes || '',
    }));

    const ws = xlsx.utils.json_to_sheet(formatted);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Daftar Aset");
    xlsx.writeFile(wb, "Daftar_Aset_Peralatan.xlsx");
    toast({ title: 'Selesai', description: 'Daftar aset berhasil diunduh dalam format Excel.' });
  };

  const summaryStats = useMemo(() => {
    let totalAssetValue = 0;
    let activeUnits = 0;
    let needsServiceUnits = 0;

    assets.forEach((item) => {
      const val = (item.price || 0) * (item.quantity || 1);
      totalAssetValue += val;

      if (item.status === 'Aktif / Digunakan' && item.condition !== 'Rusak Total') {
        activeUnits += item.quantity || 1;
      }
      if (item.condition === 'Perlu Servis' || item.condition === 'Rusak Total' || item.status === 'Dalam Perbaikan') {
        needsServiceUnits += item.quantity || 1;
      }
    });

    return { totalAssetValue, activeUnits, needsServiceUnits };
  }, [assets]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Inventaris Mesin & Peralatan Toko</h1>
        <p className="text-xs text-muted-foreground">Kelola oven, mixer, showcase etalase, dan pemeliharaan servis berkala mesin bakery.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nilai Investasi Peralatan</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summaryStats.totalAssetValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Estimasi nilai buku aset peralatan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peralatan Siap Operasi</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600">{summaryStats.activeUnits} Unit</div>
            <p className="text-xs text-muted-foreground mt-1">Kondisi baik & prima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Perlu Perbaikan / Servis</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${summaryStats.needsServiceUnits > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {summaryStats.needsServiceUnits} Unit
            </div>
            <p className="text-xs text-muted-foreground mt-1">Memerlukan perhatian teknisi</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <AssetTable
        assets={assets}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onExport={handleExportAssets}
        loading={loading}
      />
    </div>
  );
}
