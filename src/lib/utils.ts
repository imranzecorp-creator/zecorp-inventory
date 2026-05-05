import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatTime(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: any) {
  const d = getDateObject(date);
  if (!d) return 'N/A';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateForInput(date: any) {
  const d = getDateObject(date);
  if (!d) return '';
  try {
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

export function getDateObject(date: any): Date | null {
  if (!date) return null;
  
  let d: Date;
  if (typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'number') {
    // Basic heuristic: if it's less than 10^11, it's likely seconds
    d = new Date(date < 10000000000 ? date * 1000 : date);
  } else {
    d = new Date(date);
  }

  return isNaN(d.getTime()) ? null : d;
}
