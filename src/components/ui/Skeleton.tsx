import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5 border border-white/5",
        variant === 'circle' && "rounded-full",
        variant === 'rect' && "rounded-xl",
        variant === 'text' && "rounded-md h-4 w-full",
        className
      )}
    />
  );
}

export function InventoryRowSkeleton() {
  return (
    <div className="px-2 py-1">
      <div className="flex items-center p-3 border border-white/[0.03] rounded-2xl bg-white/[0.01]">
        <Skeleton variant="rect" className="w-10 h-10 shrink-0" />
        <div className="flex-1 flex flex-col mx-3 space-y-2">
          <Skeleton variant="text" className="w-1/3 h-4" />
          <Skeleton variant="text" className="w-1/4 h-3" />
        </div>
        <Skeleton variant="rect" className="w-24 h-10 shrink-0" />
        <div className="w-32 px-4 hidden lg:block shrink-0">
          <Skeleton variant="text" className="w-full h-4" />
        </div>
        <div className="w-32 flex items-center justify-end space-x-2 shrink-0">
          <Skeleton variant="circle" className="w-8 h-8" />
          <Skeleton variant="circle" className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 glass-morphism rounded-3xl border border-white/5 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton variant="rect" className="w-10 h-10" />
        <Skeleton variant="rect" className="w-12 h-5" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-1/2 h-3" />
        <Skeleton variant="text" className="w-3/4 h-8" />
      </div>
      <Skeleton variant="text" className="w-full h-1" />
    </div>
  );
}
