import React, { useState, useMemo, useCallback, useRef, useEffect, useDeferredValue } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar, 
  Download,
  Filter,
  User,
  History as LucideHistory,
  ChevronDown,
  ChevronUp,
  Tag,
  FileText,
  Briefcase,
  Sparkles,
  MapPin,
  X,
  Loader2,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Box,
  Layout,
  CornerDownRight,
  RotateCcw,
  Cloud,
  Mic,
  MicOff
} from 'lucide-react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';
import { motion, AnimatePresence } from 'motion/react';
import { StockTransaction } from '../types';
import { formatDate, formatTime, cn, getDateObject } from '../lib/utils';
import { generateTransactionsReport } from '../services/pdfService';
import { summarizeTransactions } from '../services/geminiService';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FilterDropdown } from './ui/FilterDropdown';

interface TransactionHistoryProps {
  transactions: StockTransaction[];
}

const TransactionRow = React.memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: { items: StockTransaction[], expandedId: string | null, toggleExpand: (id: string) => void } }) => {
  const tx = data.items[index];
  if (!tx) return null;
  const isExpanded = data.expandedId === tx.id;

  return (
    <div style={style} className="px-4 pb-2">
      <div 
        onClick={() => data.toggleExpand(tx.id)}
        className={cn(
          "glass-morphism rounded-3xl border border-white/5 transition-all cursor-pointer group flex flex-col overflow-hidden",
          isExpanded ? "bg-white/10 ring-1 ring-primary/30 shadow-2xl" : "hover:bg-white/[0.03] shadow-sm"
        )}
      >
        <div className="flex items-center p-4">
          <div className="flex-[2] flex items-center space-x-4 min-w-0">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:scale-110",
              tx.type === 'IN' 
                ? "bg-green-500/10 border-green-500/20 text-green-400" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}>
              {tx.type === 'IN' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white truncate tracking-tight">{tx.itemName}</h3>
              <div className="flex items-center space-x-3 mt-1 overflow-hidden">
                <div className="flex items-center space-x-1 text-[10px] text-slate-300 font-black whitespace-nowrap uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  <span className="uppercase tracking-tighter">{formatDate(tx.date)}</span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-primary/60 font-black uppercase tracking-tighter truncate">
                  <Tag className="w-3 h-3" />
                  <span>{tx.brand} {tx.modelNumber}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 hidden md:flex flex-col items-center justify-center px-4">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Magnitude</p>
            <p className={cn("text-xl font-black", tx.type === 'IN' ? "text-green-400" : "text-red-400")}>
              {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
            </p>
          </div>

          <div className="flex-1 hidden lg:flex flex-col px-4 min-w-0">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Personnel</p>
            <div className="flex items-center space-x-2">
              <User className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-bold text-slate-300 truncate">{tx.userName}</span>
            </div>
          </div>

          <div className="flex-1 hidden xl:flex flex-col px-4 min-w-0 text-right">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Job Matrix</p>
            <span className="text-[10px] font-mono font-bold text-slate-400 truncate tracking-tighter">{tx.jobNumber || 'INTERNAL-OPS'}</span>
          </div>

          <div className="w-10 flex items-center justify-center ml-4">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="p-2 text-slate-500">
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="border-t border-white/5 bg-[#030712]/20"
            >
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Box className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Asset Specs</h4>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Brand Mapping</p>
                      <p className="text-xs font-bold text-slate-300">{tx.brand || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Model Reference</p>
                      <p className="text-xs font-bold text-slate-300">{tx.modelNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Logistics</h4>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Project Outlet</p>
                      <p className="text-xs font-bold text-slate-300">{tx.outlet || 'Central Axis'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Vault Location</p>
                      <p className="text-xs font-bold text-primary font-mono">{tx.warehouseLocation || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">System Remarks</h4>
                  </div>
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5 min-h-[100px] italic text-sm text-slate-400 leading-relaxed shadow-inner">
                      {tx.notes || 'Routine movement detected. Authorized through secure personnel verification pulse.'}
                   </div>
                   <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2 px-2">
                     <span className="flex items-center space-x-2">
                       <ShieldCheck className="w-3 h-3" />
                       <span>MOD-ID: {tx.id.toUpperCase()}</span>
                     </span>
                     <span className="flex items-center space-x-2">
                       <Clock className="w-3 h-3" />
                       <span>STAMP: {formatTime(tx.date)}</span>
                     </span>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

const TransactionHistory = React.forwardRef<HTMLDivElement, TransactionHistoryProps>(({ transactions }, ref) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<'Warehouse Stock' | 'Client Stock' | ''>('');
  const [typeFilter, setTypeFilter] = useState<'IN' | 'OUT' | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseLocationFilter, setWarehouseLocationFilter] = useState('');
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const listRef = useRef<List>(null);

  const { isListening, startListening, currentLang, setCurrentLang } = useVoiceSearch((transcript) => {
    setSearchTerm(transcript);
    setShowSearchSuggestions(true);
  });

  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [deferredSearchTerm, userFilter, inventoryTypeFilter, typeFilter, startDate, endDate, categoryFilter, jobNumberFilter, warehouseLocationFilter]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [expandedId]);

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const searchLow = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    transactions.forEach(tx => {
      if (tx.itemName.toLowerCase().includes(searchLow)) matches.add(tx.itemName);
      if (tx.brand && tx.brand.toLowerCase().includes(searchLow)) matches.add(tx.brand);
      if (tx.modelNumber && tx.modelNumber.toLowerCase().includes(searchLow)) matches.add(tx.modelNumber);
      if (tx.jobNumber && tx.jobNumber.toLowerCase().includes(searchLow)) matches.add(tx.jobNumber);
      if (tx.userName?.toLowerCase().includes(searchLow)) matches.add(tx.userName);
      if (tx.category && tx.category.toLowerCase().includes(searchLow)) matches.add(tx.category);
      if (tx.warehouseLocation && tx.warehouseLocation.toLowerCase().includes(searchLow)) matches.add(tx.warehouseLocation);
    });
    
    return Array.from(matches).slice(0, 8);
  }, [searchTerm, transactions]);

  const filtered = useMemo(() => {
    const startTimestamp = startDate ? new Date(startDate).getTime() : null;
    const endTimestamp = endDate ? new Date(endDate).getTime() + 86400000 : null;

    return transactions.filter(tx => {
      const searchLow = deferredSearchTerm.toLowerCase();
      const matchesSearch = !deferredSearchTerm || 
        tx.itemName.toLowerCase().includes(searchLow) ||
        (tx.brand?.toLowerCase() || '').includes(searchLow) ||
        (tx.modelNumber?.toLowerCase() || '').includes(searchLow) ||
        (tx.jobNumber?.toLowerCase() || '').includes(searchLow) ||
        (tx.category?.toLowerCase() || '').includes(searchLow) ||
        (tx.warehouseLocation?.toLowerCase() || '').includes(searchLow);
      
      const matchesUser = !userFilter || 
        tx.userName?.toLowerCase().includes(userFilter.toLowerCase());
      
      const matchesType = !inventoryTypeFilter || 
        tx.inventoryType === inventoryTypeFilter;

      const matchesTxType = !typeFilter || tx.type === typeFilter;

      const matchesCategory = !categoryFilter || 
        (tx.category?.toLowerCase() || '').includes(categoryFilter.toLowerCase());

      const matchesWarehouse = !warehouseLocationFilter || 
        (tx.warehouseLocation?.toLowerCase() || '').includes(warehouseLocationFilter.toLowerCase());

      const matchesJob = !jobNumberFilter || 
        (tx.jobNumber?.toLowerCase() || '').includes(jobNumberFilter.toLowerCase());

      const txDateObj = getDateObject(tx.date);
      const txDate = txDateObj?.getTime() || 0;
      const matchesDate = (!startTimestamp || txDate >= startTimestamp) &&
                          (!endTimestamp || txDate <= endTimestamp);

      return matchesSearch && matchesUser && matchesType && matchesTxType && matchesCategory && matchesWarehouse && matchesJob && matchesDate;
    });
  }, [transactions, deferredSearchTerm, userFilter, inventoryTypeFilter, typeFilter, startDate, endDate, categoryFilter, jobNumberFilter, warehouseLocationFilter]);

  const getItemSize = useCallback((index: number) => {
    return expandedId === filtered[index]?.id ? 380 : 96;
  }, [expandedId, filtered]);

  const clearFilters = () => {
    setSearchTerm('');
    setUserFilter('');
    setInventoryTypeFilter('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setWarehouseLocationFilter('');
    setJobNumberFilter('');
  };

  const handleSummarize = async () => {
    if (filtered.length === 0) return;
    setIsSummarizing(true);
    try {
      const result = await summarizeTransactions(filtered);
      setSummary(result);
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const itemData = useMemo(() => ({
    items: filtered,
    expandedId,
    toggleExpand
  }), [filtered, expandedId, toggleExpand]);

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center space-x-3">
            <LucideHistory className="w-8 h-8 text-primary shadow-glow" />
            <span>Transaction Matrix</span>
          </h1>
          <p className="text-[10px] md:text-xs text-slate-300 uppercase font-black tracking-[0.3em] mt-1">Universal Inventory Movement Stream</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search history mapping..." 
              className="pl-12 pr-6 py-3.5 bg-slate-800/40 border border-white/5 rounded-2xl text-xs md:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium min-w-[300px]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <VoiceLanguageSelector 
                currentLang={currentLang} 
                onLangChange={setCurrentLang} 
              />
              <button
                type="button"
                onClick={startListening}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/10 text-slate-500"
                )}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <AnimatePresence>
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchSuggestions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 space-y-1">
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchTerm(suggestion);
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-white/5 transition-colors text-left rounded-xl group"
                        >
                          <Search className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3.5 rounded-2xl border transition-all active:scale-95 shadow-sm",
              showFilters ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white"
            )}
          >
            <Filter className="w-5 h-5" />
          </button>

          <button 
            onClick={() => generateTransactionsReport(filtered)}
            className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all active:scale-95"
            title="Export PDF Report"
          >
            <Download className="w-5 h-5" />
          </button>

          <button 
            onClick={handleSummarize}
            disabled={isSummarizing || filtered.length === 0}
            className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50"
            title="AI Intelligence Summary"
          >
            {isSummarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-morphism p-6 md:p-8 rounded-[32px] border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 mb-4 shadow-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Universal Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search anything..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Movement Type</label>
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="" className="bg-[#0f172a]">All Movements</option>
                  <option value="IN" className="bg-[#0f172a] font-bold text-green-400">Stock In (+)</option>
                  <option value="OUT" className="bg-[#0f172a] font-bold text-red-400">Stock Out (-)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Asset Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="e.g. AV Equipment"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Vault Location (Warehouse)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="text"
                    value={warehouseLocationFilter}
                    onChange={(e) => setWarehouseLocationFilter(e.target.value)}
                    placeholder="e.g. WH-A-01"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Job Matrix (ID)</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="text"
                    value={jobNumberFilter}
                    onChange={(e) => setJobNumberFilter(e.target.value)}
                    placeholder="Filter by Project ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Personnel</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input 
                    type="text"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    placeholder="Lead Name..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Protocol Tier</label>
                <select 
                  value={inventoryTypeFilter}
                  onChange={(e) => setInventoryTypeFilter(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                >
                  <option value="" className="bg-[#0f172a]">All Protocol Tiers</option>
                  <option value="Warehouse Stock" className="bg-[#0f172a]">Warehouse Stock</option>
                  <option value="Client Stock" className="bg-[#0f172a]">Client Stock</option>
                </select>
              </div>

              <div className="flex items-end md:col-span-2 lg:col-span-1 xl:col-span-2">
                <button 
                  onClick={clearFilters}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Matrices</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-morphism p-8 rounded-[32px] border border-primary/20 bg-primary/5 relative mb-6 shadow-glow">
              <button 
                onClick={() => setSummary(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-primary/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Intelligence Synthesis</h3>
                  <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">Gemini Engine Analysis</p>
                </div>
              </div>
              <div className="prose prose-invert prose-xs max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-primary">
                {summary}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-morphism rounded-[48px] border border-white/5 shadow-2xl overflow-hidden h-[750px] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-indigo-500/50 to-primary/50 z-10" />
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              width={width}
              itemCount={filtered.length}
              itemSize={getItemSize}
              itemData={itemData}
              className="custom-scrollbar py-4"
              overscanCount={8}
            >
              {TransactionRow}
            </List>
          )}
        </AutoSizer>

        {filtered.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
            <LucideHistory className="w-20 h-20 text-slate-800 mb-6" />
            <div className="text-center">
              <p className="text-lg font-black text-slate-300 tracking-tight">Zero Activity Detected</p>
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] mt-1 italic">Matrix stream is currently offline</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-8 py-5 glass-morphism rounded-[32px] border border-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest bg-[#030712]/20">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
            <span>Active Feed Connection</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden md:block" />
          <span className="hidden md:block">Synced: {filtered.length} Nodes</span>
          <div className="w-px h-4 bg-white/10 hidden md:block" />
          <div className="hidden md:flex items-center space-x-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure Protocol</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-slate-600 hidden sm:block">Sync Engine v5.1.0-DEPLOYMENT</p>
          <div className="w-px h-4 bg-white/10 hidden sm:block" />
          <Cloud className="w-3 h-3 text-primary animate-bounce" />
        </div>
      </div>
    </motion.div>
  );
});

export default TransactionHistory;
