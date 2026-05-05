import React, { useMemo, useState, useEffect, useCallback, memo, useRef } from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  LayoutDashboard,
  History as HistoryIcon,
  Search,
  Filter,
  FileText,
  Download,
  Sparkles,
  Lightbulb,
  Zap,
  Globe,
  Loader2,
  ListRestart,
  Mic,
  MicOff,
  Bell
} from 'lucide-react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, InventoryItem, StockTransaction, Project } from '../types';
import { formatDate, cn, getDateObject } from '../lib/utils';
import { generateInventoryReport, generateTransactionsReport } from '../services/pdfService';
import { analyzeSupplyChain, analyzeInventory, processAiSearch, InventoryInsight } from '../services/geminiService';
import AIPoweredNews from './AIPoweredNews';
import AIQuickNews from './AIQuickNews';
import { FilterDropdown } from './ui/FilterDropdown';
import { RotateCcw } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface DashboardProps {
  user: UserProfile;
  items: InventoryItem[];
  transactions: StockTransaction[];
  projects: Project[];
}



const StockTableRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: { items: InventoryItem[] } }) => {
  const item = data.items[index];
  if (!item) return null;

  return (
    <div style={style} className="flex items-center group hover:bg-white/[0.02] transition-colors border-b border-white/[0.02]">
      <div className="px-4 py-4 flex-1 flex items-center space-x-3 truncate">
        <motion.div 
          whileHover={{ scale: 1.2, rotate: 15 }}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 overflow-hidden shrink-0"
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Package className="w-5 h-5 text-slate-600" />
          )}
        </motion.div>
        <div className="flex flex-col truncate">
          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate">{item.name}</span>
          {(item.brand || item.modelNumber) && (
            <span className="text-[9px] text-primary/80 font-black uppercase tracking-tighter truncate">
              {item.brand} {item.modelNumber}
            </span>
          )}
        </div>
      </div>
      <div className="px-4 py-4 w-24 text-center shrink-0">
        <span className={cn(
          "text-sm font-black px-3 py-1 rounded-lg border",
          item.currentQuantity <= item.minStock 
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          {item.currentQuantity}
        </span>
      </div>
      <div className="px-4 py-4 flex-1 hidden lg:block truncate text-[10px] text-slate-300 uppercase font-black tracking-tighter">
        {item.client || 'Internal'}
      </div>
      <div className="px-4 py-4 flex-1 hidden lg:block truncate text-[10px] text-slate-400 uppercase font-black tracking-tighter">
        {item.outlet || item.location || '-'}
      </div>
      <div className="px-4 py-4 w-24 hidden xl:block text-right shrink-0">
        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-md border border-white/10">
          {item.jobNumber || 'PENDING'}
        </span>
      </div>
      <div className="px-4 py-4 flex-1 hidden xl:block truncate text-[10px] text-slate-300 uppercase font-black tracking-tighter">
        {item.warehouseLocation || '-'}
      </div>
    </div>
  );
});

import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export default function Dashboard({ user, items, transactions, projects }: DashboardProps) {
  const [stockSearch, setStockSearch] = useState('');
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const [stockJobFilter, setStockJobFilter] = useState('');
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [stockClientFilter, setStockClientFilter] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [stockLocationFilter, setStockLocationFilter] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [stockTypeFilter, setStockTypeFilter] = useState<'All' | 'Warehouse Stock' | 'Client Stock'>('All');
  const stockListRef = React.useRef<List>(null);

  const { isListening, startListening, currentLang, setCurrentLang } = useVoiceSearch((transcript) => {
    setStockSearch(transcript);
  });

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [selectedWarehouseLocations, setSelectedWarehouseLocations] = useState<string[]>([]);
  const [stockInStart, setStockInStart] = useState('');
  const [stockInEnd, setStockInEnd] = useState('');
  const [updatedStart, setUpdatedStart] = useState('');
  const [updatedEnd, setUpdatedEnd] = useState('');

  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InventoryInsight[]>([]);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);
  const [persistingInsights, setPersistingInsights] = useState(false);

  const persistInsights = useCallback(async (insightsToSave: InventoryInsight[]) => {
    if (!insightsToSave.length || persistingInsights) return;
    
    setPersistingInsights(true);
    try {
      const highPriority = insightsToSave.filter(i => i.type === 'WARNING');
      for (const insight of highPriority) {
        // Simple check if this notification already exists recently might be overkill for this turn
        // but let's at least add some debounce/check logic if possible
        // For now, we just add it to Firestore
        await addDoc(collection(db, 'notifications'), {
          type: 'AI_PREDICTION',
          title: insight.title,
          message: insight.message,
          userId: user.uid,
          read: false,
          createdAt: serverTimestamp(),
          isPublic: false
        });
      }
      
      // Show toast indirectly via Firestore listener in App.tsx
    } catch (error) {
      console.error("Failed to persist AI insights:", error);
    } finally {
      setPersistingInsights(false);
    }
  }, [user.uid, persistingInsights]);

  const lastAnalyzedRef = useRef<string>('');
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);

  useEffect(() => {
    const fetchInsights = async () => {
      // Data fingerprinting to avoid redundant calls - much faster than JSON.stringify
      const currentDataHash = `${items.length}-${projects.length}-${items.reduce((sum, i) => sum + i.currentQuantity, 0)}`;

      // 5-minute cooldown + verify data has actually changed
      const coolingDown = lastAnalysisTime > 0 && Date.now() - lastAnalysisTime < 300000;
      const dataChanged = currentDataHash !== lastAnalyzedRef.current;
      
      // Only run if data changed AND not in cooldown, OR if it's a manual trigger (lastAnalysisTime === 0)
      if (items.length > 0 && ((dataChanged && !coolingDown) || lastAnalysisTime === 0)) {
        setIsAnalyzing(true);
        try {
          const results = await analyzeSupplyChain(items, transactions, projects);
          setInsights(results);
          
          lastAnalyzedRef.current = currentDataHash;
          setLastAnalysisTime(Date.now());

          const urgentInsights = results.filter(i => i.isUrgent);
          if (urgentInsights.length > 0) {
            persistInsights(urgentInsights);
          }
        } catch (error: any) {
          console.warn("AI Quota or error:", error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchInsights();
    }, 10000); // 10 second delay on initial load/change

    return () => clearTimeout(timer);
  }, [items, transactions, projects, persistInsights, lastAnalysisTime]);

  const handleAiSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchQuery.trim()) {
      setAiResultIds(null);
      return;
    }
    
    setIsAiSearching(true);
    const results = await processAiSearch(aiSearchQuery, items);
    setAiResultIds(results);
    setIsAiSearching(false);
  }, [aiSearchQuery, items]);

  useEffect(() => {
    stockListRef.current?.scrollTo(0);
  }, [stockSearch, stockJobFilter, stockClientFilter, stockLocationFilter, stockTypeFilter, aiResultIds, selectedBrands, selectedModels, selectedOutlets]);

  const stats = useMemo(() => {
    const filteredItems = stockTypeFilter === 'All' ? items : items.filter(i => i.inventoryType === stockTypeFilter);
    const filteredTxs = stockTypeFilter === 'All' ? transactions : transactions.filter(tx => tx.inventoryType === stockTypeFilter);

    const totalItems = filteredItems.length;
    const totalProjects = projects.length;
    let lowStock = 0;
    let outOfStock = 0;
    let currentTotalStock = 0;

    // Single pass for counters
    for (const item of filteredItems) {
      currentTotalStock += item.currentQuantity;
      if (item.currentQuantity === 0) {
        outOfStock++;
      } else if (item.currentQuantity <= item.minStock) {
        lowStock++;
      }
    }
    
    // Calculate real historical stock trend
    const now = new Date();
    const last7Days: string[] = [];
    const dailyData: Record<string, { name: string, stock: number, in: number, out: number }> = {};

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        const dayString = d.toISOString().split('T')[0];
        last7Days.push(dayString);
        dailyData[dayString] = { name: dayString.split('-')[2], stock: 0, in: 0, out: 0 };
    }

    // Work backwards from today using pre-grouped logic if possible, 
    // but here we just optimize the iteration
    let runningStock = currentTotalStock;
    const sortedTx = [...filteredTxs].sort((a, b) => {
      const dateA = getDateObject(a.date)?.getTime() || 0;
      const dateB = getDateObject(b.date)?.getTime() || 0;
      return dateB - dateA;
    });

    // AI Analytics: Most frequently moved items
    const moveCounts: Record<string, number> = {};

    last7Days.slice().reverse().forEach(day => {
      if (dailyData[day]) {
        dailyData[day].stock = runningStock;
        
        // Find transactions for this day
        for (const tx of sortedTx) {
          const d = getDateObject(tx.date);
          if (!d) continue;
          const txDay = d.toISOString().split('T')[0];
          if (txDay === day) {
              if (tx.type === 'IN') {
                dailyData[day].in += tx.quantity;
                runningStock -= tx.quantity; 
              } else {
                dailyData[day].out += tx.quantity;
                runningStock += tx.quantity;
              }
              // Transaction count for AI sidebar
              moveCounts[tx.itemName] = (moveCounts[tx.itemName] || 0) + 1;
          }
        }
      }
    });

    const monthlyStockData = Object.values(dailyData);

    const mostMovedItems = Object.entries(moveCounts)
      .map(([name, count]) => ({ name: name.substring(0, 12), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const distribution = [
      { name: 'Healthy', value: filteredItems.filter(i => i.currentQuantity > i.minStock * 2).length },
      { name: 'Warning', value: filteredItems.filter(i => i.currentQuantity <= i.minStock * 2 && i.currentQuantity > i.minStock).length },
      { name: 'Critical', value: lowStock + outOfStock },
    ];

    return { totalItems, totalProjects, lowStock: lowStock + outOfStock, outOfStock, monthlyStockData, mostMovedItems, distribution };
  }, [items, transactions, projects, stockTypeFilter]);

  const uniqueValues = useMemo(() => {
    return {
      brands: Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[],
      models: Array.from(new Set(items.map(i => i.modelNumber).filter(Boolean))) as string[],
      suppliers: Array.from(new Set(items.map(i => i.supplier).filter(Boolean))) as string[],
      projects: Array.from(new Set(items.map(i => i.outlet).filter(Boolean))) as string[],
      warehouseLocations: Array.from(new Set(['Dip Room 35', 'AL Quoz', 'Home Box', 'Head Office', ...items.map(i => i.warehouseLocation).filter(Boolean)])) as string[],
    };
  }, [items]);

  const stockSuggestions = useMemo(() => {
    if (!stockSearch || stockSearch.length < 1) return [];
    
    const searchLow = stockSearch.toLowerCase();
    const matches = new Set<string>();
    
    items.forEach(item => {
      if (item.name.toLowerCase().includes(searchLow)) matches.add(item.name);
      if (item.brand && item.brand.toLowerCase().includes(searchLow)) matches.add(item.brand);
      if (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow)) matches.add(item.modelNumber);
    });
    
    return Array.from(matches).slice(0, 8);
  }, [stockSearch, items]);

  const jobSuggestions = useMemo(() => {
    if (!stockJobFilter || stockJobFilter.length < 1) return [];
    const searchLow = stockJobFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.jobNumber && item.jobNumber.toLowerCase().includes(searchLow)) matches.add(item.jobNumber);
    });
    return Array.from(matches).slice(0, 8);
  }, [stockJobFilter, items]);

  const clientSuggestions = useMemo(() => {
    if (!stockClientFilter || stockClientFilter.length < 1) return [];
    const searchLow = stockClientFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.client && item.client.toLowerCase().includes(searchLow)) matches.add(item.client);
    });
    return Array.from(matches).slice(0, 8);
  }, [stockClientFilter, items]);

  const locationSuggestions = useMemo(() => {
    if (!stockLocationFilter || stockLocationFilter.length < 1) return [];
    const searchLow = stockLocationFilter.toLowerCase();
    const matches = new Set<string>();
    items.forEach(item => {
      if (item.location && item.location.toLowerCase().includes(searchLow)) matches.add(item.location);
      if (item.warehouseLocation && item.warehouseLocation.toLowerCase().includes(searchLow)) matches.add(item.warehouseLocation);
    });
    return Array.from(matches).slice(0, 8);
  }, [stockLocationFilter, items]);

  const recentTransactions = useMemo(() => {
    let filtered = transactions;
    if (txTypeFilter !== 'ALL') {
      filtered = filtered.filter(tx => tx.type === txTypeFilter);
    }
    return filtered.slice(0, 10);
  }, [transactions, txTypeFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // If AI search is active, use its results
      if (aiResultIds !== null) {
        return aiResultIds.includes(item.id);
      }

      // Basic Search
      const searchLow = stockSearch.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(searchLow) || 
                           (item.brand && item.brand.toLowerCase().includes(searchLow)) ||
                           (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow));
      if (!matchesSearch) return false;

      // New Multi-select Filters
      if (selectedBrands.length > 0 && (!item.brand || !selectedBrands.includes(item.brand))) return false;
      if (selectedModels.length > 0 && (!item.modelNumber || !selectedModels.includes(item.modelNumber))) return false;
      if (selectedSuppliers.length > 0 && (!item.supplier || !selectedSuppliers.includes(item.supplier))) return false;
      if (selectedOutlets.length > 0 && (!item.outlet || !selectedOutlets.includes(item.outlet))) return false;
      if (selectedWarehouseLocations.length > 0 && (!item.warehouseLocation || !selectedWarehouseLocations.includes(item.warehouseLocation))) return false;

      // Text Filters
      const matchesJob = !stockJobFilter || (item.jobNumber && item.jobNumber.toLowerCase().includes(stockJobFilter.toLowerCase()));
      const matchesClient = !stockClientFilter || (item.client && item.client.toLowerCase().includes(stockClientFilter.toLowerCase()));
      const matchesLocation = !stockLocationFilter || (item.location && item.location.toLowerCase().includes(stockLocationFilter.toLowerCase()));
      
      if (!matchesJob || !matchesClient || !matchesLocation) return false;

      // Global Stock Type
      if (stockTypeFilter !== 'All' && item.inventoryType !== stockTypeFilter) return false;

      // Date Range Filters
      if (stockInStart) {
        if (!item.stockInDate || item.stockInDate < new Date(stockInStart).getTime()) return false;
      }
      if (stockInEnd) {
        if (!item.stockInDate || item.stockInDate > new Date(stockInEnd).setHours(23, 59, 59, 999)) return false;
      }
      if (updatedStart) {
        if (!item.lastUpdated || item.lastUpdated < new Date(updatedStart).getTime()) return false;
      }
      if (updatedEnd) {
        if (!item.lastUpdated || item.lastUpdated > new Date(updatedEnd).setHours(23, 59, 59, 999)) return false;
      }

      return true;
    });
  }, [items, stockSearch, stockJobFilter, stockClientFilter, stockLocationFilter, aiResultIds, stockTypeFilter, selectedBrands, selectedModels, selectedSuppliers, selectedOutlets, selectedWarehouseLocations, stockInStart, stockInEnd, updatedStart, updatedEnd]);

  const handleExportTransactions = useCallback(() => {
    const filteredTx = txTypeFilter === 'ALL' 
      ? transactions 
      : transactions.filter(tx => tx.type === txTypeFilter);
    generateTransactionsReport(filteredTx, { typeFilter: txTypeFilter });
  }, [transactions, txTypeFilter]);

  const clearAllFilters = useCallback(() => {
    setStockSearch('');
    setStockJobFilter('');
    setStockClientFilter('');
    setStockLocationFilter('');
    setSelectedBrands([]);
    setSelectedModels([]);
    setSelectedSuppliers([]);
    setSelectedOutlets([]);
    setSelectedWarehouseLocations([]);
    setStockInStart('');
    setStockInEnd('');
    setUpdatedStart('');
    setUpdatedEnd('');
    setAiResultIds(null);
    setAiSearchQuery('');
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-12"
    >
      {/* Stunning Refined Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none">System Terminal Online</span>
            </div>
            
            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight leading-tight">
              Welcome back, <br className="md:hidden" />
              <motion.span 
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% auto" }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-fuchsia-400 to-primary"
              >
                {user.displayName?.split(' ')[0] || 'Friend'}
              </motion.span>
            </h1>
            <p className="text-slate-400 text-xs md:text-base font-medium max-w-lg border-l-2 border-white/5 pl-4 ml-1">
              Synchronizing with central grid. <span className="text-white">{items.length} assets</span> currently under management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-5 h-5 text-primary" />
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Standard Time</span>
                <span className="text-sm font-bold text-slate-200">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Date Signature</span>
                <span className="text-sm font-bold text-slate-200">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            <AIQuickNews />
          </div>
        </div>
      </motion.div>

      {/* AI Insights Bar */}
      {items.length > 0 && (
        <div className="glass-morphism p-6 rounded-[32px] border border-primary/20 shadow-2xl relative overflow-hidden bg-primary/5">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32 text-primary rotate-12" />
          </div>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group">
                <motion.div
                   animate={{ 
                     scale: [1, 1.2, 1],
                     filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                   }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className="w-6 h-6" />
                </motion.div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-white flex items-center space-x-2">
                    <span>AI Inventory Advisor</span>
                    {isAnalyzing ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/20 animate-pulse">Analyzing...</span>
                    ) : (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">Active</span>
                    )}
                  </h3>
                  {lastAnalysisTime > 0 && !isAnalyzing && (
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                      Last: {new Date(lastAnalysisTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Gemini is analyzing your stock patterns and transaction history</p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl px-1 md:px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex space-x-3 md:space-x-4 overflow-x-auto pb-4 custom-scrollbar-hide">
                  {!isAnalyzing && insights.length === 0 ? (
                    <p className="text-xs text-slate-500 italic mt-4">No critical insights found yet. Click refresh to analyze.</p>
                  ) : isAnalyzing ? (
                    Array(2).fill(0).map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-56 md:w-64 h-14 md:h-16 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                    ))
                  ) : (
                    insights.map((insight, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "flex-shrink-0 w-64 md:w-72 p-3 rounded-2xl border transition-all cursor-default shadow-lg",
                          insight.type === 'WARNING' ? "bg-red-500/10 border-red-500/20 text-red-100" :
                          insight.type === 'POSITIVE' ? "bg-green-500/10 border-green-500/20 text-green-100" :
                          "bg-white/5 border-white/10 text-slate-200"
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-xl flex-shrink-0",
                            insight.type === 'WARNING' ? "bg-red-500/20" :
                            insight.type === 'POSITIVE' ? "bg-green-500/20" :
                            "bg-white/10"
                          )}>
                            <Lightbulb className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[10px] font-black uppercase tracking-wider opacity-60 truncate">{insight.title}</p>
                              <div className="flex items-center space-x-1">
                                {insight.type === 'WARNING' && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      persistInsights([insight]);
                                    }}
                                    disabled={persistingInsights}
                                    className="p-1 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-500 transition-colors"
                                    title="Broadcast as Proactive Alert"
                                  >
                                    {persistingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                                  </motion.button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] font-medium leading-tight mt-0.5 line-clamp-2">{insight.message}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLastAnalysisTime(0)} // Triggers re-fetch due to dependency
                  disabled={isAnalyzing}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary transition-all shadow-xl flex-shrink-0"
                  title="Force AI Refresh"
                >
                  <RotateCcw className={cn("w-5 h-5", isAnalyzing && "animate-spin")} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Stock Type Toggle */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 md:gap-4 px-1">
        {[
          { id: 'All', label: 'All Inventory', icon: Package },
          { id: 'Warehouse Stock', label: 'Warehouse', icon: Globe },
          { id: 'Client Stock', label: 'Client', icon: HistoryIcon }
        ].map((type) => (
          <motion.button
            key={type.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStockTypeFilter(type.id as any)}
            className={cn(
              "flex items-center space-x-2 md:space-x-3 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[24px] font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all border",
              stockTypeFilter === type.id 
                ? "bg-primary border-primary text-white shadow-2xl shadow-primary/40 ring-4 ring-primary/20" 
                : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10"
            )}
          >
            <type.icon className="w-3 h-3 md:w-4 md:h-4" />
            <span>{type.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <StatCard 
          label="Items" 
          value={stats.totalItems} 
          icon={Package} 
          trend="+12%" 
          trendUp={true} 
          color="blue"
        />
        <StatCard 
          label="Jobs" 
          value={stats.totalProjects} 
          icon={Zap} 
          trend="Sync" 
          trendUp={true} 
          color="indigo"
        />
        <StatCard 
          label="Low Stock" 
          value={stats.lowStock} 
          icon={AlertCircle} 
          trend={`${Math.round((stats.lowStock / (stats.totalItems || 1)) * 100)}%`} 
          trendUp={false} 
          color="amber"
          active={stats.lowStock > 0}
        />
        <StatCard 
          label="O.O.S" 
          value={stats.outOfStock} 
          icon={AlertCircle} 
          trend="Critical" 
          trendUp={false} 
          color="red"
          active={stats.outOfStock > 0}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard 
            label="Total Activity" 
            value={transactions.length} 
            icon={TrendingUp} 
            trend="+5 today" 
            trendUp={true} 
            color="indigo"
          />
        </div>
      </div>

      {/* AI Daily Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
           <AIPoweredNews />
        </div>
        <div className="lg:col-span-8 flex items-center p-8 glass-morphism rounded-[32px] border border-white/5 bg-primary/5 relative overflow-hidden group">
           <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/10 blur-[100px] border border-primary/20 rounded-full" />
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 w-full">
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-2xl relative">
                 <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
                 <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-bold text-white tracking-tight">AI Strategy Hub</h3>
                 <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-lg">
                    Based on your stock levels and current {stats.outOfStock ? 'out-of-stock criticalities' : 'healthy patterns'}, 
                    Gemini recommends focusing on <span className="text-primary font-bold">{stats.outOfStock ? 're-stocking critical assets' : 'inventory optimization'}</span> this week.
                 </p>
                 <div className="flex space-x-4 mt-6">
                    <button className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Run Simulation</button>
                    <button className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 text-slate-400 border border-white/10 rounded-xl hover:text-white transition-colors">View Forecast</button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Stock Report Section - MOVED ABOVE AI ANALYTICS */}
      <div className="glass-morphism p-8 rounded-[40px] border border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Stock Status Report</h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Real-time inventory valuation & tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all duration-300",
                showAdvancedFilters 
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              <Filter className={cn("w-3.5 h-3.5", (selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || selectedWarehouseLocations.length > 0 || stockJobFilter || stockClientFilter || stockLocationFilter || stockInStart || stockInEnd || updatedStart || updatedEnd) && "animate-bounce")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
              {(selectedBrands.length > 0 || selectedModels.length > 0 || selectedSuppliers.length > 0 || selectedOutlets.length > 0 || selectedWarehouseLocations.length > 0 || stockJobFilter || stockClientFilter || stockLocationFilter || stockInStart || stockInEnd || updatedStart || updatedEnd) && (
                <div className="w-1 h-1 rounded-full bg-slate-950 animate-pulse" />
              )}
            </motion.button>
            <button 
              onClick={() => generateInventoryReport(filteredItems)}
              className="px-4 py-2 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-xl border border-indigo-500/20 hover:bg-indigo-500/30 transition-all flex items-center space-x-2 group"
            >
              <motion.div
                whileHover={{ y: [-2, 2, -2] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <FileText className="w-3.5 h-3.5" />
              </motion.div>
              <span>EXPORT REPORT</span>
            </button>
            <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
              <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">Active Catalog</span>
            </div>
          </div>
        </div>

        {/* Filters Top Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-8 relative group">
            <form onSubmit={handleAiSearch} className="relative group">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, type: "tween", ease: "easeInOut" }}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <Sparkles className="w-4 h-4 text-primary group-focus-within:text-white transition-colors" />
              </motion.div>
              <input 
                type="text" 
                placeholder="AI Smart Search (e.g., 'items with low stock')..." 
                value={aiSearchQuery}
                onChange={(e) => {
                  setAiSearchQuery(e.target.value);
                  if (!e.target.value) setAiResultIds(null);
                }}
                className="w-full pl-11 pr-4 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-sm text-white placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                {isAiSearching && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {aiResultIds !== null && (
                  <button 
                    type="button"
                    onClick={() => {
                      setAiSearchQuery('');
                      setAiResultIds(null);
                    }}
                    className="text-[10px] font-black text-primary hover:text-white transition-colors"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <button type="submit" className="hidden" />
            </form>
          </div>

          <div className="lg:col-span-4 relative group">
            <motion.div
              whileHover={{ scale: 1.2 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
            >
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            </motion.div>
            <input 
              type="text" 
              placeholder="Search Items/Brands/Models..." 
              value={stockSearch}
              onChange={(e) => {
                setStockSearch(e.target.value);
                setShowStockSuggestions(true);
              }}
              onFocus={() => setShowStockSuggestions(true)}
              className="w-full pl-11 pr-32 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
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
              {showStockSuggestions && stockSuggestions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStockSuggestions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-2 space-y-1">
                      {stockSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setStockSearch(suggestion);
                            setShowStockSuggestions(false);
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
        </div>

        {/* Advanced Filters Section */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FilterDropdown 
                    label="Brands" 
                    options={uniqueValues.brands} 
                    selected={selectedBrands} 
                    onChange={setSelectedBrands} 
                  />
                  
                  <FilterDropdown 
                    label="Model Numbers" 
                    options={uniqueValues.models} 
                    selected={selectedModels} 
                    onChange={setSelectedModels} 
                  />

                  <FilterDropdown 
                    label="Suppliers" 
                    options={uniqueValues.suppliers} 
                    selected={selectedSuppliers} 
                    onChange={setSelectedSuppliers} 
                  />

                  <FilterDropdown 
                    label="Projects" 
                    options={uniqueValues.projects} 
                    selected={selectedOutlets} 
                    onChange={setSelectedOutlets} 
                  />
                  
                  <FilterDropdown 
                    label="WH Location" 
                    options={uniqueValues.warehouseLocations} 
                    selected={selectedWarehouseLocations} 
                    onChange={setSelectedWarehouseLocations} 
                  />

                   <div className="space-y-1.5 relative">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Search</label>
                     <div className="relative">
                       <input 
                         type="text"
                         value={stockClientFilter}
                         onChange={(e) => {
                           setStockClientFilter(e.target.value);
                           setShowClientSuggestions(true);
                         }}
                         onFocus={() => setShowClientSuggestions(true)}
                         placeholder="Search clients..."
                         className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                       <AnimatePresence>
                         {showClientSuggestions && clientSuggestions.length > 0 && (
                           <>
                             <div className="fixed inset-0 z-40" onClick={() => setShowClientSuggestions(false)} />
                             <motion.div
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: 10 }}
                               className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                             >
                               <div className="p-1 space-y-0.5">
                                 {clientSuggestions.map((suggestion, index) => (
                                   <button
                                     key={index}
                                     onClick={() => {
                                       setStockClientFilter(suggestion);
                                       setShowClientSuggestions(false);
                                     }}
                                     className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/5 transition-colors text-left rounded-lg group"
                                   >
                                     <Search className="w-3 h-3 text-slate-600 group-hover:text-primary" />
                                     <span className="text-[11px] font-medium text-slate-400 group-hover:text-white">{suggestion}</span>
                                   </button>
                                 ))}
                               </div>
                             </motion.div>
                           </>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>

                   <div className="space-y-1.5 relative">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Number</label>
                     <div className="relative">
                       <input 
                         type="text"
                         value={stockJobFilter}
                         onChange={(e) => {
                           setStockJobFilter(e.target.value);
                           setShowJobSuggestions(true);
                         }}
                         onFocus={() => setShowJobSuggestions(true)}
                         placeholder="Filter by Job#..."
                         className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                       <AnimatePresence>
                         {showJobSuggestions && jobSuggestions.length > 0 && (
                           <>
                             <div className="fixed inset-0 z-40" onClick={() => setShowJobSuggestions(false)} />
                             <motion.div
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: 10 }}
                               className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                             >
                               <div className="p-1 space-y-0.5">
                                 {jobSuggestions.map((suggestion, index) => (
                                   <button
                                     key={index}
                                     onClick={() => {
                                       setStockJobFilter(suggestion);
                                       setShowJobSuggestions(false);
                                     }}
                                     className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/5 transition-colors text-left rounded-lg group"
                                   >
                                     <Search className="w-3 h-3 text-slate-600 group-hover:text-primary" />
                                     <span className="text-[11px] font-medium text-slate-400 group-hover:text-white">{suggestion}</span>
                                   </button>
                                 ))}
                               </div>
                             </motion.div>
                           </>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>

                   <div className="space-y-1.5 relative">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Outlet</label>
                     <div className="relative">
                       <input 
                         type="text"
                         value={stockLocationFilter}
                         onChange={(e) => {
                           setStockLocationFilter(e.target.value);
                           setShowLocationSuggestions(true);
                         }}
                         onFocus={() => setShowLocationSuggestions(true)}
                         placeholder="Search outlets..."
                         className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 outline-none"
                       />
                       <AnimatePresence>
                         {showLocationSuggestions && locationSuggestions.length > 0 && (
                           <>
                             <div className="fixed inset-0 z-40" onClick={() => setShowLocationSuggestions(false)} />
                             <motion.div
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               exit={{ opacity: 0, y: 10 }}
                               className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                             >
                               <div className="p-1 space-y-0.5">
                                 {locationSuggestions.map((suggestion, index) => (
                                   <button
                                     key={index}
                                     onClick={() => {
                                       setStockLocationFilter(suggestion);
                                       setShowLocationSuggestions(false);
                                     }}
                                     className="w-full px-3 py-1.5 flex items-center space-x-2 hover:bg-white/5 transition-colors text-left rounded-lg group"
                                   >
                                     <Search className="w-3 h-3 text-slate-600 group-hover:text-primary" />
                                     <span className="text-[11px] font-medium text-slate-400 group-hover:text-white">{suggestion}</span>
                                   </button>
                                 ))}
                               </div>
                             </motion.div>
                           </>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>

                  {/* Date Filters Row */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock In (From)</label>
                    <input 
                      type="date"
                      value={stockInStart}
                      onChange={(e) => setStockInStart(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock In (To)</label>
                    <input 
                      type="date"
                      value={stockInEnd}
                      onChange={(e) => setStockInEnd(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Updated (From)</label>
                    <input 
                      type="date"
                      value={updatedStart}
                      onChange={(e) => setUpdatedStart(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Updated (To)</label>
                    <div className="flex space-x-2">
                      <input 
                        type="date"
                        value={updatedEnd}
                        onChange={(e) => setUpdatedEnd(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                      <button 
                        onClick={clearAllFilters}
                        className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Clear All Filters"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                   <p className="text-[10px] font-black text-slate-500 uppercase">
                     Filters applied: <span className="text-primary">{
                        [selectedBrands.length, selectedModels.length, selectedSuppliers.length, selectedOutlets.length, selectedWarehouseLocations.length, stockJobFilter, stockClientFilter, stockLocationFilter, stockInStart, stockInEnd, updatedStart, updatedEnd].filter(Boolean).length
                     }</span>
                   </p>
                   <button 
                    onClick={clearAllFilters}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden bg-white/[0.02] rounded-3xl border border-white/5">
          {/* Header */}
          <div className="flex items-center border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Item Name</div>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Stock</div>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 hidden lg:block">Client Name</div>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 hidden lg:block">Client Outlet</div>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-right hidden xl:block">Job #</div>
            <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1 hidden xl:block">WH Location</div>
          </div>
          
          <div className="h-[500px] w-full">
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={stockListRef}
                  height={height}
                  itemCount={filteredItems.length}
                  itemSize={72}
                  width={width}
                  itemData={{ items: filteredItems }}
                  className="custom-scrollbar"
                >
                  {StockTableRow}
                </List>
              )}
            </AutoSizer>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
              <Package className="w-12 h-12 text-slate-800" />
              <div>
                <p className="text-sm font-bold text-slate-600">No matching assets found</p>
                <p className="text-xs text-slate-700 uppercase tracking-widest font-black mt-1">Refine your search parameters</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-morphism p-8 rounded-[40px] border border-white/5 bg-amber-500/5 order-1 lg:order-2">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Stock at Risk</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Critical items requiring attention</p>
          </div>

          <div className="space-y-4">
            {stats.outOfStock > 0 || stats.lowStock > 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-300">{stats.outOfStock} items out of stock</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">{stats.lowStock} items below threshold</p>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-4">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-300">Inventory Healthy</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">All items are above minimum stock levels</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 glass-morphism p-8 rounded-[40px] border border-white/5 relative overflow-hidden order-2 lg:order-1">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp className="w-48 h-48 text-primary" />
          </div>
          <div className="relative mb-8">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Performance Intelligence</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">Most frequently moved inventory items</p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.mostMovedItems}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    backdropFilter: 'blur(12px)',
                    fontSize: '11px',
                    color: '#fff'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-morphism p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white">Inventory Performance & Capacity</h3>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Restock</span>
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-wider">Dispatch</span>
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Total Stock</span>
            </div>
          </div>
          <div className="h-80 w-full text-white">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyStockData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px',
                    borderColor: 'transparent'
                  }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="stock" stroke="#2563EB" fillOpacity={1} fill="url(#colorStock)" strokeWidth={2} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="in" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} />
                <Area type="monotone" dataKey="out" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f43f5e' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-morphism p-6 rounded-3xl border border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white">Recent Transactions</h3>
            <div className="flex items-center space-x-2">
              <select 
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none"
              >
                <option value="ALL">ALL</option>
                <option value="IN">STOCK IN</option>
                <option value="OUT">STOCK OUT</option>
              </select>
              <button 
                onClick={handleExportTransactions}
                className="p-1.5 bg-primary/20 text-primary rounded-lg border border-primary/20 hover:bg-primary/30 transition-colors"
                title="Export PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <HistoryIcon className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex items-center space-x-4">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: tx.type === 'IN' ? 45 : -45 }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform ${
                      tx.type === 'IN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.type === 'IN' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </motion.div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{tx.itemName}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tx.client || 'Internal Operation'}</p>
                        {(tx.brand || tx.modelNumber) && (
                          <>
                            <span className="text-slate-700 text-[10px]">•</span>
                            <span className="text-[9px] text-primary/60 font-black uppercase tracking-tighter">
                              {tx.brand} {tx.modelNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${
                      tx.type === 'IN' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                    </p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                      {tx.type === 'IN' ? 'In' : 'Out'}: {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const StatCard = memo(({ label, value, icon: Icon, trend, trendUp, color, active }: any) => {
  const colors: any = {
    blue: 'bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/10',
    amber: 'bg-amber-500/20 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-900/10',
    red: 'bg-red-500/20 text-red-400 border border-red-500/20 shadow-lg shadow-red-900/10',
    indigo: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-900/10'
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 md:p-6 rounded-[24px] md:rounded-3xl glass-morphism border border-white/5 shadow-sm transition-all duration-300 ${active ? 'ring-2 ring-red-500/20 bg-red-500/5' : ''}`}
    >
      <div className="flex items-start justify-between">
        <motion.div 
          whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${colors[color]}`}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </motion.div>
        <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-slate-400'}`}>
          {trend}
        </span>
      </div>
      <div className="mt-3 md:mt-4">
        <p className="text-slate-400 text-xs md:text-sm font-medium">{label}</p>
        <h3 className="text-2xl md:text-3xl font-bold text-white mt-0.5 md:mt-1">{value}</h3>
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';
