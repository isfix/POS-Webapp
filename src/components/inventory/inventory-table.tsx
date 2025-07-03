'use client';

import { useState, useMemo } from 'react';
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';


export type InventoryItem = {
  id: string;
  name: string;
  category: 'Ingredients' | 'Packaging' | 'Equipment' | 'Cleaning Supplies' | 'Business Supplies';
  quantity: number;
  unitType: string;
  minThreshold: number;
  supplier?: string;
  expirationDate?: Timestamp;
  costPerUnit: number;
  lastUpdated: Timestamp;
};

const itemCategories = ['Ingredients', 'Packaging', 'Equipment', 'Cleaning Supplies', 'Business Supplies'] as const;

type ItemFormData = {
    name: string;
    category: typeof itemCategories[number];
    quantity: string;
    unitType: string;
    minThreshold: string;
    supplier: string;
    expirationDate?: Date;
    costPerUnit: string;
}

type DataTableProps = {
    inventoryItems: InventoryItem[];
    onAddItem: (newItemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
    onEditItem: (item: InventoryItem) => void;
    onDeleteItem: (item: InventoryItem) => void;
    loading: boolean;
}

const emptyFormState: ItemFormData = { 
    name: '',
    category: 'Ingredients', 
    quantity: '', 
    unitType: '', 
    minThreshold: '', 
    supplier: '', 
    expirationDate: undefined, 
    costPerUnit: '' 
};

export function InventoryTable({ inventoryItems, onAddItem, onEditItem, onDeleteItem, loading }: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventoryItems, searchQuery]);

  const handleOpenForm = (item: InventoryItem | null = null) => {
    if (item) {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            quantity: item.quantity.toString(),
            unitType: item.unitType,
            minThreshold: item.minThreshold.toString(),
            supplier: item.supplier || '',
            expirationDate: item.expirationDate ? item.expirationDate.toDate() : undefined,
            costPerUnit: item.costPerUnit.toString()
        });
    } else {
        setEditingItem(null);
        setFormData(emptyFormState);
    }
    setIsFormOpen(true);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const handleSubmit = () => {
    // Basic validation
    if (!formData.name || !formData.category || !formData.quantity || !formData.unitType || !formData.minThreshold || !formData.costPerUnit) {
        toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
        return;
    }

    const submissionData = {
        name: formData.name,
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unitType: formData.unitType,
        minThreshold: parseFloat(formData.minThreshold),
        supplier: formData.supplier,
        expirationDate: formData.expirationDate ? Timestamp.fromDate(formData.expirationDate) : undefined,
        costPerUnit: parseFloat(formData.costPerUnit),
    };

    if (editingItem) {
        onEditItem({ ...submissionData, id: editingItem.id, lastUpdated: Timestamp.now() });
    } else {
        onAddItem(submissionData as Omit<InventoryItem, 'id' | 'lastUpdated'>);
    }

    setIsFormOpen(false);
  }
  
  const renderTableBody = () => {
    if (loading) {
        return Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
        ));
    }
    
    if (filteredItems.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                    {searchQuery ? `No items found for "${searchQuery}"` : "No inventory items found."}
                </TableCell>
            </TableRow>
        );
    }

    return filteredItems.map((item) => {
        const isLowStock = item.quantity <= item.minThreshold;
        return (
            <TableRow key={item.id} className={cn("[&_td:not(:last-child)]:border-r", isLowStock && 'bg-destructive/10')}>
                <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                    <span className={cn(isLowStock && 'text-destructive font-bold')}>
                        {item.quantity}
                    </span>
                    <span className="text-muted-foreground"> / {item.minThreshold}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{item.unitType}</TableCell>
                <TableCell className="whitespace-nowrap">{item.expirationDate ? format(item.expirationDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        );
    });
  }

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Inventory Items</CardTitle>
                    <CardDescription>View, edit, or delete inventory items.</CardDescription>
                </div>
                <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search inventory by name..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader className="bg-accent">
                            <TableRow className="[&_th:not(:last-child)]:border-r">
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Quantity / Threshold</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderTableBody()}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>

        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
                <DialogDescription>
                    Enter the details for the stock item. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(p => ({...p, category: value as any}))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                           {itemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="unitType">Unit Type</Label>
                        <Input id="unitType" name="unitType" value={formData.unitType} onChange={handleInputChange} placeholder="e.g. kg, pack"/>
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="minThreshold">Low Stock Threshold</Label>
                        <Input id="minThreshold" name="minThreshold" type="number" value={formData.minThreshold} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="costPerUnit">Cost per Unit (Rp)</Label>
                        <Input id="costPerUnit" name="costPerUnit" type="number" value={formData.costPerUnit} onChange={handleInputChange} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input id="supplier" name="supplier" value={formData.supplier} onChange={handleInputChange} placeholder="(Optional)" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.expirationDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expirationDate ? format(formData.expirationDate, "PPP") : <span>Pick a date (Optional)</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={formData.expirationDate}
                                onSelect={(date) => setFormData(p => ({...p, expirationDate: date || undefined}))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
