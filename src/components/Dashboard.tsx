import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
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
  ListRestart
} from 'lucide-react';
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
import { formatDate, cn } from '../lib/utils';
import { generateInventoryReport, generateTransactionsReport } from '../services/pdfService';
import { analyzeInventory, processAiSearch, InventoryInsight } from '../services/geminiService';
import AIPoweredNews from './AIPoweredNews';
import AIQuickNews from './AIQuickNews';

interface DashboardProps {
  user: UserProfile;
  items: InventoryItem[];
  transactions: StockTransaction[];
  projects: Project[];
}

export default function Dashboard({ user, items, transactions, projects }: DashboardProps) {
  const [stockSearch, setStockSearch] = useState('');
  const [stockJobFilter, setStockJobFilter] = useState('');
  const [stockClientFilter, setStockClientFilter] = useState('');
  const [stockLocationFilter, setStockLocationFilter] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState<'All' | 'Warehouse Stock' | 'Client Stock'>('All');

  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InventoryInsight[]>([]);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (items.length > 0) {
        setIsAnalyzing(true);
        const results = await analyzeInventory(items, transactions);
        setInsights(results);
        setIsAnalyzing(false);
      }
    };

    fetchInsights();
  }, [items, transactions]);

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

  const stats = useMemo(() => {
    const filteredItems = stockTypeFilter === 'All' ? items : items.filter(i => i.inventoryType === stockTypeFilter);
    const filteredTxs = stockTypeFilter === 'All' ? transactions : transactions.filter(tx => tx.inventoryType === stockTypeFilter);

    const totalItems = filteredItems.length;
    const totalProjects = projects.length;
    const lowStock = filteredItems.filter(i => i.currentQuantity <= i.minStock).length;
    const outOfStock = filteredItems.filter(i => i.currentQuantity === 0).length;
    
    // Calculate real historical stock trend (aggregate for filtered items)
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    // Build snapshots
    let currentTotalStock = filteredItems.reduce((acc, item) => acc + item.currentQuantity, 0);
    const dailyData: Record<string, { name: string, stock: number, in: number, out: number }> = {};
    
    // Initialize base days
    last7Days.forEach(day => {
      dailyData[day] = { name: day.split('-')[2], stock: 0, in: 0, out: 0 };
    });

    // We work backwards from today
    let runningStock = currentTotalStock;
    const sortedTx = [...filteredTxs].sort((a, b) => b.date - a.date);

    last7Days.slice().reverse().forEach(day => {
      if (dailyData[day]) {
        dailyData[day].stock = runningStock;
        
        // Find transactions on this specific day and adjust running totals
        const dayTxs = sortedTx.filter(tx => new Date(tx.date).toISOString().split('T')[0] === day);
        dayTxs.forEach(tx => {
          if (tx.type === 'IN') {
            dailyData[day].in += tx.quantity;
            runningStock -= tx.quantity; // Remove added stock to go back in time
          } else {
            dailyData[day].out += tx.quantity;
            runningStock += tx.quantity; // Add back removed stock to go back in time
          }
        });
      }
    });

    const monthlyStockData = Object.values(dailyData);

    // AI Analytics Calculations
    // 1. Most frequently moved items
    const moveCounts: Record<string, number> = {};
    filteredTxs.forEach(tx => {
      moveCounts[tx.itemName] = (moveCounts[tx.itemName] || 0) + 1;
    });
    const mostMovedItems = Object.entries(moveCounts)
      .map(([name, count]) => ({ name: name.substring(0, 12), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Critical Stock Count
    const distribution = [
      { name: 'Healthy', value: filteredItems.filter(i => i.currentQuantity > i.minStock * 2).length },
      { name: 'Warning', value: filteredItems.filter(i => i.currentQuantity <= i.minStock * 2 && i.currentQuantity > i.minStock).length },
      { name: 'Critical', value: lowStock },
    ];

    return { totalItems, totalProjects, lowStock, outOfStock, monthlyStockData, mostMovedItems, distribution };
  }, [items, transactions, projects, stockTypeFilter]);

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

      const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) || 
                           (item.brand && item.brand.toLowerCase().includes(stockSearch.toLowerCase())) ||
                           (item.modelNumber && item.modelNumber.toLowerCase().includes(stockSearch.toLowerCase()));
      const matchesJob = !stockJobFilter || (item.jobNumber && item.jobNumber.toLowerCase().includes(stockJobFilter.toLowerCase()));
      const matchesClient = !stockClientFilter || (item.client && item.client.toLowerCase().includes(stockClientFilter.toLowerCase()));
      const matchesLocation = !stockLocationFilter || (item.location && item.location.toLowerCase().includes(stockLocationFilter.toLowerCase()));
      
      return matchesSearch && matchesJob && matchesClient && matchesLocation;
    });
  }, [items, stockSearch, stockJobFilter, stockClientFilter, stockLocationFilter, aiResultIds]);

  const handleExportTransactions = useCallback(() => {
    const filteredTx = txTypeFilter === 'ALL' 
      ? transactions 
      : transactions.filter(tx => tx.type === txTypeFilter);
    generateTransactionsReport(filteredTx, { typeFilter: txTypeFilter });
  }, [transactions, txTypeFilter]);

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
                <h3 className="text-lg font-black text-white flex items-center space-x-2">
                  <span>AI Inventory Advisor</span>
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">Active</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Gemini is analyzing your stock patterns and transaction history</p>
              </div>
            </div>

          <div className="flex-1 max-w-2xl px-1 md:px-4">
              <div className="flex space-x-3 md:space-x-4 overflow-x-auto pb-4 custom-scrollbar-hide">
                {isAnalyzing ? (
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
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{insight.title}</p>
                          <p className="text-[11px] font-medium leading-tight mt-0.5 line-clamp-2">{insight.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                {insights.length === 0 && !isAnalyzing && (
                  <p className="text-xs text-slate-500 italic">No critical insights found yet.</p>
                )}
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

        {/* Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          <div className="lg:col-span-4 relative group">
            <form onSubmit={handleAiSearch} className="relative group">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
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

          <div className="lg:col-span-2 relative group">
            <motion.div
              whileHover={{ scale: 1.2 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
            >
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            </motion.div>
            <input 
              type="text" 
              placeholder="Search ID..." 
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="lg:col-span-2 relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Job..." 
              value={stockJobFilter}
              onChange={(e) => setStockJobFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="lg:col-span-2 relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Client..." 
              value={stockClientFilter}
              onChange={(e) => setStockClientFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="lg:col-span-2 relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Project Outlet..." 
              value={stockLocationFilter}
              onChange={(e) => setStockLocationFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/5 pb-4">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Available Stock</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Client</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project Outlet</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Job Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.slice(0, 50).map((item) => (
                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                        <motion.div 
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 overflow-hidden"
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-600" />
                          )}
                        </motion.div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{item.name}</span>
                        {(item.brand || item.modelNumber) && (
                          <span className="text-[9px] text-primary/50 font-black uppercase tracking-tighter">
                            {item.brand} {item.modelNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-sm font-black ${item.currentQuantity <= item.minStock ? 'text-amber-500' : 'text-primary'}`}>
                      {item.currentQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-400 font-medium">{item.client || 'Internal'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-slate-400 uppercase font-black tracking-tighter opacity-60">{item.location}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {item.jobNumber || 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {filteredItems.slice(0, 20).map((item) => (
            <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className={cn(
                    "text-lg font-black",
                    item.currentQuantity <= item.minStock ? "text-amber-500" : "text-primary"
                  )}>{item.currentQuantity}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-[10px] font-black uppercase tracking-[0.1em]">
                <div className="flex flex-col">
                  <span className="text-slate-600">Project Outlet</span>
                  <span className="text-slate-300 truncate">{item.location}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-slate-600">Job#</span>
                  <span className="text-slate-300 truncate">{item.jobNumber || 'PENDING'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
          {items.length === 0 && (
            <div className="py-12 text-center text-slate-600 italic text-sm">
              No inventory records found.
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
