'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductCard, type MenuItem } from '@/components/pos/product-card';
import { OrderSummary } from '@/components/pos/order-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingCart } from 'lucide-react';


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

export default function PosPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "menuItems"), where("availability", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...(doc.data() as Omit<MenuItem, 'id'>) });
      });
      setMenuItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching menu items: ", error);
      toast({ title: 'Error', description: 'Could not fetch menu items.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const filteredMenuItems = useMemo(() => {
      return menuItems.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [menuItems, searchQuery]);

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.id === itemId);

      if (newQuantity <= 0) {
        if (existingItemIndex > -1) {
          // Remove item from cart
          return prevCart.filter((item) => item.id !== itemId);
        }
        // Item not in cart and quantity is 0 or less, do nothing
        return prevCart;
      }

      if (existingItemIndex > -1) {
        // Update quantity for existing item
        return prevCart.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
      } else {
        // Add new item to cart
        const itemToAdd = menuItems.find((item) => item.id === itemId);
        if (itemToAdd) {
          return [...prevCart, { ...itemToAdd, quantity: newQuantity }];
        }
      }
      return prevCart;
    });
  };


  const handleClearCart = () => {
    setCart([]);
  };

  const grossRevenue = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalCost = cart.reduce((total, item) => total + (item.costPrice || 0) * item.quantity, 0);
  const totalProfit = grossRevenue - totalCost;
  const total = grossRevenue;


  const handlePay = async (paymentMethod: 'cash' | 'qris') => {
    if (cart.length === 0) {
      toast({ title: 'Error', description: 'Cannot process an empty order.', variant: 'destructive' });
      return;
    }

    try {
      await addDoc(collection(db, 'orders'), {
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            costPrice: item.costPrice || 0,
            quantity: item.quantity,
        })),
        grossRevenue: grossRevenue,
        totalCost: totalCost,
        totalProfit: totalProfit,
        total: total, // Customer pays the gross revenue
        status: 'completed',
        paymentMethod: paymentMethod,
        baristaId: 'Barista1', // Hardcoded for now
        timestamp: Timestamp.now(),
      });
      toast({ title: 'Success', description: 'Transaction completed.' });
      handleClearCart();
      setIsOrderSheetOpen(false); // Close sheet on successful payment
    } catch (error) {
      console.error('Error processing payment: ', error);
      toast({ title: 'Error', description: 'Failed to process transaction.', variant: 'destructive' });
    }
  };
  
  const getCartItemQuantity = (itemId: string) => {
    return cart.find(item => item.id === itemId)?.quantity || 0;
  }
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 h-full">
      <div className="lg:col-span-2 h-full flex flex-col pb-24 lg:pb-0">
         <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                placeholder="Search for products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
         <ScrollArea className="h-full pr-4 flex-grow">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({length: 12}).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)
                ) : filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => (
                        <ProductCard 
                          key={item.id} 
                          item={item}
                          quantity={getCartItemQuantity(item.id)}
                          onQuantityChange={handleUpdateQuantity}
                        />
                    ))
                ) : (
                     <div className="col-span-full text-center text-muted-foreground py-10">
                        <p>No products found for "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </div>

      {/* Desktop Order Summary */}
      <div className="hidden lg:block lg:col-span-1 h-full">
        <OrderSummary 
            cart={cart}
            subtotal={grossRevenue}
            total={total}
            onUpdateQuantity={handleUpdateQuantity}
            onClearCart={handleClearCart}
            onPay={handlePay}
        />
      </div>

      {/* Mobile Order Summary Trigger & Sheet */}
      <div className="lg:hidden">
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-2 border-t bg-card/40 backdrop-blur-xl z-10">
              <Button onClick={() => setIsOrderSheetOpen(true)} className="w-full h-12 text-base">
                  <div className="flex justify-between w-full items-center">
                      <span className="flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          View Order ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                      </span>
                      <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
              </Button>
          </div>
        )}

        <Sheet open={isOrderSheetOpen} onOpenChange={setIsOrderSheetOpen}>
            <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 border-t">
                <SheetTitle className="sr-only">Current Order</SheetTitle>
                <SheetDescription className="sr-only">
                    A summary of the items in your cart. You can review and edit quantities before proceeding to payment.
                </SheetDescription>
                <OrderSummary 
                    cart={cart}
                    subtotal={grossRevenue}
                    total={total}
                    onUpdateQuantity={handleUpdateQuantity}
                    onClearCart={handleClearCart}
                    onPay={handlePay}
                />
            </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
