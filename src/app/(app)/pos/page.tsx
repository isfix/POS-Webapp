'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { withFallback, mutateWithLocalSync } from '@/lib/db';
import { enqueuePendingOrder, dequeuePendingOrder, drainPendingOrders } from '@/lib/order-queue';
import { recordAudit } from '@/actions/audit';
import { useToast } from '@/hooks/use-toast';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductCard, type MenuItem } from '@/components/pos/product-card';
import { OrderSummary } from '@/components/pos/order-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingBag, Utensils, X, Printer, Download, ReceiptText, CheckCircle2 } from 'lucide-react';
import { Receipt } from '@/components/pos/receipt';
import { type OrderData, printReceipt, downloadReceiptHTML } from '@/lib/print';

export type CartItem = MenuItem & {
  quantity: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const BAKERY_CATEGORIES = [
  'Semua',
  'Roti Manis',
  'Roti Tawar',
  'Cake & Tart',
  'Pastry & Croissant',
  'Donat & Cookies',
  'Minuman',
];

export default function PosPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OrderData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const items = await withFallback<MenuItem>(
        () => supabase.from('menu_items').select('*').eq('availability', true).order('name', { ascending: true }),
        'rotikita_menu',
        {
          fallbackDefault: [
            { id: 'menu-1', name: 'Roti Cokelat Klasik', category: 'Roti Manis', price: 12000, costPrice: 6000, availability: true },
            { id: 'menu-2', name: 'Roti Keju Spesial', category: 'Roti Manis', price: 15000, costPrice: 7500, availability: true },
            { id: 'menu-3', name: 'Roti Tawar Premium', category: 'Roti Tawar', price: 18000, costPrice: 9000, availability: true },
            { id: 'menu-4', name: 'Croissant Butter', category: 'Pastry & Croissant', price: 22000, costPrice: 11000, availability: true },
            { id: 'menu-5', name: 'Donat Cokelat Tabur', category: 'Donat & Cookies', price: 10000, costPrice: 4000, availability: true },
          ],
          transform: (data) => data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            price: Number(d.price || 0),
            costPrice: Number(d.cost_price || d.costPrice || 0),
            imageUrl: d.image_url || d.imageUrl,
            availability: d.availability !== false,
            ingredients: d.ingredients || [],
          })),
        }
      );
      setMenuItems(items);
      setLoading(false);
    };

    fetchMenu();
  }, []);
  
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Semua': menuItems.length };
    menuItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.id === item.id);
      if (existing) {
        return prevCart.map((ci) =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }
    setCart((prevCart) => {
      const existing = prevCart.find((ci) => ci.id === itemId);
      if (existing) {
        return prevCart.map((ci) => (ci.id === itemId ? { ...ci, quantity } : ci));
      }
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return prevCart;
      return [...prevCart, { ...item, quantity }];
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  }, [cart]);

  const grossRevenue = total;
  const totalProfit = Math.max(0, grossRevenue - totalCost);

  const handlePay = async (paymentMethod: 'cash' | 'qris', cashGiven?: number) => {
    if (cart.length === 0) {
      toast({ title: 'Keranjang Kosong', description: 'Silakan pilih roti sebelum membayar.', variant: 'destructive' });
      return;
    }

    const normalizedPaymentMethod = paymentMethod === 'cash' ? 'Tunai' : (paymentMethod === 'qris' ? 'QRIS' : paymentMethod);

    const orderData = {
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        cost_price: item.costPrice,
        quantity: item.quantity,
      })),
      gross_revenue: grossRevenue,
      total_cost: totalCost,
      total_profit: totalProfit,
      total: total,
      payment_method: normalizedPaymentMethod,
      cash_given: cashGiven || total,
      change_due: cashGiven ? Math.max(0, cashGiven - total) : 0,
      customer_name: 'Walk-in Customer',
      status: 'Completed',
    };

    // 1. Enqueue to pending orders before network attempt
    enqueuePendingOrder(orderData);

    // 2. Record structured audit trail
    recordAudit({
      action: `Transaksi Kasir ${orderData.id} (${orderData.items.length} item - ${formatCurrency(total)})`,
      entityType: 'order',
      entityId: orderData.id,
      details: {
        total,
        paymentMethod: normalizedPaymentMethod,
        itemCount: orderData.items.length,
        items: orderData.items.map(i => `${i.name} x${i.quantity}`),
      },
      userName: 'Staf Kasir',
    });

    let existingOrders: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rotikita_orders');
        if (saved) existingOrders = JSON.parse(saved);
      } catch (e) {}
    }
    const updatedOrders = [orderData, ...existingOrders].slice(0, 100);

    // 2. Attempt DB write and update local state
    const res = await mutateWithLocalSync('rotikita_orders', updatedOrders, () =>
      supabase.from('orders').insert([{
        id: orderData.id,
        items: orderData.items,
        gross_revenue: grossRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        total: total,
        payment_method: normalizedPaymentMethod,
        cash_given: cashGiven || total,
        change_due: cashGiven ? Math.max(0, cashGiven - total) : 0,
        customer_name: 'Walk-in Customer',
        status: 'Completed',
        created_at: orderData.created_at,
      }])
    );

    if (res.ok) {
      dequeuePendingOrder(orderData.id);
      toast({ title: 'Pembayaran Berhasil', description: `Pesanan senilai ${formatCurrency(total)} sukses dicatat!` });
      drainPendingOrders();
    } else {
      toast({
        title: 'Pesanan Tersimpan Lokal',
        description: 'Pesanan berhasil dicatat dan akan disinkronkan ke server secara otomatis saat online.',
      });
    }

    handleClearCart();
    setIsOrderSheetOpen(false);
    setLastCompletedOrder(orderData);
    setIsReceiptModalOpen(true);
  };
  
  const getCartItemQuantity = (itemId: string) => {
    return cart.find(item => item.id === itemId)?.quantity || 0;
  };
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
      {/* Product Catalog Section */}
      <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-3 pb-20 lg:pb-0 min-w-0">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col gap-2.5 bg-card p-3 rounded-xl border border-border shadow-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari roti, cake, donat, pastry, atau minuman..."
              className="pl-9 pr-8 h-10 text-xs rounded-lg border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {BAKERY_CATEGORIES.map((category) => {
              const count = categoryCounts[category] || 0;
              const isSelected = selectedCategory === category;
              return (
                <Button
                  key={category}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs px-3 py-1 h-8 shrink-0 font-medium"
                  onClick={() => setSelectedCategory(category)}
                >
                  <span>{category}</span>
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col space-y-2 border border-border p-2.5 rounded-xl bg-card">
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
              <Utensils className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-bold text-sm text-foreground">Menu Tidak Ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">Coba gunakan kata kunci pencarian atau kategori lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenuItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  quantity={getCartItemQuantity(item.id)}
                  onQuantityChange={(itemId: string, newQuantity: number) => handleUpdateQuantity(itemId, newQuantity)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Sticky Cart Trigger Button */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
            <Button
              className="w-full h-12 shadow-xl bg-primary text-primary-foreground font-bold flex items-center justify-between px-4 rounded-xl border border-amber-300 active:scale-98 transition-transform"
              onClick={() => setIsOrderSheetOpen(true)}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">{totalItems} Item Dipilih</span>
              </div>
              <span className="text-sm font-extrabold">{formatCurrency(total)} &rarr;</span>
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Order Summary (Sidebar Cart) */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-5rem)] sticky top-16 bg-card rounded-xl border border-border shadow-xs p-4 overflow-hidden">
        <OrderSummary
          cart={cart}
          subtotal={grossRevenue}
          total={total}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={handleClearCart}
          onPay={handlePay}
        />
      </div>

      {/* Mobile Order Sheet Drawer */}
      <Sheet open={isOrderSheetOpen} onOpenChange={setIsOrderSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-4 flex flex-col rounded-t-2xl border-t border-border">
          <SheetTitle className="text-sm font-bold text-foreground">Ringkasan Pesanan Kasir</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground pb-2 border-b border-border">
            Periksa kembali pesanan dan selesaikan pembayaran.
          </SheetDescription>
          <div className="flex-1 overflow-hidden pt-2">
            <OrderSummary
              cart={cart}
              subtotal={grossRevenue}
              total={total}
              onUpdateQuantity={handleUpdateQuantity}
              onClearCart={handleClearCart}
              onPay={handlePay}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Post-Payment Receipt Dialog */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Transaksi Berhasil
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {lastCompletedOrder ? (
                <span>Struk transaksi kasir <strong>{lastCompletedOrder.id}</strong> siap dicetak.</span>
              ) : (
                'Pesanan berhasil disimpan.'
              )}
            </DialogDescription>
          </DialogHeader>

          {lastCompletedOrder && (
            <div className="my-2 overflow-y-auto max-h-[55vh] py-1 bg-muted/20 rounded-md border border-border/60">
              <Receipt order={lastCompletedOrder} />
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground order-3 sm:order-1"
              onClick={() => setIsReceiptModalOpen(false)}
            >
              Lewati
            </Button>
            <div className="flex-1 hidden sm:block order-2" />
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 order-2 sm:order-2"
              onClick={() => {
                if (lastCompletedOrder) {
                  downloadReceiptHTML(lastCompletedOrder);
                  toast({ title: 'Tersimpan', description: `Struk ${lastCompletedOrder.id} berhasil diunduh.` });
                }
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh HTML
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs font-bold gap-1.5 shadow-xs order-1 sm:order-3"
              onClick={async () => {
                if (lastCompletedOrder) {
                  toast({ title: 'Mencetak Struk...', description: 'Mengirim struk ke printer termal.' });
                  await printReceipt(lastCompletedOrder);
                }
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
