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
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, FileDown, Search, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { supabase, supabaseBucketName } from '@/lib/supabase';
import * as xlsx from 'xlsx';

export type Asset = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  condition: string;
  purchaseDate: Timestamp;
  assignedTo?: string;
  location: string;
  maintenanceDate?: Timestamp | null;
  status: string;
  notes?: string;
  imageUrl?: string;
};

const assetCategories = ['Equipment', 'Furniture', 'Electronics', 'Decor', 'Other'] as const;
const assetConditions = ['New', 'Good', 'Used', 'Needs Repair'] as const;
const assetStatuses = ['Active', 'Inactive', 'In Repair', 'Retired'] as const;

type ItemFormData = {
    name: string;
    category: typeof assetCategories[number];
    otherCategory: string;
    quantity: string;
    price: string;
    condition: typeof assetConditions[number];
    purchaseDate?: Date;
    assignedTo: string;
    location: string;
    maintenanceDate?: Date;
    status: typeof assetStatuses[number];
    notes: string;
    imageFile?: File | null;
    imageUrl?: string;
};

type DataTableProps = {
    assets: Asset[];
    onAddItem: (newItemData: Omit<Asset, 'id'>) => void;
    onEditItem: (item: Asset) => void;
    onDeleteItem: (item: Asset) => void;
    onExport: (data: Asset[]) => void;
    loading: boolean;
};

const emptyFormState: ItemFormData = { 
    name: '',
    category: 'Equipment',
    otherCategory: '',
    quantity: '1',
    price: '',
    condition: 'Good',
    purchaseDate: new Date(),
    assignedTo: '',
    location: '',
    maintenanceDate: undefined,
    status: 'Active',
    notes: '',
    imageFile: null,
    imageUrl: '',
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export function AssetTable({ assets, onAddItem, onEditItem, onDeleteItem, onExport, loading }: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
        const categoryMatch = categoryFilter === 'all' || asset.category === categoryFilter;
        const statusMatch = statusFilter === 'all' || asset.status === statusFilter;
        const searchMatch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && statusMatch && searchMatch;
    });
  }, [assets, categoryFilter, statusFilter, searchQuery]);

  const handleOpenForm = (item: Asset | null = null) => {
    if (item) {
        setEditingItem(item);
        const isStandardCategory = (assetCategories as readonly string[]).includes(item.category);
        setFormData({
            name: item.name,
            category: isStandardCategory ? (item.category as any) : 'Other',
            otherCategory: isStandardCategory ? '' : item.category,
            quantity: item.quantity.toString(),
            price: item.price?.toString() || '',
            condition: item.condition as any,
            purchaseDate: item.purchaseDate ? item.purchaseDate.toDate() : undefined,
            assignedTo: item.assignedTo || '',
            location: item.location,
            maintenanceDate: item.maintenanceDate ? item.maintenanceDate.toDate() : undefined,
            status: item.status as any,
            notes: item.notes || '',
            imageUrl: item.imageUrl || '',
            imageFile: null,
        });
    } else {
        setEditingItem(null);
        setFormData(emptyFormState);
    }
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (name === 'imageFile' && files) {
        setFormData((prev) => ({ ...prev, imageFile: files[0] }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    const isOther = formData.category === 'Other';
    if (!formData.name || !formData.category || (isOther && !formData.otherCategory.trim()) || !formData.quantity || !formData.price || !formData.location || !formData.purchaseDate) {
        toast({ title: 'Error', description: 'Please fill all required fields, including the custom category name if you selected "Other".', variant: 'destructive' });
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
                contentType: file.type,
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
        category: isOther ? formData.otherCategory.trim() : formData.category,
        quantity: parseInt(formData.quantity, 10),
        price: parseFloat(formData.price),
        condition: formData.condition,
        purchaseDate: Timestamp.fromDate(formData.purchaseDate),
        assignedTo: formData.assignedTo || '',
        location: formData.location,
        status: formData.status,
        notes: formData.notes || '',
        imageUrl: uploadedImageUrl,
        maintenanceDate: formData.maintenanceDate ? Timestamp.fromDate(formData.maintenanceDate) : null,
    };

    if (editingItem) {
        onEditItem({ ...editingItem, ...submissionData });
    } else {
        onAddItem(submissionData as Omit<Asset, 'id'>);
    }
    
    setUploading(false);
    setIsFormOpen(false);
  };
  
  const renderTableBody = () => {
    if (loading) {
        return Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index} className="[&_td:not(:last-child)]:border-r">
                <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
            </TableRow>
        ));
    }
    
    if (filteredAssets.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={12} className="text-center h-24">
                    {searchQuery ? `No assets found for "${searchQuery}"` : "No assets found."}
                </TableCell>
            </TableRow>
        );
    }

    return filteredAssets.map((item) => (
        <TableRow key={item.id} className="[&_td]:text-center [&_td:not(:last-child)]:border-r">
            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
            <TableCell className="whitespace-nowrap"><Badge variant="outline" className="border-orange-600/50 text-orange-800 bg-orange-500/10">{item.category}</Badge></TableCell>
            <TableCell className="whitespace-nowrap">
                 <Badge 
                    variant="outline" 
                    className={cn(
                        'w-20 justify-center',
                        item.status === 'Active' && 'text-green-600 border-green-600',
                        item.status === 'In Repair' && 'text-orange-600 border-orange-600',
                        item.status === 'Inactive' && 'text-gray-600 border-gray-600',
                        item.status === 'Retired' && 'text-red-600 border-red-600'
                    )}
                 >
                    {item.status}
                </Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">{item.condition}</TableCell>
            <TableCell className="whitespace-nowrap">{item.quantity}</TableCell>
            <TableCell className="whitespace-nowrap">{formatCurrency(item.price || 0)}</TableCell>
            <TableCell className="font-semibold whitespace-nowrap">{formatCurrency((item.price || 0) * item.quantity)}</TableCell>
            <TableCell className="whitespace-nowrap">{item.location}</TableCell>
            <TableCell className="whitespace-nowrap">{item.assignedTo || 'N/A'}</TableCell>
            <TableCell className="whitespace-nowrap">{item.purchaseDate ? format(item.purchaseDate.toDate(), 'PPP') : 'N/A'}</TableCell>
            <TableCell className="whitespace-nowrap">{item.maintenanceDate ? format(item.maintenanceDate.toDate(), 'PPP') : 'N/A'}</TableCell>
            <TableCell className="whitespace-nowrap">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 mx-auto">
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
    ));
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle>Assets</CardTitle>
                    <CardDescription>View, edit, or delete company assets.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Asset
                    </Button>
                    <Button variant="outline" onClick={() => onExport(filteredAssets)} className="w-full sm:w-auto">
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                        <Label htmlFor="search">Search by Name</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="search"
                                placeholder="Search assets..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Filter by Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Filter by Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {assetStatuses.map(stat => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <Table>
                        <TableHeader className="bg-accent">
                            <TableRow className="[&_th:not(:last-child)]:border-r">
                                <TableHead className="text-center whitespace-nowrap">Name</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Category</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Condition</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Qty</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Price</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Total Value</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Location</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Assigned To</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Purchase Date</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Maintenance</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
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

        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                <DialogDescription>
                    Enter the details for the asset. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
             <ScrollArea className="max-h-[70vh]">
                <div className="grid gap-6 py-4 pr-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Asset Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={formData.category} onValueChange={(value) => setFormData(p => ({...p, category: value as any, otherCategory: ''}))}>
                                <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                                <SelectContent>{assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.category === 'Other' && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="otherCategory">Custom Category Name</Label>
                                <Input id="otherCategory" name="otherCategory" value={formData.otherCategory} onChange={handleInputChange} placeholder="e.g., Kitchenware"/>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (Rp)</Label>
                            <Input id="price" name="price" type="number" placeholder="e.g. 2500000" value={formData.price} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., Main Floor"/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData(p => ({...p, status: value as any}))}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>{assetStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="condition">Condition</Label>
                            <Select value={formData.condition} onValueChange={(value) => setFormData(p => ({...p, condition: value as any}))}>
                                <SelectTrigger id="condition"><SelectValue /></SelectTrigger>
                                <SelectContent>{assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assignedTo">Assigned To</Label>
                            <Input id="assignedTo" name="assignedTo" value={formData.assignedTo} onChange={handleInputChange} placeholder="(Optional)"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="purchaseDate">Purchase Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.purchaseDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.purchaseDate ? format(formData.purchaseDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.purchaseDate} onSelect={(date) => setFormData(p => ({...p, purchaseDate: date || undefined}))} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maintenanceDate">Next Maintenance</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.maintenanceDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.maintenanceDate ? format(formData.maintenanceDate, "PPP") : <span>Pick a date (Optional)</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.maintenanceDate} onSelect={(date) => setFormData(p => ({...p, maintenanceDate: date || undefined}))} /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="imageFile">Image</Label>
                        <Input id="imageFile" name="imageFile" type="file" accept="image/*" onChange={handleInputChange}/>
                         {formData.imageUrl && !formData.imageFile && (
                            <p className="text-xs text-muted-foreground">Current image is set. Upload a new file to replace it.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Add any relevant notes here..."/>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSubmit} disabled={uploading}>
                    {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
