import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar, 
  Download,
  Filter,
  User,
  History,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  Briefcase,
  Sparkles,
  MapPin,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { StockTransaction } from '../types';
import { formatDate, cn } from '../lib/utils';
import { generateTransactionsReport } from '../services/pdfService';
import { summarizeTransactions } from '../services/geminiService';

import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface TransactionHistoryProps {
  transactions: StockTransaction[];
}

const TransactionRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: { items: StockTransaction[], expandedId: string | null, toggleExpand: (id: string) => void } }) => {
  const tx = data.items[index];
  const isExpanded = data.expandedId === tx.id;

  return (
    <div style={style} className="border-b border-white/[0.02] last:border-0">
      <div 
        onClick={() => data.toggleExpand(tx.id)}
        className={cn(
          "flex items-center group cursor-pointer transition-all duration-200 h-[60px]",
          isExpanded ? "bg-white/5" : "hover:bg-white/[0.03]"
        )}
      >
        <div className="w-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div key="up" initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 180, opacity: 0 }}>
                <ChevronUp className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <motion.div key="down" initial={{ rotate: 180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -180, opacity: 0 }}>
                <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex-1 px-4 truncate">
          <p className="text-[11px] font-mono text-slate-400 truncate">{new Date(tx.date).toLocaleString()}</p>
        </div>

        <div className="w-20 px-4">
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
            tx.type === 'IN' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {tx.type}
          </span>
        </div>

        <div className="flex-[2] px-4 truncate">
          <div className="flex flex-col truncate">
            <span className="text-sm font-bold text-slate-200 truncate">{tx.itemName}</span>
            {(tx.brand || tx.modelNumber) && (
              <span className="text-[9px] text-primary/60 font-black uppercase tracking-tighter truncate">
                {tx.brand} {tx.modelNumber}
              </span>
            )}
          </div>
        </div>

        <div className="w-20 px-4 text-center">
          <span className={cn("text-sm font-black", tx.type === 'IN' ? "text-green-400" : "text-red-400")}>
            {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
          </span>
        </div>

        <div className="w-24 px-4 truncate hidden lg:block">
           <span className="text-[10px] font-mono font-bold text-slate-400 truncate">{tx.jobNumber || 'N/A'}</span>
        </div>

        <div className="w-32 px-4 truncate hidden xl:block">
          <div className="flex items-center space-x-2 truncate">
            <User className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-400 truncate">{tx.userName}</span>
          </div>
        </div>

        <div className="w-32 px-4 truncate hidden 2xl:block">
          <span className="text-xs text-slate-500 italic truncate">{tx.client || 'System'}</span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/[0.04] border-l-2 border-primary overflow-hidden"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Tag className="w-3 h-3" />Details</p>
                  <p className="text-sm font-bold text-white">{tx.brand || 'N/A'} {tx.modelNumber || ''}</p>
                  <div className="flex flex-col mt-2">
                     <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Warehouse-Loc</span>
                     <span className="text-[10px] text-primary font-bold">{tx.warehouseLocation || 'N/A'}</span>
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Briefcase className="w-3 h-3" />Project</p>
                  <p className="text-sm font-bold text-white">{tx.jobNumber || 'N/A'} - {tx.outlet || 'N/A'}</p>
                  <div className="flex flex-col mt-2">
                     <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Assignment</span>
                     <span className="text-[10px] text-amber-500 font-bold">{tx.clientAssignment || 'N/A'}</span>
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3" />Location</p>
                  <p className="text-sm font-bold text-white">{tx.location || 'Warehouse'}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText className="w-3 h-3" />Notes</p>
                  <p className="text-xs text-slate-400 italic leading-relaxed">{tx.notes || 'No notes'}</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [outletFilter, setOutletFilter] = useState('');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'Warehouse Stock' | 'Client Stock' | ''>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const searchLow = searchTerm.toLowerCase();
      const itemName = tx.itemName?.toLowerCase() || '';
      const brand = tx.brand?.toLowerCase() || '';
      const model = tx.modelNumber?.toLowerCase() || '';
      const client = tx.client?.toLowerCase() || '';
      const representative = tx.userName?.toLowerCase() || '';
      const jobNum = tx.jobNumber?.toLowerCase() || '';
      const location = tx.location?.toLowerCase() || '';
      const outlet = tx.outlet?.toLowerCase() || '';

      const matchesSearch = 
        itemName.includes(searchLow) ||
        brand.includes(searchLow) ||
        model.includes(searchLow) ||
        client.includes(searchLow) ||
        representative.includes(searchLow) ||
        jobNum.includes(searchLow) ||
        location.includes(searchLow) ||
        outlet.includes(searchLow);
      
      if (!matchesSearch) return false;

      // Advanced Filters
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (clientFilter && !client.includes(clientFilter.toLowerCase())) return false;
      if (locationFilter && !location.includes(locationFilter.toLowerCase())) return false;
      if (userFilter && !representative.includes(userFilter.toLowerCase())) return false;
      if (outletFilter && !outlet.includes(outletFilter.toLowerCase())) return false;
      if (inventoryTypeFilter && tx.inventoryType !== inventoryTypeFilter) return false;

      if (startDate || endDate) {
        const txDate = new Date(tx.date);
        if (startDate && txDate < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter, clientFilter, locationFilter, userFilter, outletFilter, inventoryTypeFilter, startDate, endDate]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setTypeFilter('ALL');
    setClientFilter('');
    setLocationFilter('');
    setUserFilter('');
    setOutletFilter('');
    setInventoryTypeFilter('');
  }, []);

  const handleExport = useCallback(() => {
    generateTransactionsReport(filtered, {
      includeNotes,
      dateRange: startDate || endDate ? { start: startDate, end: endDate } : undefined,
      typeFilter: typeFilter,
      activeFilters: {
        search: searchTerm,
        client: clientFilter,
        location: locationFilter,
        representative: userFilter,
        outlet: outletFilter,
        inventoryType: inventoryTypeFilter
      }
    });
    setShowExportOptions(false);
  }, [filtered, includeNotes, startDate, endDate, typeFilter, searchTerm, clientFilter, locationFilter, userFilter, outletFilter, inventoryTypeFilter]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleGenerateAiSummary = useCallback(async () => {
    setIsSummarizing(true);
    setShowAiSummary(true);
    const summary = await summarizeTransactions(filtered);
    setAiSummary(summary);
    setIsSummarizing(false);
  }, [filtered]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Activity History</h1>
          <p className="text-sm text-slate-400">View and audit all stock movements across the system.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleGenerateAiSummary}
            disabled={filtered.length === 0}
            className="flex items-center space-x-2 px-6 py-3 text-xs md:text-sm font-black text-slate-950 bg-gradient-to-r from-emerald-400 via-primary to-indigo-500 rounded-2xl bg-[length:200%_auto] hover:bg-right shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all duration-500 disabled:opacity-50 disabled:grayscale uppercase tracking-[0.15em] group"
          >
            <motion.div
              animate={{ 
                rotate: [0, 20, -20, 0],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
            <span>AI Insights</span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center space-x-2 px-6 py-3 text-xs md:text-sm font-black text-white bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group uppercase tracking-[0.15em] backdrop-blur-xl shadow-xl shadow-black/20"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Download className="w-4 h-4 group-hover:scale-125 transition-transform" />
              </motion.div>
              <span>Export</span>
            </button>

          <AnimatePresence>
            {showExportOptions && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-2 w-64 glass-morphism p-4 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
              >
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Report Customization</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={includeNotes} 
                        onChange={(e) => setIncludeNotes(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Include Transaction Notes</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <button 
                      onClick={handleExport}
                      className="w-full py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-indigo-500 transition-all"
                    >
                      Generate PDF Report
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

      <AnimatePresence>
        {showAiSummary && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-morphism p-6 rounded-[32px] border border-primary/20 bg-primary/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setShowAiSummary(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/20 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">AI Transaction Intelligence</h3>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Scanning {filtered.length} recent movements</p>
              </div>
            </div>

            <div className="relative min-h-[100px]">
              {isSummarizing ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-slate-400 font-medium animate-pulse">Analyzing patterns and synthesizing summary...</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="markdown-body text-slate-300 leading-relaxed">
                    <Markdown>{aiSummary}</Markdown>
                  </div>
                </div>
              )}
            </div>

            {!isSummarizing && (
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-slate-500 italic">This summary is generated by AI based on the current filtered view. Verify critical data before acting.</p>
                <button 
                  onClick={handleGenerateAiSummary}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Regenerate
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col space-y-4 glass-morphism p-4 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by item name, client, representative or job #..." 
              className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 text-xs md:text-sm font-black rounded-2xl border transition-all duration-300 uppercase tracking-[0.15em]",
                showAdvancedFilters 
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse" 
                  : "bg-slate-800/50 border-white/10 text-slate-300 hover:bg-white/10"
              )}
            >
              <Filter className={cn("w-4 h-4", showAdvancedFilters && "animate-bounce")} />
              <span>Filters</span>
              {(typeFilter !== 'ALL' || clientFilter || locationFilter || userFilter || outletFilter || inventoryTypeFilter || startDate || endDate) && (
                <div className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
              )}
            </button>

            <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none p-0 cursor-pointer w-24"
              />
              <span className="text-slate-600 text-xs">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none border-none p-0 cursor-pointer w-24"
              />
            </div>

            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Showing</span>
              <span className="text-xs font-bold text-primary">{filtered.length}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logs</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Action Type</label>
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client / Source</label>
                  <input 
                    type="text"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    placeholder="Filter by client..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Outlet</label>
                  <input 
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Filter by outlet..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Representative</label>
                  <input 
                    type="text"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    placeholder="Filter by rep..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Category</label>
                  <select 
                    value={inventoryTypeFilter}
                    onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                  >
                    <option value="">All Categories</option>
                    <option value="Warehouse Stock">Warehouse Stock</option>
                    <option value="Client Stock">Client Stock</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    onClick={clearFilters}
                    className="w-full py-2 px-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass-morphism rounded-3xl border border-white/5 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-left">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tx Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Job #</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Representative</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client / Source</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Outlet</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((tx) => (
                <React.Fragment key={tx.id}>
                  <tr 
                    onClick={() => toggleExpand(tx.id)}
                    className={cn(
                      "group cursor-pointer transition-all duration-200",
                      expandedId === tx.id ? "bg-white/5" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          {expandedId === tx.id ? (
                            <motion.div
                              key="up"
                              initial={{ rotate: -180, opacity: 0 }}
                              animate={{ rotate: 0, opacity: 1 }}
                              exit={{ rotate: 180, opacity: 0 }}
                            >
                              <ChevronUp className="w-4 h-4 text-primary" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="down"
                              initial={{ rotate: 180, opacity: 0 }}
                              animate={{ rotate: 0, opacity: 1 }}
                              exit={{ rotate: -180, opacity: 0 }}
                            >
                              <ChevronDown className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-[11px] font-mono text-slate-400 group-hover:text-slate-200 transition-colors">{new Date(tx.date).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all",
                        tx.type === 'IN' 
                          ? "bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20" 
                          : "bg-red-500/10 text-red-500 border-red-500/20 group-hover:bg-red-500/20"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{tx.itemName}</span>
                        {(tx.brand || tx.modelNumber) && (
                          <span className="text-[9px] text-primary/60 font-black uppercase tracking-tighter">
                            {tx.brand} {tx.modelNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "text-sm font-black",
                          tx.type === 'IN' ? "text-green-400" : "text-red-400"
                        )}>{tx.type === 'IN' ? '+' : '-'}{tx.quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                       <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{tx.jobNumber || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                          <User className="w-3 h-3 text-slate-500 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{tx.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{tx.inventoryType || 'Warehouse'}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500 font-medium italic group-hover:text-slate-400 transition-colors">{tx.client || 'System Log'}</td>
                    <td className="px-6 py-3 text-xs text-slate-400 font-bold group-hover:text-slate-200 transition-colors">
                      <div className="flex flex-col">
                        <span>{tx.outlet || 'N/A'}</span>
                        {tx.location && <span className="text-[9px] text-slate-500 font-normal">{tx.location}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-primary font-bold">{tx.warehouseLocation || 'N/A'}</span>
                        <span className="text-[9px] text-amber-500 font-bold">{tx.clientAssignment || 'N/A'}</span>
                      </div>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === tx.id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/[0.03]"
                      >
                        <td colSpan={7} className="px-6 py-6 border-l-2 border-primary">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group/icon">
                                <motion.div whileHover={{ scale: 1.2, rotate: 15 }}>
                                  <Tag className="w-3 h-3" />
                                </motion.div>
                                <span>Reference Details</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-400">Brand & Model</span>
                                <span className="text-sm font-bold text-white uppercase">{tx.brand || 'N/A'} {tx.modelNumber || ''}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group/icon">
                                <motion.div whileHover={{ scale: 1.2, y: -1 }}>
                                  <Briefcase className="w-3 h-3" />
                                </motion.div>
                                <span>Project Info</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-400">Job Number</span>
                                <span className="text-sm font-bold text-white">{tx.jobNumber || 'N/A'}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group/icon">
                                <motion.div whileHover={{ scale: 1.2, x: -1 }}>
                                  <MapPin className="w-3 h-3" />
                                </motion.div>
                                <span>Transit & Location</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-400">Outlet Location</span>
                                <span className="text-sm font-bold text-white">{tx.outlet || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col space-y-1 mt-2">
                                <span className="text-xs text-slate-400">Warehouse Location</span>
                                <span className="text-sm font-bold text-primary">{tx.warehouseLocation || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col space-y-1 mt-2">
                                <span className="text-xs text-slate-400">Client Assignment</span>
                                <span className="text-sm font-bold text-amber-500">{tx.clientAssignment || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="space-y-2 col-span-1 md:col-span-1">
                              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group/icon">
                                <motion.div whileHover={{ scale: 1.1, x: 2 }}>
                                  <FileText className="w-3 h-3" />
                                </motion.div>
                                <span>Operation Notes</span>
                              </div>
                              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-sm text-slate-300 leading-relaxed italic">
                                  {tx.notes || 'No additional notes provided for this transaction.'}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Briefcase className="w-3 h-3" />
                                <span>Account Info</span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-slate-400">Client / Source</span>
                                <span className="text-sm font-bold text-white">{tx.client || 'System'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/5">
          {filtered.map((tx) => (
            <div key={tx.id} className="p-4 active:bg-white/5 transition-colors">
              <div 
                onClick={() => toggleExpand(tx.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    tx.type === 'IN' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {tx.type === 'IN' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{tx.itemName}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {tx.type === 'IN' ? 'Stock In' : 'Stock Out'} Date
                    </p>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{tx.quantity}</p>
                  <p className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    tx.type === 'IN' ? "text-green-500" : "text-red-500"
                  )}>Stock {tx.type}</p>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === tx.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Representative</p>
                          <div className="flex items-center space-x-1.5 text-slate-300">
                             <User className="w-3 h-3" />
                             <p className="text-xs font-bold truncate">{tx.userName}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Client / Source</p>
                          <p className="text-xs font-bold text-white truncate">{tx.client || 'System'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Outlet</p>
                          <p className="text-xs font-bold text-white truncate">{tx.outlet || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Location</p>
                          <p className="text-xs font-bold text-slate-300 truncate">{tx.location || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Warehouse-Loc</p>
                          <p className="text-xs font-bold text-primary truncate">{tx.warehouseLocation || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Assignment</p>
                          <p className="text-xs font-bold text-amber-500 truncate">{tx.clientAssignment || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Job Reference</p>
                          <p className="text-xs font-bold text-white truncate">{tx.jobNumber || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Brand / Model</p>
                          <p className="text-xs font-bold text-white truncate">{tx.brand || 'N/A'} {tx.modelNumber || ''}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 italic text-xs text-slate-400">
                        {tx.notes || 'No notes available'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
  {filtered.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p>No activity logs found</p>
            </div>
          )}
      </div>
    </motion.div>
  );
}
