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
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: Timestamp;
  notes?: string;
  createdAt: Timestamp;
};

const expenseCategories = ['Utilities', 'Salaries', 'Rent', 'Marketing', 'Maintenance', 'Supplies', 'Other'] as const;

type ItemFormData = {
    title: string;
    category: typeof expenseCategories[number];
    amount: string;
    expenseDate?: Date;
    notes: string;
};

type DataTableProps = {
    expenses: Expense[];
    onAddItem: (newItemData: Omit<Expense, 'id' | 'createdAt'>) => void;
    onEditItem: (item: Expense) => void;
    onDeleteItem: (item: Expense) => void;
    loading: boolean;
};

const emptyFormState: ItemFormData = { 
    title: '',
    category: 'Other',
    amount: '',
    expenseDate: new Date(),
    notes: '',
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

export function ExpenseTable({ expenses, onAddItem, onEditItem, onDeleteItem, loading }: DataTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);
  const [editingItem, setEditingItem] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyFormState);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
        const categoryMatch = categoryFilter === 'all' || expense.category === categoryFilter;
        const searchMatch = expense.title.toLowerCase().includes(searchQuery.toLowerCase());
        return categoryMatch && searchMatch;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const handleOpenForm = (item: Expense | null = null) => {
    if (item) {
        setEditingItem(item);
        setFormData({
            title: item.title,
            category: item.category as any,
            amount: item.amount.toString(),
            expenseDate: item.expenseDate ? item.expenseDate.toDate() : undefined,
            notes: item.notes || '',
        });
    } else {
        setEditingItem(null);
        setFormData(emptyFormState);
    }
    setIsFormOpen(true);
  };

  const handleOpenDeleteAlert = (item: Expense) => {
    setItemToDelete(item);
    setIsDeleteAlertOpen(true);
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
        onDeleteItem(itemToDelete);
    }
    setIsDeleteAlertOpen(false);
    setItemToDelete(null);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.category || !formData.amount || !formData.expenseDate) {
        toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
        return;
    }

    const submissionData = {
        title: formData.title,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expenseDate: Timestamp.fromDate(formData.expenseDate),
        notes: formData.notes,
    };

    if (editingItem) {
        onEditItem({ ...submissionData, id: editingItem.id, createdAt: editingItem.createdAt });
    } else {
        onAddItem(submissionData as Omit<Expense, 'id' | 'createdAt'>);
    }

    setIsFormOpen(false);
  };
  
  const renderTableBody = () => {
    if (loading) {
        return Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
        ));
    }
    
    if (filteredExpenses.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  {searchQuery ? `No expenses found for "${searchQuery}"` : "No expenses found for this filter."}
                </TableCell>
            </TableRow>
        );
    }

    return filteredExpenses.map((item) => (
        <TableRow key={item.id} className="[&_td:not(:last-child)]:border-r">
            <TableCell className="font-medium whitespace-nowrap">{item.title}</TableCell>
            <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
            <TableCell className="whitespace-nowrap">{format(item.expenseDate.toDate(), "PPP")}</TableCell>
            <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.amount)}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenDeleteAlert(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
      <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                  <CardTitle>Expense Records</CardTitle>
                  <CardDescription>View, edit, or delete all operational expenses.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                  </Button>
              </div>
          </CardHeader>
          <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                          placeholder="Search by title..."
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
                          {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <Table>
                      <TableHeader className="bg-accent">
                          <TableRow className="[&_th:not(:last-child)]:border-r">
                              <TableHead>Title</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
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
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                <DialogDescription>
                    Enter the details for the expense. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Expense Title</Label>
                  <Input id="title" name="title" value={formData.title} onChange={handleInputChange} />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData(p => ({...p, category: value as any}))}>
                            <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                            <SelectContent>{expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (Rp)</Label>
                        <Input id="amount" name="amount" type="number" placeholder="e.g. 150000" value={formData.amount} onChange={handleInputChange} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="expenseDate">Expense Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.expenseDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expenseDate ? format(formData.expenseDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.expenseDate} onSelect={(date) => setFormData(p => ({...p, expenseDate: date || undefined}))} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Add any relevant notes here... (optional)"/>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense
              record for "{itemToDelete?.title}" and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
