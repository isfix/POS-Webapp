'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MoreHorizontal, PlusCircle } from 'lucide-react';
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
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number; // New field
  imageUrl?: string;
  ingredients?: string[];
  availability: boolean;
};

type ItemFormData = {
    name: string;
    category: string;
    price: string;
    costPrice: string; // New field
    imageUrl: string;
    ingredients: string; // Stored as comma-separated string in the form
    availability: boolean;
}

type DataTableProps = {
    menuItems: MenuItem[];
    onAddItem: (newItemData: Omit<MenuItem, 'id'>) => void;
    onEditItem: (item: MenuItem) => void;
    onDeleteItem: (item: MenuItem) => void;
}

const emptyFormState: ItemFormData = { name: '', category: '', price: '', costPrice: '', imageUrl: '', ingredients: '', availability: true };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export function DataTable({ menuItems, onAddItem, onEditItem, onDeleteItem }: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const { toast } = useToast();

  const handleOpenForm = (item: MenuItem | null = null) => {
    if (item) {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            price: item.price.toString(),
            costPrice: (item.costPrice || 0).toString(), // Handle existing items
            imageUrl: item.imageUrl || '',
            ingredients: item.ingredients?.join(', ') || '',
            availability: item.availability,
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

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, availability: checked }));
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.price || !formData.costPrice) {
        toast({ title: 'Error', description: 'Please fill all required fields (Name, Category, Price, Cost).', variant: 'destructive' });
        return;
    }

    const submissionData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice),
        imageUrl: formData.imageUrl,
        ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        availability: formData.availability,
    };

    if (editingItem) {
        onEditItem({ ...submissionData, id: editingItem.id });
    } else {
        onAddItem(submissionData);
    }

    setIsFormOpen(false);
  }

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle>Menu Items</CardTitle>
                    <CardDescription>View, edit, or delete menu items.</CardDescription>
                </div>
                <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader className="bg-accent">
                        <TableRow className="[&_th:not(:last-child)]:border-r">
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Availability</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {menuItems.map((item) => (
                            <TableRow key={item.id} className="[&_td:not(:last-child)]:border-r">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.costPrice || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                            <TableCell>
                                <Badge variant={item.availability ? 'default' : 'outline'} className={item.availability ? 'bg-green-500/20 text-green-700' : ''}>
                                    {item.availability ? 'Available' : 'Unavailable'}
                                </Badge>
                            </TableCell>
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
                                        <DropdownMenuItem onClick={() => onDeleteItem(item)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>

        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
                <DialogDescription>
                Enter the details for the item. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Americano"/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" value={formData.category} onChange={handleInputChange} placeholder="e.g. Coffee" />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="costPrice">Cost (Rp)</Label>
                        <Input id="costPrice" name="costPrice" type="number" value={formData.costPrice} onChange={handleInputChange} placeholder="e.g. 15000"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Price (Rp)</Label>
                        <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="e.g. 30000"/>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://... (Optional)"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ingredients">Ingredients</Label>
                    <Input id="ingredients" name="ingredients" value={formData.ingredients} onChange={handleInputChange} placeholder="e.g. coffee, water (optional)"/>
                </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Switch id="availability" checked={formData.availability} onCheckedChange={handleSwitchChange} />
                    <Label htmlFor="availability">Available for Sale</Label>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
