import React, { useState } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({ 
  label, 
  options, 
  selected, 
  onChange,
  placeholder,
  className
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className={cn("space-y-1.5 relative", isOpen ? "z-[60]" : "z-10", className)}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-left flex items-center justify-between transition-all outline-none group",
            selected.length > 0 ? "text-primary border-primary/30 bg-primary/5" : "text-slate-400 hover:text-white"
          )}
        >
          <span className="truncate">
            {selected.length === 0 ? (placeholder || `Any ${label}`) : `${selected.length} Selected`}
          </span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[240px]"
              >
                <div className="p-2 border-b border-white/5 bg-white/[0.02]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search options..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-xs text-white focus:outline-none placeholder:text-slate-600"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                  {filtered.length === 0 && (
                    <div className="px-3 py-6 text-[10px] text-slate-500 text-center uppercase tracking-widest font-black">No options found</div>
                  )}
                  {filtered.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggle(opt)}
                      className={cn(
                        "w-full px-4 py-3 flex items-center space-x-3 rounded-xl text-[11px] md:text-xs transition-all text-left group",
                        selected.includes(opt) ? "bg-primary/20 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0",
                        selected.includes(opt) ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "border-white/20 group-hover:border-white/40"
                      )}>
                        {selected.includes(opt) && <Plus className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate flex-1 font-medium">{opt}</span>
                    </button>
                  ))}
                </div>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="w-full px-3 py-2.5 text-[10px] font-black text-primary uppercase tracking-[0.2em] border-t border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
