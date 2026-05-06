import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight } from 'lucide-react';

const TIPS = [
  "UAE Focus: Industrial ovens with IoT sensors are reducing maintenance costs by 20% in Dubai restaurant clusters.",
  "Global Tech: Hydrogen-powered professional ranges are entering the European market this quarter.",
  "Trend: Modular walk-in coolers are becoming the standard for ghost kitchens across the GCC.",
  "Quick Fact: Induction cooking in commercial kitchens is 90% energy efficient compared to 50% for gas."
];

export default React.memo(function AIQuickNews() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute top-full right-0 mt-4 z-[100] w-72"
      >
        <div className="relative glass-morphism p-5 rounded-[24px] border border-primary/30 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>

          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Daily Briefing</span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {TIPS[currentTip]}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-1">
               {TIPS.map((_, i) => (
                 <div key={i} className={`h-1 rounded-full transition-all ${i === currentTip ? 'w-4 bg-primary' : 'w-1 bg-white/10'}`} />
               ))}
            </div>
            <button 
              onClick={() => setCurrentTip((prev) => (prev + 1) % TIPS.length)}
              className="text-[10px] font-black text-primary uppercase tracking-tighter flex items-center hover:translate-x-1 transition-transform"
            >
              Next Insight <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
