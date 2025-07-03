'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl as string, supabaseKey as string);

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
    <Card className="flex flex-col justify-between">
      <div>
        <CardContent className="p-0">
          <Image
            src={item.imageUrl || 'https://placehold.co/300x200.png'}
            data-ai-hint={`${item.category} ${item.name}`}
            alt={item.name}
            width={300}
            height={200}
            className="w-full h-auto aspect-[3/2] object-cover rounded-t-lg"
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== 'https://placehold.co/300x200.png') {
                target.src = 'https://placehold.co/300x200.png';
              }
            }}
          />
        </CardContent>
        <CardHeader className="p-3">
          <CardTitle className="text-base truncate">{item.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
        </CardHeader>
      </div>
      <CardFooter className="p-3 pt-0">
        {quantity === 0 ? (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onQuantityChange(item.id, 1)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(item.id, quantity - 1)}
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
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(item.id, quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
