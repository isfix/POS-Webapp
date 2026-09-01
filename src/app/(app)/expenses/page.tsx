'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';

import { ExpenseTable, type Expense } from '@/components/expenses/expense-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Calendar, PieChart } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSupabaseExpenses = async () => {
      setLoading(true);
      const items = await withFallback<Expense>(
        () => supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        'rotikita_expenses',
        {
          transform: (data) => data.map((d: any) => ({
            id: d.id,
            title: d.title || d.description || 'Pengeluaran',
            category: d.category,
            amount: Number(d.amount || 0),
            expenseDate: d.expense_date || d.expenseDate || new Date().toISOString(),
            notes: d.notes || d.description || '',
          })),
        }
      );
      setExpenses(items);
      setLoading(false);
    };

    fetchSupabaseExpenses();
  }, []);

  const handleAddItem = async (newItemData: Omit<Expense, 'id' | 'createdAt'>) => {
    const tempId = `exp-${Date.now()}`;
    const newItem: Expense = {
      ...newItemData,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...expenses];
    setExpenses(updated);
    toast({ title: 'Berhasil', description: 'Pengeluaran baru berhasil dicatat.' });

    await mutateWithLocalSync('rotikita_expenses', updated, () =>
      supabase.from('expenses').insert([{
        title: newItemData.title,
        category: newItemData.category,
        amount: newItemData.amount,
        expense_date: newItemData.expenseDate,
        notes: newItemData.notes,
      }])
    );
  };

  const handleEditItem = async (itemToUpdate: Expense) => {
    const updated = expenses.map(item => item.id === itemToUpdate.id ? itemToUpdate : item);
    setExpenses(updated);
    toast({ title: 'Berhasil', description: 'Catatan pengeluaran berhasil diperbarui.' });

    await mutateWithLocalSync('rotikita_expenses', updated, () =>
      supabase.from('expenses').update({
        title: itemToUpdate.title,
        category: itemToUpdate.category,
        amount: itemToUpdate.amount,
        expense_date: itemToUpdate.expenseDate,
        notes: itemToUpdate.notes,
      }).eq('id', itemToUpdate.id)
    );
  };

  const handleDeleteItem = async (itemToDelete: Expense) => {
    const filtered = expenses.filter(item => item.id !== itemToDelete.id);
    setExpenses(filtered);
    toast({ title: 'Berhasil', description: 'Catatan pengeluaran berhasil dihapus.' });

    await mutateWithLocalSync('rotikita_expenses', filtered, () =>
      supabase.from('expenses').delete().eq('id', itemToDelete.id)
    );
  };

  const summaryStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now).getTime();
    const monthEnd = endOfMonth(now).getTime();

    let thisMonthTotal = 0;
    let totalAll = 0;

    const categoryTotals: Record<string, number> = {};

    expenses.forEach((item) => {
      const amount = item.amount || 0;
      totalAll += amount;

      const dateMs = new Date(item.expenseDate).getTime();
      if (dateMs >= monthStart && dateMs <= monthEnd) {
        thisMonthTotal += amount;
      }

      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount;
    });

    let topCategory = '-';
    let topCategoryAmount = 0;

    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    return { thisMonthTotal, totalAll, topCategory, topCategoryAmount };
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Beban Biaya & Pengeluaran Toko</h1>
        <p className="text-xs text-muted-foreground">Catat dan pantau seluruh biaya operasional, utilitas oven, gaji karyawan, dan perawatan.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pengeluaran Bulan Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summaryStats.thisMonthTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total beban operasional berjalan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kategori Biaya Terbesar</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground truncate">{summaryStats.topCategory}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryStats.topCategoryAmount > 0 ? formatCurrency(summaryStats.topCategoryAmount) : 'Belum ada data pengeluaran'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Keseluruhan</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(summaryStats.totalAll)}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} transaksi pengeluaran tercatat</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <ExpenseTable
        expenses={expenses}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        loading={loading}
      />
    </div>
  );
}
