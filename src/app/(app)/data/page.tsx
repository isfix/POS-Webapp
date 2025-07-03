'use client';

import { useState, useEffect, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { DataTable, type MenuItem } from '@/components/data/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as xlsx from 'xlsx';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type ActivityLog = {
    id: string;
    user: string;
    action: string;
    timestamp: Timestamp;
};

export default function DataManagementPage() {
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
        const menuQuery = query(collection(db, 'menuItems'), orderBy('name'));
        const unsubscribeMenu = onSnapshot(menuQuery, (querySnapshot) => {
            const items: MenuItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as MenuItem);
            });
            setMenuItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching menu items: ", error);
            toast({ title: 'Error', description: 'Could not fetch menu items.', variant: 'destructive'});
            setLoading(false);
        });

        const logQuery = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
        const unsubscribeLogs = onSnapshot(logQuery, (querySnapshot) => {
            const logs: ActivityLog[] = [];
            querySnapshot.forEach((doc) => {
                logs.push({ id: doc.id, ...doc.data() } as ActivityLog);
            });
            setActivityLogs(logs);
            setLogsLoading(false);
        }, (error) => {
            console.error("Error fetching activity logs: ", error);
            toast({ title: 'Error', description: 'Could not fetch activity logs.', variant: 'destructive'});
            setLogsLoading(false);
        });

        return () => {
            unsubscribeMenu();
            unsubscribeLogs();
        };
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
            toast({ title: 'Error', description: 'Failed to record activity.', variant: 'destructive' });
        }
    };

    const handleAddItem = async (newItemData: Omit<MenuItem, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, 'menuItems'), newItemData);
            addActivityLog(`Added new item '${newItemData.name}' with ID ${docRef.id}`);
            toast({ title: 'Success', description: 'New menu item added.' });
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ title: 'Error', description: 'Failed to add menu item.', variant: 'destructive' });
        }
    };

    const handleEditItem = async (itemToUpdate: MenuItem) => {
       try {
            const itemDocRef = doc(db, 'menuItems', itemToUpdate.id);
            // The itemToUpdate contains the id, which we don't want to write to the doc itself.
            const { id, ...dataToUpdate } = itemToUpdate;
            await updateDoc(itemDocRef, dataToUpdate);
            addActivityLog(`Updated item '${itemToUpdate.name}'`);
            toast({ title: 'Success', description: 'Menu item updated.' });
       } catch (error) {
            console.error("Error updating document: ", error);
            toast({ title: 'Error', description: 'Failed to update menu item.', variant: 'destructive' });
       }
    };

    const handleDeleteItem = async (itemToDelete: MenuItem) => {
       try {
            await deleteDoc(doc(db, 'menuItems', itemToDelete.id));
            addActivityLog(`Deleted item '${itemToDelete.name}'`);
            toast({ title: 'Success', description: 'Menu item deleted.' });
       } catch (error) {
            console.error("Error deleting document: ", error);
            toast({ title: 'Error', description: 'Failed to delete menu item.', variant: 'destructive' });
       }
    };

    const filteredLogs = useMemo(() => {
        if (!dateRange?.from) return activityLogs;
        
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        return activityLogs.filter(log => {
            const logDate = log.timestamp.toDate();
            return logDate >= fromDate && logDate <= toDate;
        });
    }, [activityLogs, dateRange]);


    const handleExportLogs = () => {
        if (filteredLogs.length === 0) {
            toast({ title: 'No Data', description: 'There is no activity in the selected date range to export.', variant: 'default' });
            return;
        }

        toast({ title: 'Exporting...', description: 'Your activity log is being generated.' });
        
        const dataToExport = filteredLogs.map(log => ({
            Timestamp: log.timestamp.toDate().toLocaleString(),
            User: log.user,
            Action: log.action,
        }));

        const exportFileName = `BrewFlow_ActivityLog_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_to_${format(dateRange?.to || dateRange?.from || new Date(), 'yyyy-MM-dd')}.xlsx`;

        const ws = xlsx.utils.json_to_sheet(dataToExport);

        // Calculate column widths
        const colWidths = Object.keys(dataToExport[0]).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row]).length)) + 2
        }));
        if (colWidths[2]) colWidths[2].wch = 60; // Make 'Action' column wider
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
                    },
                };
                
                if (R === 0) {
                     ws[cellRef].s = {
                        ...defaultStyle,
                        font: { bold: true },
                        fill: { fgColor: { rgb: "FFF2CC" } } // Light Yellow
                     };
                } else {
                    ws[cellRef].s = defaultStyle;
                }
            }
        }
        
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Activity Log");
        xlsx.writeFile(wb, exportFileName);
    };
    
    const renderLogTableBody = () => {
        if (logsLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
            ));
        }

        if (filteredLogs.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        No activity found for the selected date range.
                    </TableCell>
                </TableRow>
            );
        }

        return filteredLogs.map(log => (
            <TableRow key={log.id} className="[&_td:not(:last-child)]:border-r">
                <TableCell className="font-medium">{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.timestamp.toDate().toLocaleString()}</TableCell>
            </TableRow>
        ));
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Data Management</h1>
                <p className="text-muted-foreground">Full control to edit and delete all inputs from Firestore.</p>
            </div>
            <DataTable 
                menuItems={menuItems}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
            />
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>
                                Real-time log of all create, update, and delete actions. 
                                Showing {filteredLogs.length} of {activityLogs.length} total entries.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                            <Button variant="outline" onClick={handleExportLogs} className="w-full sm:w-auto">
                                <FileDown className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-accent">
                                <TableRow className="[&_th:not(:last-child)]:border-r">
                                    <TableHead className="w-[120px]">User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead className="w-[200px]">Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {renderLogTableBody()}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
