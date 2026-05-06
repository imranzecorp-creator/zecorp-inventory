import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Globe, MapPin, Zap, ChevronRight, RefreshCw } from 'lucide-react';
import { getDailyKitchenNews, NewsInsight } from '../services/aiNewsService';
import { cn } from '../lib/utils';

export default React.memo(function AIPoweredNews() {
  const [insights, setInsights] = useState<NewsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchNews = async () => {
    setLoading(true);
    const news = await getDailyKitchenNews();
    setInsights(news);
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (insights.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % insights.length);
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [insights]);

  if (loading && insights.length === 0) {
    return (
      <div className="h-32 glass-morphism rounded-3xl border border-white/5 animate-pulse flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary/30 animate-spin" />
      </div>
    );
  }

  const current = insights[currentIndex] || insights[0];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
      <div className="relative glass-morphism p-6 rounded-3xl border border-white/10 shadow-xl overflow-hidden min-h-[160px]">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-12 -mt-12 rounded-full"></div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest">Industry Insights</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">AI-Curated Intelligence</p>
            </div>
          </div>
          <button 
            onClick={fetchNews}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "anticipate" }}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                current?.category === 'UAE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                current?.category === 'Global' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}>
                {current?.category === 'UAE' && <MapPin className="w-2 h-2 inline mr-1 -mt-0.5" />}
                {current?.category === 'Global' && <Globe className="w-2 h-2 inline mr-1 -mt-0.5" />}
                {current?.category === 'Trend' && <Zap className="w-2 h-2 inline mr-1 -mt-0.5" />}
                {current?.category}
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tighter">Source: {current?.source}</span>
            </div>

            <h5 className="text-sm font-bold text-slate-100 line-clamp-1">{current?.title}</h5>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {current?.content}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex space-x-1">
            {insights.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 transition-all duration-500 rounded-full",
                  i === currentIndex ? "w-6 bg-primary" : "w-2 bg-white/10"
                )} 
              />
            ))}
          </div>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev + 1) % insights.length)}
            className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center group/btn"
          >
            Next Insight
            <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
});
