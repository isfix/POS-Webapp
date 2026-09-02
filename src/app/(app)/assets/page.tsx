'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { recordAudit } from '@/actions/audit';
import { useToast } from '@/hooks/use-toast';

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
      const items = await withFallback<Asset>(
        () => supabase.from('assets').select('*').order('name', { ascending: true }),
        'rotikita_assets',
        {
          transform: (data) => data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            quantity: Number(d.quantity || 1),
            price: Number(d.price || d.cost || 0),
            condition: d.condition || 'Baik',
            purchaseDate: d.purchase_date || d.purchaseDate || new Date().toISOString(),
            assignedTo: d.assigned_to || d.assignedTo || '',
            location: d.location || 'Dapur Utama',
            status: d.status || 'Aktif / Digunakan',
            notes: d.notes || '',
            imageUrl: d.image_url || d.imageUrl || '',
            maintenanceDate: d.maintenance_date || d.maintenanceDate || null,
          })),
        }
      );
      setAssets(items);
      setLoading(false);
    };

    fetchSupabaseAssets();
  }, []);

  const handleAddItem = async (newItemData: Omit<Asset, 'id'>) => {
    const tempId = `asset-${Date.now()}`;
    const newItem: Asset = {
      ...newItemData,
      id: tempId,
    };
    const updated = [newItem, ...assets];
    setAssets(updated);

    recordAudit({
      action: `Mendaftarkan peralatan/aset '${newItemData.name}' (${formatCurrency(newItemData.price)})`,
      entityType: 'asset',
      entityId: tempId,
      details: {
        category: newItemData.category,
        quantity: newItemData.quantity,
        location: newItemData.location,
        condition: newItemData.condition,
      },
    });

    const res = await mutateWithLocalSync('rotikita_assets', updated, () =>
      supabase.from('assets').insert([{
        name: newItemData.name,
        category: newItemData.category,
        quantity: newItemData.quantity,
        cost: newItemData.price,
        condition: newItemData.condition,
        purchase_date: newItemData.purchaseDate,
        assigned_to: newItemData.assignedTo,
        location: newItemData.location,
        status: newItemData.status,
        notes: newItemData.notes,
        image_url: newItemData.imageUrl,
        maintenance_date: newItemData.maintenanceDate,
      }])
    );

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Peralatan mesin baru berhasil didaftarkan.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Peralatan tersimpan lokal dan akan disinkronkan saat online.',
      });
    }
  };

  const handleEditItem = async (itemToUpdate: Asset) => {
    const updated = assets.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    setAssets(updated);

    recordAudit({
      action: `Memperbarui data peralatan/aset '${itemToUpdate.name}'`,
      entityType: 'asset',
      entityId: itemToUpdate.id,
      details: {
        condition: itemToUpdate.condition,
        status: itemToUpdate.status,
        location: itemToUpdate.location,
      },
    });

    const res = await mutateWithLocalSync('rotikita_assets', updated, () =>
      supabase.from('assets').update({
        name: itemToUpdate.name,
        category: itemToUpdate.category,
        quantity: itemToUpdate.quantity,
        cost: itemToUpdate.price,
        condition: itemToUpdate.condition,
        purchase_date: itemToUpdate.purchaseDate,
        assigned_to: itemToUpdate.assignedTo,
        location: itemToUpdate.location,
        status: itemToUpdate.status,
        notes: itemToUpdate.notes,
        image_url: itemToUpdate.imageUrl,
        maintenance_date: itemToUpdate.maintenanceDate,
      }).eq('id', itemToUpdate.id)
    );

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Data peralatan berhasil diperbarui.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Perubahan tersimpan lokal dan akan disinkronkan saat online.',
      });
    }
  };

  const handleDeleteItem = async (itemToDelete: Asset) => {
    const filtered = assets.filter(item => item.id !== itemToDelete.id);
    setAssets(filtered);

    recordAudit({
      action: `Menghapus data peralatan/aset '${itemToDelete.name}'`,
      entityType: 'asset',
      entityId: itemToDelete.id,
    });

    const res = await mutateWithLocalSync('rotikita_assets', filtered, () =>
      supabase.from('assets').delete().eq('id', itemToDelete.id)
    );

    if (res.ok) {
      toast({ title: 'Berhasil', description: 'Peralatan berhasil dihapus dari inventaris.' });
    } else {
      toast({
        title: 'Tersimpan Lokal',
        description: 'Gagal sinkron ke database. Perubahan tersimpan lokal.',
      });
    }
  };

  const handleExportAssets = async (dataToExport: Asset[]) => {
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

    const xlsx = await import('xlsx');
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
