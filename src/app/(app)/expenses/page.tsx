'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import { ExpenseTable, type Expense } from '@/components/expenses/expense-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText, TrendingDown } from 'lucide-react';

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
        const q = query(collection(db, 'expenses'), orderBy('expenseDate', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items: Expense[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                items.push({ 
                    id: doc.id,
                    ...data,
                    expenseDate: data.expenseDate,
                 } as Expense);
            });
            setExpenses(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses: ", error);
            toast({ title: 'Error', description: 'Could not fetch expenses.', variant: 'destructive'});
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addActivityLog = async (action: string) => {
        try {
            await addDoc(collection(db, 'activityLogs'), {
                user: 'Admin', // Assuming the user is always Admin for now
                action,
                timestamp: Timestamp.now(),
            });
        } catch (error) {
            console.error("Error adding activity log: ", error);
        }
    };

    const handleAddItem = async (newItemData: Omit<Expense, 'id' | 'createdAt'>) => {
        try {
            const dataWithTimestamp = { ...newItemData, createdAt: Timestamp.now() };
            const docRef = await addDoc(collection(db, 'expenses'), dataWithTimestamp);
            addActivityLog(`Added new expense '${newItemData.title}' for ${formatCurrency(newItemData.amount)}`);
            toast({ title: 'Success', description: 'New expense added.' });
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ title: 'Error', description: 'Failed to add expense.', variant: 'destructive' });
        }
    };
    
    const handleEditItem = async (itemToUpdate: Expense) => {
       try {
            const itemDocRef = doc(db, 'expenses', itemToUpdate.id);
            const { id, createdAt, ...dataToUpdate } = itemToUpdate;
            await updateDoc(itemDocRef, dataToUpdate as any);
            addActivityLog(`Updated expense '${itemToUpdate.title}'`);
            toast({ title: 'Success', description: 'Expense updated.' });
       } catch (error) {
            console.error("Error updating document: ", error);
            toast({ title: 'Error', description: 'Failed to update expense.', variant: 'destructive' });
       }
    };

    const handleDeleteItem = async (itemToDelete: Expense) => {
       try {
            await deleteDoc(doc(db, 'expenses', itemToDelete.id));
            addActivityLog(`Deleted expense '${itemToDelete.title}'`);
            toast({ title: 'Success', description: 'Expense deleted.' });
       } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: 'Error', description: 'Failed to delete expense.', variant: 'destructive' });
       }
    };

    const summaryStats = useMemo(() => {
        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        const thisMonthExpenses = expenses.filter(expense => 
            isWithinInterval(expense.expenseDate.toDate(), { start: monthStart, end: monthEnd })
        );

        const totalMonthExpense = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        const categoryTotals: { [key: string]: number } = {};
        thisMonthExpenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });

        const topCategory = Object.entries(categoryTotals).reduce((top, current) => {
            return current[1] > top.amount ? { category: current[0], amount: current[1] } : top;
        }, { category: 'N/A', amount: 0 });

        return { totalMonthExpense, topCategory };
    }, [expenses]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Expense Tracking</h1>
                <p className="text-muted-foreground">Monitor all operational costs for your cafe.</p>
            </div>

             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
                        <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalMonthExpense)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Spending Category (Month)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.topCategory.category}</div>
                        <p className="text-xs text-muted-foreground">{formatCurrency(summaryStats.topCategory.amount)} spent</p>
                    </CardContent>
                </Card>
            </div>

            <ExpenseTable
                expenses={expenses}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                loading={loading}
            />
        </div>
    )
}
