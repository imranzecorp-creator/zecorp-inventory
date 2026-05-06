import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Package, ArrowUpRight, ArrowDownLeft, AlertCircle, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Toast {
  id: string;
  message: string;
  type: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const isStockUpdate = toast.type === 'STOCK_UPDATE';
  const isLowStock = toast.type === 'LOW_STOCK';
  const isNewItem = toast.type === 'NEW_ITEM';
  const isStockIn = toast.message.includes('STOCK IN') || toast.message.includes('BULK IN') || (isNewItem && !toast.message.includes('0 units'));
  const isStockOut = toast.message.includes('STOCK OUT') || toast.message.includes('BULK OUT');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
      className="pointer-events-auto"
    >
      <div className={cn(
        "w-80 glass-morphism p-4 rounded-2xl border border-white/10 shadow-2xl flex items-start space-x-3 overflow-hidden group relative",
        isLowStock ? "bg-red-500/10 border-red-500/20" : 
        isNewItem ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-900/90"
      )}>
        {/* Progress bar */}
        <motion.div 
          initial={{ width: '100%' }}
          animate={{ width: 0 }}
          transition={{ duration: 5, ease: "linear" }}
          className={cn(
            "absolute bottom-0 left-0 h-0.5",
            isLowStock ? "bg-red-500" : (isStockIn || isNewItem) ? "bg-emerald-500" : isStockOut ? "bg-rose-500" : "bg-primary"
          )}
        />

        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
          isLowStock ? "bg-red-500/20 text-red-500" : 
          (isStockIn || isNewItem) ? "bg-emerald-500/20 text-emerald-500" :
          isStockOut ? "bg-rose-500/20 text-rose-500" :
          "bg-primary/20 text-primary"
        )}>
          {isLowStock ? <AlertCircle className="w-5 h-5" /> :
           isNewItem ? <Plus className="w-5 h-5" /> :
           isStockIn ? <ArrowUpRight className="w-5 h-5" /> :
           isStockOut ? <ArrowDownLeft className="w-5 h-5" /> :
           <Package className="w-5 h-5" />}
        </div>

        <div className="flex-1 pr-4">
          <div className="flex items-center space-x-2">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isLowStock ? "text-red-400" : (isStockIn || isNewItem) ? "text-emerald-400" : isStockOut ? "text-rose-400" : "text-primary"
            )}>
              {isLowStock ? 'Critical Alert' : isNewItem ? 'New Record Added' : isStockIn ? 'Stock Movement In' : isStockOut ? 'Stock Movement Out' : 'Notification'}
            </span>
          </div>
          <p className="text-sm font-bold text-white mt-1 leading-tight">{toast.message}</p>
        </div>

        <button 
          onClick={onRemove}
          className="p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
