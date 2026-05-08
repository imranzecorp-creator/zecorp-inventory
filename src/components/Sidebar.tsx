import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Briefcase,
  Package, 
  History as LucideHistory, 
  Users, 
  MessageSquare, 
  ShieldCheck,
  Settings,
  Image as ImageIcon,
  Activity,
  Cpu,
  Database,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'admin' | 'user';
}

import Logo from './Logo';

export default React.memo(function Sidebar({ activeTab, setActiveTab, role }: SidebarProps) {
  const [uptime] = useState('99.9%');
  
  const menuItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-primary' },
      { id: 'inventory', label: 'Inventory', icon: Package, color: 'text-amber-400' },
      { id: 'projects', label: 'Projects', icon: Briefcase, color: 'text-emerald-400' },
      { id: 'transactions', label: 'Transactions', icon: LucideHistory, color: 'text-indigo-400' },
      { id: 'chat', label: 'Messages', icon: MessageSquare, color: 'text-violet-400' },
      { id: 'social', label: 'Social Feed', icon: ImageIcon, color: 'text-rose-400' },
      { id: 'intelligence', label: 'AI Intelligence', icon: Sparkles, color: 'text-cyan-400' },
    ];
    if (role === 'admin') {
      items.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck, color: 'text-red-400' });
    }
    return items;
  }, [role]);

  return (
    <div className="hidden md:flex flex-col w-60 bg-[#030712]/80 border-r border-white/10 relative z-50 overflow-hidden shadow-[10px_0_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
      {/* Energetic Dynamic Background Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.4, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [-30, 30, -30],
          y: [-50, 50, -50]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 -left-20 w-80 h-80 bg-blue-600/30 rounded-full blur-[120px] pointer-events-none mix-blend-plus-lighter" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1.5, 1.2],
          opacity: [0.1, 0.25, 0.1],
          x: [40, -40, 40],
          y: [30, -30, 30]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute middle-40 -right-20 w-72 h-72 bg-fuchsia-500/30 rounded-full blur-[100px] pointer-events-none mix-blend-plus-lighter" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          y: [100, -100, 100]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[110px] pointer-events-none mix-blend-plus-lighter" 
      />
      <motion.div 
        animate={{ 
          scale: [0.8, 1.2, 0.8],
          opacity: [0.05, 0.15, 0.05],
          x: [100, -50, 100]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[40%] left-[20%] w-48 h-48 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" 
      />
      
      <div className="p-5 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            filter: ["drop-shadow(0 0 10px rgba(var(--primary-rgb),0.2))", "drop-shadow(0 0 15px rgba(var(--primary-rgb),0.4))", "drop-shadow(0 0 10px rgba(var(--primary-rgb),0.2))"]
          }}
          transition={{ 
            opacity: { duration: 0.5 },
            scale: { type: "spring", stiffness: 200 },
            filter: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          whileHover={{ scale: 1.02 }}
          className="flex flex-col items-center"
        >
          <Logo className="scale-75" />
          <div className="mt-3 flex items-center space-x-2 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <motion.div 
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Operational</span>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center w-full px-4 py-3 text-xs font-black rounded-xl transition-all duration-500 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-gradient-to-r from-primary to-emerald-500 text-slate-900 shadow-[0_10px_15px_-5px_rgba(var(--primary-rgb),0.4)] scale-[1.02]" 
                : "text-slate-400 hover:text-white hover:bg-white/5 active:scale-95"
            )}
          >
            {activeTab === item.id && (
              <motion.div 
                layoutId="nav-glow"
                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
            <motion.div
              animate={{ 
                scale: activeTab === item.id ? 1.2 : 1,
                rotate: activeTab === item.id ? [0, -10, 10, 0] : 0,
              }}
              whileHover={{ 
                scale: 1.3,
                rotate: [0, -15, 15, 0],
              }}
              whileTap={{ scale: 0.9 }}
              transition={{ 
                scale: { type: "spring", stiffness: 400, damping: 10 },
                rotate: { 
                  duration: 0.4, 
                  repeat: activeTab === item.id ? Infinity : 0, 
                  repeatDelay: 2,
                  type: "tween",
                  ease: "easeInOut"
                }
              }}
              className="mr-3 relative"
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all duration-300",
                activeTab === item.id 
                  ? "text-slate-900 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" 
                  : cn("text-slate-300 opacity-60 group-hover:text-white group-hover:opacity-100", item.color?.replace('text-', 'group-hover:text-'))
              )} />
            </motion.div>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto space-y-3 relative z-10 bg-[#030712]/80 backdrop-blur-md">
        {/* System Health Widget - Pro Desktop UI */}
        <div className="px-3.5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 shadow-inner">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em]">CORE OS</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tight">{uptime}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="flex flex-col space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-primary/5 transition-colors">
                <div className="flex items-center space-x-1">
                   <Cpu className="w-2.5 h-2.5 text-primary group-hover:animate-spin" />
                   <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">AI Node</span>
                </div>
                <span className="text-[9px] font-bold text-white">Synchronized</span>
             </div>
             <div className="flex flex-col space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-amber-500/5 transition-colors">
                <div className="flex items-center space-x-1">
                   <Database className="w-2.5 h-2.5 text-amber-500 group-hover:scale-110 transition-transform" />
                   <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">Vault</span>
                </div>
                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">SECURE</span>
             </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center w-full px-4 py-3 text-xs font-bold rounded-xl transition-all duration-300 group overflow-hidden relative",
            activeTab === 'profile' 
              ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/20" 
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <motion.div
            animate={{ 
              rotate: activeTab === 'profile' ? 180 : 0,
              scale: activeTab === 'profile' ? 1.2 : 1
            }}
            whileHover={{ 
              rotate: 360,
              scale: 1.3,
              filter: "drop-shadow(0 0 12px rgba(var(--primary-rgb),0.6))"
            }}
            transition={{ 
              rotate: { type: "spring", stiffness: 200, damping: 15 },
              scale: { type: "spring", stiffness: 400, damping: 10 }
            }}
            className="mr-3"
          >
            <Settings className={cn(
              "w-5 h-5 transition-colors",
              activeTab === 'profile' ? "text-primary" : "text-slate-400 group-hover:text-slate-100"
            )} />
          </motion.div>
          Settings
        </button>
      </div>
    </div>
  );
});
