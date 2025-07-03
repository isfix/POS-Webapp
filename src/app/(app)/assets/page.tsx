'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import * as xlsx from 'xlsx';

import { AssetTable, type Asset } from '@/components/assets/asset-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, PackageX, DollarSign } from 'lucide-react';

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
        const q = query(collection(db, 'assets'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items: Asset[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                items.push({ 
                    id: doc.id,
                    ...data,
                    purchaseDate: data.purchaseDate,
                    maintenanceDate: data.maintenanceDate,
                 } as Asset);
            });
            setAssets(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching assets: ", error);
            toast({ title: 'Error', description: 'Could not fetch assets.', variant: 'destructive'});
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

    const handleAddItem = async (newItemData: Omit<Asset, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'assets'), newItemData);
            addActivityLog(`Added new asset '${newItemData.name}' with ID ${docRef.id}`);
            toast({ title: 'Success', description: 'New asset added.' });
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ title: 'Error', description: 'Failed to add asset.', variant: 'destructive' });
        }
    };
    
    const handleEditItem = async (itemToUpdate: Asset) => {
       try {
            const itemDocRef = doc(db, 'assets', itemToUpdate.id);
            const { id, ...dataToUpdate } = itemToUpdate;
            await updateDoc(itemDocRef, dataToUpdate as any);
            addActivityLog(`Updated asset '${itemToUpdate.name}'`);
            toast({ title: 'Success', description: 'Asset updated.' });
       } catch (error) {
            console.error("Error updating document: ", error);
            toast({ title: 'Error', description: 'Failed to update asset.', variant: 'destructive' });
       }
    };

    const handleDeleteItem = async (itemToDelete: Asset) => {
       try {
            await deleteDoc(doc(db, 'assets', itemToDelete.id));
            addActivityLog(`Deleted asset '${itemToDelete.name}'`);
            toast({ title: 'Success', description: 'Asset deleted.' });
       } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: 'Error', description: 'Failed to delete asset.', variant: 'destructive' });
       }
    };

    const handleExport = (filteredData: Asset[]) => {
        toast({ title: "Exporting...", description: "Your Excel file is being generated." });
        
        if (filteredData.length === 0) {
            toast({ title: "No Data", description: "There are no assets to export.", variant: "default" });
            return;
        }

        const dataToExport = filteredData.map(asset => ({
            "Name": asset.name,
            "Category": asset.category,
            "Status": asset.status,
            "Condition": asset.condition,
            "Quantity": asset.quantity,
            "Price (Rp)": asset.price || 0,
            "Total Value (Rp)": (asset.price || 0) * asset.quantity,
            "Location": asset.location,
            "Assigned To": asset.assignedTo || 'N/A',
            "Purchase Date": asset.purchaseDate ? asset.purchaseDate.toDate().toLocaleDateString() : 'N/A',
            "Next Maintenance": asset.maintenanceDate ? asset.maintenanceDate.toDate().toLocaleDateString() : 'N/A',
            "Image URL": asset.imageUrl || 'N/A',
            "Notes": asset.notes || '',
        }));

        const ws = xlsx.utils.json_to_sheet(dataToExport);

        // Calculate column widths
        const colWidths = Object.keys(dataToExport[0]).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row]).length)) + 2
        }));
        ws['!cols'] = colWidths;

        // Apply styles
        const range = xlsx.utils.decode_range(ws['!ref']!);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = xlsx.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                const defaultStyle = {
                    alignment: {
                        horizontal: 'center',
                        vertical: 'center',
                        wrapText: true,
                    },
                    border: {
                        top: { style: 'thin', color: { rgb: "DDDDDD" } },
                        bottom: { style: 'thin', color: { rgb: "DDDDDD" } },
                        left: { style: 'thin', color: { rgb: "DDDDDD" } },
                        right: { style: 'thin', color: { rgb: "DDDDDD" } },
                    }
                };
                
                if (R === 0) {
                     ws[cellRef].s = {
                        ...defaultStyle,
                        font: { bold: true },
                        fill: { fgColor: { rgb: "DDEBF7" } } // A light blue
                     };
                } else {
                    ws[cellRef].s = defaultStyle;
                }
            }
        }
        
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Assets");
        xlsx.writeFile(wb, "BrewFlow_Assets.xlsx");
    };

    const summaryStats = useMemo(() => {
        const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.price || 0) * asset.quantity, 0);
        const inRepairAssets = assets.filter(item => item.status === 'In Repair').length;
        const inactiveAssets = assets.filter(item => item.status === 'Inactive').length;
        return { totalAssetValue, inRepairAssets, inactiveAssets };
    }, [assets]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Asset Management</h1>
                <p className="text-muted-foreground">Track and manage your cafe's physical assets.</p>
            </div>

             <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalAssetValue)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assets In Repair</CardTitle>
                        <Wrench className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.inRepairAssets}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Assets</CardTitle>
                        <PackageX className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaryStats.inactiveAssets}</div>
                    </CardContent>
                </Card>
            </div>

            <AssetTable
                assets={assets}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onExport={handleExport}
                loading={loading}
            />
        </div>
    )
}
