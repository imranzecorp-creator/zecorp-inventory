import React from 'react';
import { 
  Package, 
  ChevronDown, 
  Info, 
  Building, 
  Hash, 
  FileText, 
  Sparkles, 
  Edit, 
  Trash,
  CheckSquare,
  Square,
  Tag,
  MapPin,
  Plus,
  Minus,
  Warehouse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem } from '../types';
import { cn } from '../lib/utils';

interface InventoryListItemProps {
  item: InventoryItem;
  idx: number;
  viewMode?: 'matrix' | 'list';
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onAdjustment: (type: 'IN' | 'OUT', item: InventoryItem) => void;
  canUpdateStock: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  deletingId: string | null;
}

export const InventoryListItem = React.memo(React.forwardRef<HTMLDivElement, InventoryListItemProps>(({
  item,
  idx,
  viewMode = 'matrix',
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  onAdjustment,
  canUpdateStock,
  isAdmin,
  isApproved,
  deletingId
}, ref) => {
  if (viewMode === 'list') {
    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 30,
          opacity: { duration: 0.2 },
          delay: Math.min(idx * 0.01, 0.2) 
        }}
        className={cn(
          "group flex items-center h-16 bg-[#020617]/40 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl px-4 transition-all overflow-hidden cursor-pointer",
          isSelected && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
          item.currentQuantity <= (item.minStock || 0) && "border-red-500/20 bg-red-500/5 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
        )}
        onClick={() => onToggleExpand(item.id)}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {isApproved && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              className="p-1 px-1.5 hover:bg-white/10 rounded transition-all shrink-0 active:scale-90"
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-slate-700" />}
            </div>
          )}

          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center group-hover:border-primary/30 transition-colors">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Package className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors" />
            )}
          </div>

          <div className="flex-1 min-w-0 flex items-center space-x-4">
             <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</p>
             </div>
             
             <div className="hidden lg:flex items-center space-x-2 w-32 shrink-0">
                <Tag className="w-3 h-3 text-slate-400 group-hover:text-primary/60 transition-colors" />
                <span className="text-[10px] font-bold text-slate-300 uppercase truncate">{item.brand || '—'}</span>
             </div>

             <div className="hidden xl:flex items-center space-x-2 w-32 shrink-0">
                <Hash className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-mono text-primary uppercase truncate">#{item.modelNumber || '—'}</span>
             </div>

             <div className="hidden md:flex items-center space-x-2 w-32 shrink-0">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase truncate">{item.warehouseLocation || '—'}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 ml-4">
          <div className="flex flex-col items-end min-w-[60px]">
            <span className={cn(
              "text-sm font-black tracking-tight transition-colors",
              item.currentQuantity > (item.minStock || 0) ? "text-white" : "text-red-500 animate-pulse"
            )}>
              {item.currentQuantity}
            </span>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest -mt-1 group-hover:text-slate-400">Stock</span>
          </div>

          <div className="flex items-center border-l border-white/10 pl-4 space-x-1">
            {isApproved && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="w-8 h-8 rounded-lg bg-white/5 text-slate-500 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-90 mr-1"
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            {canUpdateStock && (
              <div className="flex items-center space-x-1.5 mr-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAdjustment('IN', item); }}
                  className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                  title="In"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onAdjustment('OUT', item); }}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                  title="Out"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className={cn(
               "w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-600 transition-all",
               isExpanded && "rotate-180 text-primary bg-primary/10"
            )}>
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: Math.min(idx * 0.03, 0.5) 
      }}
      className={cn(
        "group rounded-[32px] overflow-hidden border transition-all duration-500",
        isSelected ? "border-primary bg-primary/5 shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 shadow-xl",
        isExpanded && "border-primary/30 ring-1 ring-primary/10 shadow-2xl scale-[1.01]"
      )}
    >
      <div className="flex items-center p-4 md:p-6 cursor-pointer select-none" onClick={() => onToggleExpand(item.id)}>
        <div className="flex items-center space-x-4 md:space-x-8 flex-1 min-w-0">
          {isApproved && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id);
              }}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all"
            >
              {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-slate-600" />}
            </div>
          )}
          
          <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-full w-full bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-700 group-hover:text-primary transition-colors">
                  <Package className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm md:text-xl font-bold text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {item.name}
              </h3>
              {item.inventoryType === 'Client Stock' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[7px] md:text-[8px] font-bold uppercase tracking-widest border border-amber-500/20">
                  Client
                </span>
              )}
            </div>
            
                <div className="flex flex-col space-y-1.5 mt-2">
                  <div className="flex items-center space-x-2 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5 w-fit">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest">{item.brand || 'No Brand'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 mx-2" />
                    <Hash className="w-3 h-3 text-primary" />
                    <span className="text-[10px] md:text-xs font-black text-primary font-mono tracking-tight">#{item.modelNumber || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col space-y-1 pl-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] md:text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{item.warehouseLocation || 'OFF-SITE'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] md:text-[11px] font-bold text-amber-400 uppercase tracking-wider">{item.client || 'INTERNAL'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Warehouse className="w-3 h-3 text-blue-500" />
                      <span className="text-[9px] md:text-[11px] font-bold text-blue-400 uppercase tracking-wider">{item.outlet || 'GEN-01'}</span>
                    </div>
                  </div>
                </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center px-10 border-x border-white/5 h-16">
            <span className={cn(
              "text-2xl md:text-3xl font-bold tracking-tight leading-none",
              item.currentQuantity > (item.minStock || 0) ? "text-white" : "text-red-500 animate-pulse"
            )}>
              {item.currentQuantity}
            </span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Units</span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 pr-2">
            {canUpdateStock && (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAdjustment('IN', item); }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-95 group/inbtn"
                  title="Stock In"
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover/inbtn:rotate-90 transition-transform" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onAdjustment('OUT', item); }}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95 group/outbtn"
                  title="Stock Out"
                >
                  <Minus className="w-5 h-5 md:w-6 md:h-6 group-hover/outbtn:scale-x-125 transition-transform" />
                </button>
              </div>
            )}
            <div className={cn(
              "p-2 md:p-3 rounded-xl md:rounded-2xl bg-white/5 text-slate-600 transition-all duration-500",
              isExpanded && "rotate-180 bg-primary/20 text-primary"
            )}>
              <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/30 border-t border-white/5 p-6 md:p-10 backdrop-blur-2xl"
          >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12 text-left">
                <div className="space-y-5">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-2 leading-none"><Info className="w-4 h-4 text-primary" />Metadata</p>
                   <div className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Category</span>
                         <span className="text-sm text-white font-bold uppercase drop-shadow-sm">{item.category || 'Standard Asset'}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Supplier Source</span>
                         <span className="text-sm text-slate-300 font-bold">{item.supplier || 'NOT SPECIFIED'}</span>
                      </div>
                      <div className="flex flex-col pt-1">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Storage Mapping</span>
                         <span className="text-xs text-primary font-black font-mono bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 inline-block w-fit">#{item.warehouseLocation || 'OFF-SITE'}</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-5">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-2 leading-none"><Building className="w-4 h-4 text-amber-500" />Job Specs</p>
                   <div className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Client Identity</span>
                         <span className="text-sm text-white font-bold uppercase drop-shadow-sm">{item.client || 'INTERNAL USE'}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Job Control #</span>
                         <span className="text-sm text-amber-500 font-black font-mono tracking-widest italic">{item.jobNumber || 'PENDING'}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Physical Point</span>
                         <span className="text-sm text-slate-200 font-bold italic tracking-tight">{item.outlet || 'GEN-01'}</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-5">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-2 leading-none"><Hash className="w-4 h-4 text-blue-500" />Technical ID</p>
                   <div className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Position Slot</span>
                         <span className="text-sm font-bold font-mono text-blue-400">POS-{item.posNo || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col pt-2">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">System DocRef</span>
                         <span className="text-[9px] font-mono text-slate-500 bg-white/5 p-2 rounded-xl border border-white/5 truncate">{item.id}</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-5">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-2 leading-none"><FileText className="w-4 h-4 text-emerald-500" />Blueprint</p>
                   <div className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Dimensions</span>
                         <span className="text-sm text-emerald-400 font-bold font-mono">{item.dimensions || 'NOT QUANTIFIED'}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Manufacturing</span>
                         <span className="text-sm text-slate-200 font-bold uppercase tracking-widest">{item.origin || 'GLOBAL STAND'}</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-5">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-2 leading-none"><Sparkles className="w-4 h-4 text-purple-500" />Operations</p>
                   <div className="space-y-4">
                      <div className="flex flex-col">
                         <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 leading-none">Lifecycle State</span>
                         <span className="text-sm text-purple-400 font-bold uppercase drop-shadow-sm">{item.logistics || 'OPERATIONAL'}</span>
                      </div>
                      <div className="flex gap-3 pt-6">
                        <button 
                          onClick={() => onEdit(item)}
                          className="flex-1 py-3 bg-white/5 hover:bg-primary/20 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-primary border border-white/10 hover:border-primary/30 transition-all flex items-center justify-center gap-2 shadow-xl group/editBtn"
                        >
                          <Edit className="w-4 h-4 group-hover/editBtn:rotate-12 transition-transform" /> Modify
                        </button>
                        <button 
                          onClick={() => onDelete(item)}
                          className="px-4 py-3 bg-red-500/5 hover:bg-red-500/20 rounded-2xl text-red-500/40 hover:text-red-500 border border-white/5 hover:border-red-500/30 transition-all shadow-xl active:scale-95"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      </div>
                   </div>
                </div>
              </div>
              
              {item.description && (
                <div className="mt-10 pt-8 border-t border-white/5 text-left">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mb-3 leading-none opacity-80">Asset Description / Narrative</p>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-5xl pl-4 border-l-2 border-primary/20">
                    {item.description}
                  </p>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}));

InventoryListItem.displayName = 'InventoryListItem';
