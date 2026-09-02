'use client';

import { useState, useEffect } from 'react';
import type { CartItem } from '@/app/(app)/pos/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingBag, Banknote, QrCode, ArrowRight } from 'lucide-react';
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
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/40 border border-border/50">
      <div className="flex-grow min-w-0">
        <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
        <p className="text-xs font-bold text-primary">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-card text-foreground"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          className="w-10 h-7 text-center font-bold text-xs p-0 bg-card"
          value={inputValue}
          onChange={handleManualChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-card text-primary"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" 
        onClick={() => onUpdateQuantity(item.id, 0)}
        title="Hapus item"
      >
        <Trash2 className="h-3.5 w-3.5" />
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
  };

  const quickAmounts = [10000, 20000, 50000, 100000].filter(amt => amt >= total || total === 0);

  return (
    <Card className="h-full flex flex-col border border-border shadow-sm bg-card">
      <CardHeader className="py-3 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Pesanan Saat Ini
          </CardTitle>
          {cart.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {cart.reduce((s, i) => s + i.quantity, 0)} item
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-grow h-0 px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ShoppingBag className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="font-bold text-sm text-foreground">Keranjang Masih Kosong</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Pilih menu roti atau kue di samping untuk menambahkan ke pesanan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <CartListItem key={item.id} item={item} onUpdateQuantity={onUpdateQuantity} />
              ))}
            </div>
          )}
        </ScrollArea>

        {cart.length > 0 && (
          <div className="px-4 py-3 bg-secondary/30 border-t border-border space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm font-black text-foreground">
              <span>Total Bayar</span>
              <span className="text-base text-primary font-black">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>

      {cart.length > 0 && (
        <CardFooter className="p-3 border-t border-border flex flex-col gap-3 bg-card">
          <Tabs 
            defaultValue="cash" 
            className="w-full" 
            onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris')}
          >
            <TabsList className="grid w-full grid-cols-2 h-8 p-0.5 bg-muted">
              <TabsTrigger value="cash" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                <Banknote className="mr-1.5 h-3.5 w-3.5 text-emerald-600"/>Tunai
              </TabsTrigger>
              <TabsTrigger value="qris" className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">
                <QrCode className="mr-1.5 h-3.5 w-3.5 text-sky-600"/>QRIS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="mt-2.5 space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="cash-received" className="text-xs font-semibold">Uang Diterima (Rp)</Label>
                <Input 
                  id="cash-received" 
                  type="number"
                  placeholder="Contoh: 50000"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="h-9 text-sm font-bold"
                  data-testid="cash-received-input"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-1">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-semibold"
                    onClick={() => setCashReceived(amt.toString())}
                  >
                    {amt >= 1000 ? `${amt / 1000}rb` : amt}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px] font-semibold text-primary"
                  onClick={() => setCashReceived(total.toString())}
                  data-testid="exact-cash-btn"
                >
                  Uang Pas
                </Button>
              </div>

              <div className="flex justify-between items-center bg-secondary/50 px-3 py-2 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground">Kembalian:</span>
                <span className="text-sm font-black text-emerald-600">{formatCurrency(change)}</span>
              </div>
            </TabsContent>

            <TabsContent value="qris" className="mt-2 text-center text-xs text-muted-foreground">
              <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-primary/30 rounded-lg bg-primary/[0.03]">
                <QrCode className="h-10 w-10 text-primary mb-1" />
                <p className="font-semibold text-foreground">Pembayaran QRIS Toko</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tunjukkan QRIS kasir kepada pelanggan.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-2 w-full pt-1">
            <Button variant="outline" size="sm" onClick={onClearCart} className="text-xs font-semibold h-9 text-destructive hover:bg-destructive/10 border-border">
              Batalkan
            </Button>
            <Button 
              size="sm" 
              onClick={handlePayClick} 
              disabled={isPayButtonDisabled}
              className="text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              data-testid="pay-btn"
            >
              Bayar Sekarang <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
