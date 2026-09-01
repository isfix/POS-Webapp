'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductCard, type MenuItem } from '@/components/pos/product-card';
import { OrderSummary } from '@/components/pos/order-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingBag, Utensils, X } from 'lucide-react';

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
  const { toast } = useToast();

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('availability', true)
          .order('name', { ascending: true });

        if (!error && data) {
          const items: MenuItem[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            price: Number(d.price || 0),
            costPrice: Number(d.cost_price || d.costPrice || 0),
            imageUrl: d.image_url || d.imageUrl,
            availability: d.availability !== false,
            ingredients: d.ingredients || [],
          }));
          setMenuItems(items);
          localStorage.setItem('pos_menu', JSON.stringify(items));
        } else {
          const localMenu = localStorage.getItem('pos_menu');
          if (localMenu) setMenuItems(JSON.parse(localMenu));
        }
      } catch (e) {
        const localMenu = localStorage.getItem('pos_menu');
        if (localMenu) setMenuItems(JSON.parse(localMenu));
      } finally {
        setLoading(false);
      }
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
    return (Array.isArray(menuItems) ? menuItems : []).filter(item => {
      if (!item) return false;
      const name = String(item.name || (item as any).title || '').toLowerCase();
      const category = String(item.category || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();
      const matchesSearch = name.includes(query) || category.includes(query);
      const matchesCategory = selectedCategory === 'Semua' || category === String(selectedCategory || '').toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.id === itemId);
      
      if (newQuantity <= 0) {
        return prevCart.filter((item) => item.id !== itemId);
      }

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: newQuantity,
        };
        return updatedCart;
      } else {
        const itemToAdd = menuItems.find((item) => item.id === itemId);
        if (itemToAdd) {
          return [...prevCart, { ...itemToAdd, quantity: newQuantity }];
        }
        return prevCart;
      }
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const grossRevenue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = cart.reduce((sum, item) => sum + (item.costPrice || (item.price * 0.55)) * item.quantity, 0);
  const totalProfit = grossRevenue - totalCost;
  const total = grossRevenue;

  const handlePay = async (paymentMethod: 'cash' | 'qris', cashGiven?: number) => {
    if (cart.length === 0) {
      toast({ title: 'Keranjang Kosong', description: 'Silakan pilih roti sebelum membayar.', variant: 'destructive' });
      return;
    }

    const orderData = {
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        costPrice: item.costPrice,
        quantity: item.quantity,
      })),
      gross_revenue: grossRevenue,
      grossRevenue: grossRevenue,
      total_cost: totalCost,
      total_profit: totalProfit,
      totalProfit: totalProfit,
      total: total,
      payment_method: paymentMethod,
      paymentMethod: paymentMethod,
      cash_given: cashGiven || total,
      change_due: cashGiven ? Math.max(0, cashGiven - total) : 0,
      customer_name: 'Walk-in Customer',
      status: 'Completed',
    };

    // Save to local storage for instant offline access
    try {
      const existing = localStorage.getItem('pos_orders');
      const orders = existing ? JSON.parse(existing) : [];
      orders.unshift(orderData);
      localStorage.setItem('pos_orders', JSON.stringify(orders.slice(0, 100)));
    } catch (e) {
      console.warn("Saved to local storage:", e);
    }

    // Try Supabase sync
    try {
      await supabase.from('orders').insert([{
        items: orderData.items,
        gross_revenue: grossRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        total: total,
        payment_method: paymentMethod,
        cash_given: cashGiven || total,
        change_due: cashGiven ? Math.max(0, cashGiven - total) : 0,
        customer_name: 'Walk-in Customer',
        status: 'Completed',
      }]);
    } catch (error) {
      console.warn('Saved order to local demo store (Supabase offline): ', error);
    }

    toast({ title: 'Pembayaran Berhasil', description: `Pesanan senilai ${formatCurrency(total)} sukses dicatat!` });
    handleClearCart();
    setIsOrderSheetOpen(false);
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
    </div>
  );
}
