'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  imageUrl?: string;
  availability: boolean;
  ingredients?: string[];
};

type ProductCardProps = {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export function ProductCard({ item, quantity, onQuantityChange }: ProductCardProps) {
  const [inputValue, setInputValue] = useState(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleBlur = () => {
    const newQuantity = parseInt(inputValue, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      onQuantityChange(item.id, 0);
    } else {
      onQuantityChange(item.id, newQuantity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Card className={`group flex flex-col justify-between overflow-hidden transition-all duration-150 ${
      quantity > 0 
        ? 'ring-2 ring-primary border-primary bg-primary/5' 
        : 'hover:border-primary/50'
    }`}>
      <div>
        {/* Image Banner */}
        <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-muted">
          <Image
            src={item.imageUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80'}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80';
            }}
          />
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-[10px] font-medium backdrop-blur-none bg-background/90 shadow-xs">
              {item.category}
            </Badge>
          </div>

          {/* Active Quantity Pill */}
          {quantity > 0 && (
            <div className="absolute top-2 right-2 flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-xs">
              {quantity}x
            </div>
          )}
        </div>

        {/* Info Content */}
        <CardContent className="p-3 pb-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 min-h-[36px] leading-tight" title={item.name}>
            {item.name}
          </h3>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(item.price)}
            </span>
            {item.costPrice > 0 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                HPP {formatCurrency(item.costPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </div>

      {/* Footer Actions */}
      <CardFooter className="p-3 pt-1">
        {quantity === 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs font-medium"
            onClick={() => onQuantityChange(item.id, 1)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full gap-1 bg-background p-1 rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onQuantityChange(item.id, quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="text"
              inputMode="numeric"
              className="w-10 h-6 text-center font-semibold text-xs p-0 border-0 bg-transparent shadow-none focus-visible:ring-0 text-foreground"
              value={inputValue}
              onChange={handleManualChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="default"
              size="icon"
              className="h-6 w-6 shrink-0 bg-primary text-primary-foreground"
              onClick={() => onQuantityChange(item.id, quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
