'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

import { InventoryTable, type InventoryItem } from '@/components/inventory/inventory-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Layers } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSupabaseInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          const items: InventoryItem[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            quantity: Number(d.quantity || 0),
            unitType: d.unit_type || d.unitType || 'kg',
            minThreshold: Number(d.min_threshold || d.minThreshold || 0),
            supplier: d.supplier || '',
            expirationDate: d.expiration_date || d.expirationDate,
            costPerUnit: Number(d.cost_per_unit || d.costPerUnit || 0),
            lastUpdated: d.updated_at || d.lastUpdated || new Date().toISOString(),
          }));
          setInventoryItems(items);
          localStorage.setItem('pos_inventory', JSON.stringify(items));
        } else {
          const saved = localStorage.getItem('pos_inventory');
          if (saved) setInventoryItems(JSON.parse(saved));
        }
      } catch (e) {
        const saved = localStorage.getItem('pos_inventory');
        if (saved) setInventoryItems(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseInventory();
  }, []);
  
  const saveLocalInventory = (items: InventoryItem[]) => {
    setInventoryItems(items);
    try {
      localStorage.setItem('pos_inventory', JSON.stringify(items));
    } catch (e) {}
  };

  const handleAddItem = async (newItemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const tempId = `inv-${Date.now()}`;
    const newItem: InventoryItem = {
      ...newItemData,
      id: tempId,
      lastUpdated: new Date().toISOString(),
    };
    const updated = [newItem, ...inventoryItems];
    saveLocalInventory(updated);
    toast({ title: 'Berhasil', description: 'Stok bahan baku baru berhasil ditambahkan.' });

    try {
      const { data, error } = await supabase.from('inventory').insert([{
        name: newItemData.name,
        category: newItemData.category,
        quantity: newItemData.quantity,
        unit_type: newItemData.unitType,
        min_threshold: newItemData.minThreshold,
        supplier: newItemData.supplier,
        expiration_date: newItemData.expirationDate,
        cost_per_unit: newItemData.costPerUnit,
      }]).select().single();

      if (data && !error) {
        setInventoryItems(prev => prev.map(item => item.id === tempId ? {
          ...item,
          id: data.id,
          lastUpdated: data.updated_at || item.lastUpdated,
        } : item));
      }
    } catch (error) {
      console.warn("Saved to local storage fallback");
    }
  };
  
  const handleEditItem = async (itemToUpdate: InventoryItem) => {
    const updated = inventoryItems.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    saveLocalInventory(updated);
    toast({ title: 'Berhasil', description: 'Data bahan baku berhasil diperbarui.' });

    try {
      await supabase.from('inventory').update({
        name: itemToUpdate.name,
        category: itemToUpdate.category,
        quantity: itemToUpdate.quantity,
        unit_type: itemToUpdate.unitType,
        min_threshold: itemToUpdate.minThreshold,
        supplier: itemToUpdate.supplier,
        expiration_date: itemToUpdate.expirationDate,
        cost_per_unit: itemToUpdate.costPerUnit,
      }).eq('id', itemToUpdate.id);
    } catch (error) {
      console.warn("Updated local storage fallback");
    }
  };

  const handleDeleteItem = async (itemToDelete: InventoryItem) => {
    const filtered = inventoryItems.filter(item => item.id !== itemToDelete.id);
    saveLocalInventory(filtered);
    toast({ title: 'Berhasil', description: 'Bahan baku berhasil dihapus.' });

    try {
      await supabase.from('inventory').delete().eq('id', itemToDelete.id);
    } catch (error) {
      console.warn("Deleted from local storage fallback");
    }
  };

  const summaryStats = useMemo(() => {
    const totalValue = inventoryItems.reduce((acc, item) => acc + (item.quantity * item.costPerUnit), 0);
    const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minThreshold).length;
    const totalItemTypes = inventoryItems.length;
    return { totalValue, lowStockItems, totalItemTypes };
  }, [inventoryItems]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Stok Bahan & Logistik</h1>
        <p className="text-xs text-muted-foreground">Kelola persediaan bahan baku, stok barang, dan logistik toko.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nilai Stok Bahan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summaryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Estimasi aset bahan baku</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Jenis Bahan</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{summaryStats.totalItemTypes} Jenis</div>
            <p className="text-xs text-muted-foreground mt-1">Bahan aktif terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bahan Kritis / Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${summaryStats.lowStockItems > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {summaryStats.lowStockItems} Bahan
            </div>
            <p className="text-xs text-muted-foreground mt-1">Stok di bawah batas minimum</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <InventoryTable
        inventoryItems={inventoryItems}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        loading={loading}
      />
    </div>
  );
}
