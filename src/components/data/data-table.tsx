'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Loader2, FileDown, Search, Filter, Image as ImageIcon } from 'lucide-react';
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
import { supabase, supabaseBucketName } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import * as xlsx from 'xlsx';


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
    costPrice: string;
    imageFile?: File | null;
    imageUrl?: string;
    ingredients: string; // Stored as comma-separated string in the form
    availability: boolean;
}

type DataTableProps = {
    menuItems: MenuItem[];
    onAddItem: (newItemData: Omit<MenuItem, 'id'>) => void;
    onEditItem: (item: MenuItem) => void;
    onDeleteItem: (item: MenuItem) => void;
}

const emptyFormState: ItemFormData = { name: '', category: '', price: '', costPrice: '', imageFile: null, imageUrl: '', ingredients: '', availability: true };

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
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const menuCategories = useMemo(() => {
    return [...new Set(menuItems.map(item => item.category))];
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
      const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [menuItems, categoryFilter, searchQuery]);
  
  useEffect(() => {
    if (formData.imageFile) {
      const url = URL.createObjectURL(formData.imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [formData.imageFile]);


  const handleOpenForm = (item: MenuItem | null = null) => {
    if (item) {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            price: item.price.toString(),
            costPrice: (item.costPrice || 0).toString(),
            imageUrl: item.imageUrl || '',
            imageFile: null,
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
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, imageFile: e.target.files![0] }));
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, availability: checked }));
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.price || !formData.costPrice) {
        toast({ title: 'Error', description: 'Please fill all required fields (Name, Category, Price, Cost).', variant: 'destructive' });
        return;
    }
    
    setUploading(true);

    let uploadedImageUrl = editingItem?.imageUrl || '';

    if (formData.imageFile) {
        const file = formData.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from(supabaseBucketName!)
            .upload(filePath, file, {
                contentType: file.type
            });

        if (uploadError) {
            toast({ title: 'Upload Error', description: uploadError.message, variant: 'destructive' });
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from(supabaseBucketName!)
            .getPublicUrl(filePath);
        
        if (urlData?.publicUrl) {
            uploadedImageUrl = urlData.publicUrl;
        } else {
            toast({ title: 'Error', description: 'Could not get public URL for the uploaded image.', variant: 'destructive' });
            setUploading(false);
            return;
        }
    }

    const submissionData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice),
        imageUrl: uploadedImageUrl,
        ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        availability: formData.availability,
    };

    if (editingItem) {
        onEditItem({ ...submissionData, id: editingItem.id });
    } else {
        onAddItem(submissionData);
    }

    setUploading(false);
    setIsFormOpen(false);
  }

  const handleExport = () => {
    if (filteredMenuItems.length === 0) {
      toast({ title: 'No Data', description: 'There is nothing to export.', variant: 'default' });
      return;
    }
    toast({ title: 'Exporting...', description: 'Your Excel file is being generated.' });

    const dataToExport = filteredMenuItems.map(item => ({
      "Name": item.name,
      "Category": item.category,
      "Cost (Rp)": item.costPrice || 0,
      "Price (Rp)": item.price,
      "Availability": item.availability ? 'Available' : 'Unavailable',
      "Ingredients": item.ingredients?.join(', '),
      "Image URL": item.imageUrl,
    }));

    const ws = xlsx.utils.json_to_sheet(dataToExport);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Menu Items");
    xlsx.writeFile(wb, "BrewFlow_MenuItems.xlsx");
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle>Menu Items</CardTitle>
                    <CardDescription>View, edit, or delete menu items.</CardDescription>
                </div>
                 <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                    <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search menu items..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                     <div className="flex items-center gap-2 text-sm font-semibold text-nowrap">
                        <Filter className="h-4 w-4" />
                        Filter:
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-[240px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {menuCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
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
                        {filteredMenuItems.map((item) => (
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
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                    <Label htmlFor="imageFile">Image</Label>
                     <div className="mt-2 flex items-center justify-center rounded-lg border border-dashed border-input p-6">
                        {(previewUrl || formData.imageUrl) ? (
                             <div className="relative group w-32 h-32">
                                <img src={previewUrl || formData.imageUrl} alt="Preview" className="h-full w-full object-cover rounded-md" />
                                <label htmlFor="imageFile" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md">
                                    Change
                                </label>
                                 <Input id="imageFile" name="imageFile" type="file" className="sr-only" accept="image/*" onChange={handleImageChange}/>
                            </div>
                        ) : (
                            <div className="text-center">
                                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                                    <label htmlFor="imageFile" className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80">
                                        <span>Upload a file</span>
                                        <Input id="imageFile" name="imageFile" type="file" className="sr-only" accept="image/*" onChange={handleImageChange}/>
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-muted-foreground">PNG, JPG up to 2MB</p>
                            </div>
                        )}
                    </div>
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
                <Button type="submit" onClick={handleSubmit} disabled={uploading}>
                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
