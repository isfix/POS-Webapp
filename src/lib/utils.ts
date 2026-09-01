import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseSafeDate(input: any): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  if (typeof input?.toDate === 'function') {
    try {
      const d = input.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (e) {}
  }
  if (typeof input?.seconds === 'number') {
    const d = new Date(input.seconds * 1000);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}
