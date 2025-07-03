'use client';

import { useState, useEffect } from 'react';
import type { CartItem } from '@/app/(app)/pos/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingCart, Banknote, QrCode } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OrderSummaryProps = {
  cart: CartItem[];
  subtotal: number;
  total: number;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onClearCart: () => void;
  onPay: (paymentMethod: 'cash' | 'qris') => void;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
};

// Extracted list item component to handle its own input state
function CartListItem({ item, onUpdateQuantity }: { item: CartItem; onUpdateQuantity: (itemId: string, newQuantity: number) => void }) {
  const [inputValue, setInputValue] = useState(item.quantity.toString());

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleBlur = () => {
    const newQuantity = parseInt(inputValue, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      onUpdateQuantity(item.id, 0);
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-grow">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          className="w-12 h-8 text-center font-bold"
          value={inputValue}
          onChange={handleManualChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onUpdateQuantity(item.id, 0)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function OrderSummary({ cart, subtotal, total, onUpdateQuantity, onClearCart, onPay }: OrderSummaryProps) {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [cashReceived, setCashReceived] = useState('');
    
    const cashReceivedAmount = parseFloat(cashReceived) || 0;
    const change = cashReceivedAmount > total ? cashReceivedAmount - total : 0;
    const isPayButtonDisabled = paymentMethod === 'cash' && (cashReceivedAmount < total || !cashReceived);

    const handlePayClick = () => {
        onPay(paymentMethod);
        setCashReceived('');
    }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Current Order</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0">
        <ScrollArea className="flex-grow h-0 px-6">
            {cart.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <ShoppingCart className="h-16 w-16 mb-4" />
                    <p className="font-semibold">Your cart is empty</p>
                    <p className="text-sm">Add items from the menu to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {cart.map((item) => (
                       <CartListItem key={item.id} item={item} onUpdateQuantity={onUpdateQuantity} />
                    ))}
                </div>
            )}
        </ScrollArea>
        {cart.length > 0 && (
             <div className="px-6 py-4 mt-auto space-y-2 border-t">
                <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
        )}
      </CardContent>
      {cart.length > 0 && (
         <CardFooter className="p-4 border-t flex flex-col gap-4">
            <Tabs 
                defaultValue="cash" 
                className="w-full" 
                onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris')}
            >
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash"><Banknote className="mr-2 h-4 w-4"/>Cash</TabsTrigger>
                    <TabsTrigger value="qris"><QrCode className="mr-2 h-4 w-4"/>QRIS</TabsTrigger>
                </TabsList>
                <TabsContent value="cash" className="mt-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="cash-received">Cash Received</Label>
                        <Input 
                            id="cash-received" 
                            type="number"
                            placeholder="Enter amount paid by customer"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                        />
                     </div>
                     <div className="flex justify-between font-medium text-lg">
                        <Label>Change</Label>
                        <span>{formatCurrency(change)}</span>
                     </div>
                </TabsContent>
                <TabsContent value="qris" className="mt-4 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg">
                        <QrCode className="h-16 w-16 mb-2" />
                        <p>Customer to scan QRIS code to pay.</p>
                    </div>
                </TabsContent>
            </Tabs>
            <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" onClick={onClearCart}>Clear Order</Button>
                <Button onClick={handlePayClick} disabled={isPayButtonDisabled}>Pay Now</Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
