import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Filter, 
  ChevronDown, 
  Download, 
  FileText, 
  Activity, 
  Box, 
  PieChart,
  Loader2,
  RefreshCcw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { InventoryItem, StockTransaction } from '../types';
import { generateInventoryReport } from '../services/geminiService';
import { cn, getDateObject } from '../lib/utils';

interface AIReportsProps {
  inventory: InventoryItem[];
  transactions: StockTransaction[];
}

export function AIReports({ inventory, transactions }: AIReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  
  // Parameters
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [transactionType, setTransactionType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category).filter(Boolean));
    return Array.from(cats);
  }, [inventory]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReport(null);
    
    try {
      // Filter data based on parameters
      const now = new Date();
      let startDate: Date | null = null;
      
      if (dateRange === '7d') startDate = new Date(now.setDate(now.getDate() - 7));
      else if (dateRange === '30d') startDate = new Date(now.setDate(now.getDate() - 30));
      else if (dateRange === '90d') startDate = new Date(now.setDate(now.getDate() - 90));

      const filteredTransactions = transactions.filter(tx => {
        const d = getDateObject(tx.date);
        if (!d) return false;
        const txDate = d.getTime();
        const matchesDate = startDate ? txDate >= startDate.getTime() : true;
        const matchesType = transactionType === 'ALL' ? true : tx.type === transactionType;
        // For categories, we might need to find the item's category
        const item = inventory.find(i => i.id === tx.itemId || i.name === tx.itemName);
        const matchesCategory = selectedCategories.length === 0 ? true : (item && selectedCategories.includes(item.category));
        
        return matchesDate && matchesType && matchesCategory;
      });

      const filteredInventory = inventory.filter(item => 
        selectedCategories.length === 0 ? true : selectedCategories.includes(item.category)
      );

      const result = await generateInventoryReport({
        inventory: filteredInventory,
        transactions: filteredTransactions,
        parameters: {
          dateRange: startDate ? { start: startDate.toISOString(), end: new Date().toISOString() } : undefined,
          transactionType: transactionType === 'ALL' ? undefined : transactionType,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined
        }
      });

      setReport(result);
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategic Platform Overview - Mini Help */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-500/10 border border-indigo-500/20 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
          <Box className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-black text-indigo-100 uppercase tracking-widest mb-1">About Gemini Supply Chain Intelligence</h2>
          <p className="text-xs text-indigo-200/60 leading-relaxed">
            Gemini Supply Chain is a next-generation logistics platform that integrates <span className="text-indigo-400 font-bold">ZECORP Gemini AI</span> to automate stock mapping, predict supply chain disruptions, and generate strategic warehouse reports. It analyzes your entire inventory matrix to provide actionable insights for demand forecasting and operational efficiency.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-indigo-300 uppercase">AI Accuracy</span>
            <span className="text-lg font-black text-white">99.8%</span>
          </div>
          <div className="w-px h-10 bg-indigo-500/20" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-indigo-300 uppercase">Efficiency Boost</span>
            <span className="text-lg font-black text-white">+42%</span>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">AI Intelligence</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 min-w-0">
              <Activity className="w-3.5 h-3.5 text-primary" />
              Strategic Inventory Summaries
            </p>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-4 px-10 py-5 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 bg-[length:200%_auto] hover:bg-right text-slate-950 font-black uppercase text-sm rounded-[24px] hover:scale-[1.05] active:scale-[0.95] transition-all duration-700 disabled:opacity-50 disabled:grayscale shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.6)] group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="tracking-[0.2em]">Synthesizing Intelligence...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCcw className="w-6 h-6" />
              </motion.div>
              <span className="tracking-[0.3em]">Generate Strategic Report</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Parameters Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-morphism border border-white/5 rounded-[40px] p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3 mb-8">
              <Filter className="w-5 h-5 text-primary" />
              Report Parameters
            </h2>

            <div className="space-y-8">
              {/* Date Range */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        dateRange === range 
                          ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" 
                          : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {range === 'all' ? 'Full History' : `Last ${range.toUpperCase()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Type */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Stock Movement Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'IN', 'OUT'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTransactionType(type)}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        transactionType === type 
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20" 
                          : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Box className="w-3.5 h-3.5" /> Item Categories
                </label>
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                        selectedCategories.includes(cat)
                          ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
                          : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-[10px] text-slate-600 italic">No categories found in inventory.</p>
                  )}
                </div>
                {selectedCategories.length > 0 && (
                  <button 
                    onClick={() => setSelectedCategories([])}
                    className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-morphism rounded-3xl p-5 border border-white/5 pb-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Items Analyzed</p>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-white leading-none">{inventory.length}</span>
                <Box className="w-5 h-5 text-primary/30" />
              </div>
            </div>
            <div className="glass-morphism rounded-3xl p-5 border border-white/5 pb-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Movements</p>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-white leading-none">{transactions.length}</span>
                <Activity className="w-5 h-5 text-amber-500/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Report Display */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!report && !isGenerating ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full min-h-[500px] glass-morphism rounded-[40px] border border-white/5 flex flex-col items-center justify-center text-center p-12 overflow-hidden relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-24 h-24 rounded-[40px] bg-[#0f172a] border border-white/10 flex items-center justify-center mb-8 shadow-2xl relative z-10 transition-transform group-hover:scale-110 duration-500">
                  <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4 relative z-10">Ready for Insights?</h3>
                <p className="text-slate-500 font-bold max-w-sm mb-10 relative z-10">
                  Configure your parameters and click "Generate AI Report" to receive a strategic summary of your operations.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl relative z-10">
                  {[
                    { icon: PieChart, title: 'Growth Analysis', iconColor: 'text-indigo-400' },
                    { icon: Box, title: 'Stock Efficiency', iconColor: 'text-amber-400' },
                    { icon: Activity, title: 'Risk Detection', iconColor: 'text-emerald-400' }
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex flex-col items-center gap-3">
                      <item.icon className={cn("w-6 h-6", item.iconColor)} />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : isGenerating ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[600px] glass-morphism rounded-[40px] border border-white/5 flex flex-col items-center justify-center p-12 relative overflow-hidden"
              >
                <div className="absolute inset-0 border-[20px] border-primary/5 rounded-[40px] animate-pulse" />
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary animate-pulse" />
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mt-12 mb-4">Analyzing Warehouse Ecosystem</h3>
                <div className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                </div>
                <p className="text-slate-600 mt-6 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Processing Complex Patterns
                </p>
                
                <div className="mt-16 w-full max-w-md bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="space-y-3">
                    <div className="h-2 bg-white/10 rounded-full w-3/4 animate-pulse" />
                    <div className="h-2 bg-white/10 rounded-full w-full animate-pulse" />
                    <div className="h-2 bg-white/10 rounded-full w-1/2 animate-pulse" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="report"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full min-h-[600px] glass-morphism rounded-[40px] border border-white/5 flex flex-col p-0 overflow-hidden shadow-2xl relative"
              >
                {/* Report Header */}
                <div className="px-10 py-8 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Generated Strategy Report</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Professional Insight Tool
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all group"
                      title="Print Report"
                    >
                      <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Report Content */}
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-[#030712]/40">
                  <div className="prose prose-invert prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-white prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-primary prose-li:text-slate-300 prose-hr:border-white/10">
                    <Markdown>{report || ''}</Markdown>
                  </div>
                </div>

                {/* Report Footer */}
                <div className="px-10 py-6 bg-[#030712]/50 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System ZECORP-4x</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReport(null)}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    Reset & Recalculate <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
