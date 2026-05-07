import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, X, MessageSquare, Sparkles, Cpu, Bot, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface ZecorpMascotProps {
  userDisplayName?: string;
}

export const ZecorpMascot: React.FC<ZecorpMascotProps> = ({ userDisplayName = 'User' }) => {
  const [position, setPosition] = useState({ x: 85, y: 80 }); // Percentage based on viewport - changed default to closer to sidebar/bottom
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [currentNews, setCurrentNews] = useState(`Hi ${userDisplayName.split(' ')[0]}! I'm Zec AI, Your Assistant.`);
  const [updateIndex, setUpdateIndex] = useState(0);

  const todayUpdates = [
    { label: "Status", value: "Optimal", color: "text-emerald-400" },
    { label: "AI Prediction", value: "99.4%", color: "text-primary" },
    { label: "Refilling", value: "Auto-Mode", color: "text-amber-400" },
    { label: "Fleet", value: "Active", color: "text-cyan-400" }
  ];

  const aboutPoints = [
    "AI-Powered Prediction Engine",
    "Real-time Inventory Monitoring",
    "Automated Restock Alerts",
    "Seamless Project Integration",
    "Secure Team Collaboration"
  ];

  const newsItems = [
    "Peak efficiency reached in Dubai Hub.",
    "AI predicted 3 stockouts today.",
    "Zecorp expanding to new regions.",
    "New inventory batch arriving shortly.",
    "Smart alerts are active.",
    `Ready to help you, ${userDisplayName.split(' ')[0]}!`
  ];

  // Autonomous movement logic
  useEffect(() => {
    if (showAbout || isDragging) return;

    const moveInterval = setInterval(() => {
      // Random movement within bounds
      const newX = Math.random() * 80 + 10;
      const newY = Math.random() * 80 + 10;
      setPosition({ x: newX, y: newY });
    }, 15000);

    return () => clearInterval(moveInterval);
  }, [showAbout, isDragging]);

  // Periodic messages
  useEffect(() => {
    if (showAbout) return;

    const messageInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setCurrentNews(newsItems[Math.floor(Math.random() * newsItems.length)]);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 5000);
      }
    }, 12000);

    return () => clearInterval(messageInterval);
  }, [showAbout, newsItems]);

  // Cycle today's updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setUpdateIndex((prev) => (prev + 1) % todayUpdates.length);
    }, 4000);
    return () => clearInterval(updateInterval);
  }, [todayUpdates.length]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ overflow: 'hidden' }}
    >
      <motion.div
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          const xPercent = (info.point.x / window.innerWidth) * 100;
          const yPercent = (info.point.y / window.innerHeight) * 100;
          setPosition({ 
            x: Math.min(Math.max(xPercent, 5), 95), 
            y: Math.min(Math.max(yPercent, 5), 95) 
          });
        }}
        initial={false}
        animate={{ 
          left: `${position.x}%`, 
          top: `${position.y}%`,
          scale: [0.8, 0.85, 0.8], // Scale down slightly by default
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          left: isDragging ? { duration: 0 } : { duration: 10, ease: "easeInOut" },
          top: isDragging ? { duration: 0 } : { duration: 10, ease: "easeInOut" },
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute pointer-events-auto group cursor-grab active:cursor-grabbing gpu-accelerated scale-75 md:scale-100"
        onMouseEnter={() => {
          if (!showAbout && !isDragging) {
            setCurrentNews(`Hi ${userDisplayName.split(' ')[0]}! I'm Zec AI, Your Assistant.`);
            setShowMessage(true);
          }
        }}
        onMouseLeave={() => setShowMessage(false)}
        onClick={() => !isDragging && setShowAbout(!showAbout)}
      >
        {/* Mascot Figure - "AI Powered Robot in Zecorp uniform" */}
        <div className="relative group/mascot">
          {/* Hat / Baseball Cap */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
             {/* Crown */}
             <div className="w-9 h-5 bg-slate-900 rounded-t-[10px] border-t border-x border-primary/30 shadow-md relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-slate-800 rounded-full shadow-sm" />
                <span className="relative text-[4px] font-black text-white tracking-widest uppercase drop-shadow-sm">ZECORP</span>
             </div>
             {/* Bill / Visor */}
             <div className="w-12 h-2 bg-slate-900 rounded-full -mt-1 shadow-lg border-b border-white/10" />
          </div>

          {/* AI Robot Head */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 bg-slate-900 rounded-xl border border-primary/30 shadow-2xl z-10 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
            {/* Glowing Visor */}
            <div className="w-5 h-1.5 bg-primary/80 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
            {/* Corner Detailing */}
            <div className="absolute top-1 right-1 w-1 h-1 border-t border-r border-primary/40" />
            <div className="absolute bottom-1 left-1 w-1 h-1 border-b border-l border-primary/40" />
          </div>

          {/* Body / Uniform */}
          <div className="w-11 h-14 bg-slate-900 rounded-t-xl rounded-b-sm border-x border-t border-primary/30 shadow-2xl relative overflow-hidden flex flex-col items-center pt-3">
            {/* Glowing AI Core on Chest */}
            <div className="w-8 h-4 bg-primary/10 rounded-sm flex items-center justify-center mb-1 border border-primary/30 relative group-hover:bg-primary/20 transition-all">
              <span className="text-[5px] font-black text-primary px-1 tracking-wider uppercase drop-shadow-[0_0_2px_rgba(6,182,212,1)]">AI</span>
              <div className="absolute inset-0 bg-primary/10 animate-pulse" />
            </div>
            
            {/* Zecorp Text below AI Core */}
            <div className="mt-0.5 opacity-60">
               <span className="text-[4px] font-bold text-white tracking-[0.2em] uppercase">ZECORP</span>
            </div>

            {/* Circuit Pattern overlays */}
            <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-primary/10" />
            <div className="absolute bottom-4 left-0 w-4 h-4 border-l border-b border-primary/10" />

            {/* Belt */}
            <div className="absolute bottom-3 w-full h-1.5 bg-primary/20" />
            {/* Collar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2.5 border-b border-x border-primary/30 rounded-b-full bg-slate-800" />
          </div>
          
          {/* Robotic Arms */}
          <div className="absolute top-2 -left-2.5 w-2.5 h-8 bg-slate-900 rounded-full origin-top rotate-12 border-l border-primary/30 overflow-hidden">
             <div className="absolute top-2 left-0 w-full h-[1px] bg-primary/40" />
             <div className="absolute top-4 left-0 w-full h-[1px] bg-primary/40" />
          </div>
          <div className="absolute top-2 -right-2.5 w-2.5 h-8 bg-slate-900 rounded-full origin-top -rotate-12 border-r border-primary/30 overflow-hidden">
             <div className="absolute top-2 left-0 w-full h-[1px] bg-primary/40" />
             <div className="absolute top-4 left-0 w-full h-[1px] bg-primary/40" />
          </div>

          {/* Robotic Legs */}
          <div className="flex justify-center space-x-0.5 -mt-0.5">
            <div className="w-5 h-4 bg-slate-900 rounded-b-md shadow-inner border-x border-b border-primary/20" />
            <div className="w-5 h-4 bg-slate-900 rounded-b-md shadow-inner border-x border-b border-primary/20" />
          </div>

          {/* Glowing Aura */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10 animate-pulse" />
          
          {/* Today's Update Box */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 15 }}
            className="absolute top-0 -right-24 z-30"
          >
            <div className="bg-[#030712]/80 backdrop-blur-md border border-primary/30 rounded-lg p-2 shadow-2xl min-w-[80px] overflow-hidden group-hover:scale-110 transition-transform">
              <div className="flex items-center space-x-1 border-b border-primary/20 pb-1 mb-1">
                <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                <span className="text-[6px] font-black text-primary uppercase tracking-tighter">Today's Update</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={updateIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col">
                    <span className="text-[5px] text-white/50 uppercase tracking-widest leading-none mb-0.5">{todayUpdates[updateIndex].label}</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-tight", todayUpdates[updateIndex].color)}>
                      {todayUpdates[updateIndex].value}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-0 right-0 p-0.5 opacity-20">
                <Cpu className="w-3 h-3 text-primary" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Speech Bubble / News Board Message */}
        <AnimatePresence>
          {showMessage && !showAbout && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: -45 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl border border-white/20 flex items-center space-x-2 max-w-xs">
                <Sparkles className="w-3 h-3 text-amber-500 animate-spin-slow" />
                <p className="text-[10px] font-bold text-slate-800 leading-tight">
                  {currentNews}
                </p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVisible(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-2.5 h-2.5 text-slate-400" />
                </button>
              </div>
              <div className="w-2 h-2 bg-white/95 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* About Board - Large Detailed view on Click */}
        <AnimatePresence>
          {showAbout && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50, x: -100 }}
              animate={{ opacity: 1, scale: 1, y: -180, x: -100 }}
              exit={{ opacity: 0, scale: 0.5, y: 50, x: -100 }}
              className="absolute z-[100]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-64 bg-[#030712]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-primary/20 p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                       <Sparkles className="w-4 h-4 text-primary" />
                       <h4 className="text-xs font-black text-white uppercase tracking-widest">About Zecorp</h4>
                    </div>
                    <button 
                      onClick={() => setShowAbout(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Zecorp is the next evolution in supply chain management, utilizing Gemini AI to predict trends before they happen.
                  </p>
                  <div className="space-y-2">
                     {aboutPoints.map((point, i) => (
                       <div key={i} className="flex items-center space-x-2">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          <span className="text-[10px] text-slate-300 font-bold">{point}</span>
                       </div>
                     ))}
                  </div>
                  <div className="pt-2 flex flex-col space-y-2">
                     <button className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary/20 transition-all">
                        Launch Documentation
                     </button>
                     <button 
                        onClick={() => setIsVisible(false)}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-all flex items-center justify-center space-x-1"
                     >
                        <X className="w-3 h-3" />
                        <span>Dismiss Mascot</span>
                     </button>
                  </div>
                </div>
                <div className="bg-white/5 p-2 text-center border-t border-white/5">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini Pro</span>
                </div>
              </div>
              <div className="w-4 h-4 bg-[#030712] border-r border-b border-white/10 rotate-45 absolute -bottom-2 left-1/2 translate-x-[40px] z-[-1]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
