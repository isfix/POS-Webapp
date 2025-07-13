'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { InventoryTable, type InventoryItem } from '@/components/inventory/inventory-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle } from 'lucide-react';

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
        const q = query(collection(db, 'inventory'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items: InventoryItem[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                items.push({ 
                    id: doc.id,
                    ...data,
                    // Ensure timestamps are correctly handled if they exist
                    expirationDate: data.expirationDate instanceof Timestamp ? data.expirationDate : undefined,
                    lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated : Timestamp.now(),
                 } as InventoryItem);
            });
            setInventoryItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inventory items: ", error);
            toast({ title: 'Error', description: 'Could not fetch inventory items.', variant: 'destructive'});
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

    const handleAddItem = async (newItemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
        try {
            const dataWithTimestamp = { ...newItemData, lastUpdated: Timestamp.now() };
            const docRef = await addDoc(collection(db, 'inventory'), dataWithTimestamp);
            addActivityLog(`Added new inventory item '${newItemData.name}' with ID ${docRef.id}`);
            toast({ title: 'Success', description: 'New inventory item added.' });
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ title: 'Error', description: 'Failed to add inventory item.', variant: 'destructive' });
        }
    };
    
    const handleEditItem = async (itemToUpdate: InventoryItem) => {
       try {
            const itemDocRef = doc(db, 'inventory', itemToUpdate.id);
            const { id, ...dataToUpdate } = itemToUpdate;
            const dataWithTimestamp = { ...dataToUpdate, lastUpdated: Timestamp.now() };
            await updateDoc(itemDocRef, dataWithTimestamp as any);
            addActivityLog(`Updated inventory item '${itemToUpdate.name}'`);
            toast({ title: 'Success', description: 'Inventory item updated.' });
       } catch (error) {
            console.error("Error updating document: ", error);
            toast({ title: 'Error', description: 'Failed to update inventory item.', variant: 'destructive' });
       }
    };

    const handleDeleteItem = async (itemToDelete: InventoryItem) => {
       try {
            await deleteDoc(doc(db, 'inventory', itemToDelete.id));
            addActivityLog(`Deleted inventory item '${itemToDelete.name}'`);
            toast({ title: 'Success', description: 'Inventory item deleted.' });
       } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: 'Error', description: 'Failed to delete inventory item.', variant: 'destructive' });
       }
    };

    const summaryStats = useMemo(() => {
        const totalValue = inventoryItems.reduce((acc, item) => acc + (item.quantity * item.costPerUnit), 0);
        const lowStockItems = inventoryItems.filter(item => item.quantity <= item.minThreshold).length;
        return { totalValue, lowStockItems };
    }, [inventoryItems]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Inventory Management</h1>
                <p className="text-muted-foreground">Track and manage your cafe's stock levels.</p>
            </div>

             <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Items Below Threshold</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.lowStockItems}</div>
                    </CardContent>
                </Card>
            </div>

            <InventoryTable
                inventoryItems={inventoryItems}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                loading={loading}
            />
        </div>
    )
}
