import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase,
  Package, 
  History, 
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
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'admin' | 'user';
}

import Logo from './Logo';

export default function Sidebar({ activeTab, setActiveTab, role }: SidebarProps) {
  const [uptime, setUptime] = useState('99.9%');
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'social', label: 'Social Feed', icon: ImageIcon },
    { id: 'intelligence', label: 'AI Intelligence', icon: Sparkles },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
  ];

  if (role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <div className="hidden md:flex flex-col w-64 bg-[#020617]/95 backdrop-blur-2xl border-r border-white/10 relative z-50 overflow-hidden shadow-[20px_0_50px_-20px_rgba(0,0,0,0.5)]">
      {/* Dynamic Background Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [-20, 20, -20],
          y: [-20, 20, -20]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1],
          x: [20, -20, 20],
          y: [20, -20, 20]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-40 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" 
      />
      
      <div className="p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            filter: ["drop-shadow(0 0 10px rgba(var(--primary-rgb),0.3))", "drop-shadow(0 0 20px rgba(var(--primary-rgb),0.5))", "drop-shadow(0 0 10px rgba(var(--primary-rgb),0.3))"]
          }}
          transition={{ 
            opacity: { duration: 0.5 },
            scale: { type: "spring", stiffness: 200 },
            filter: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          whileHover={{ scale: 1.05 }}
          className="flex flex-col items-center"
        >
          <Logo className="scale-75" />
        </motion.div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center w-full px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-500 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-gradient-to-r from-primary to-emerald-500 text-slate-900 shadow-[0_10px_20px_-10px_rgba(var(--primary-rgb),0.5)] scale-[1.02]" 
                : "text-slate-400 hover:text-white hover:bg-white/10 active:scale-95"
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
                rotate: activeTab === item.id ? [0, -15, 15, 0] : 0,
                filter: activeTab === item.id ? "drop-shadow(0 0 8px rgba(0,0,0,0.3))" : "none"
              }}
              whileHover={{ 
                scale: 1.3,
                rotate: activeTab === item.id ? [0, -15, 15, 0] : [0, -20, 20, 0],
              }}
              whileTap={{ scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 15,
                rotate: { 
                  duration: 0.5, 
                  repeat: activeTab === item.id ? Infinity : 0, 
                  repeatDelay: 3,
                  type: "tween",
                  ease: "easeInOut"
                }
              }}
              className="mr-3 relative"
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all duration-300",
                activeTab === item.id 
                  ? "text-slate-900 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" 
                  : "text-slate-500 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
              )} />
            </motion.div>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto space-y-4 relative z-10 bg-slate-900/40">
        {/* System Health Widget - Pro Desktop UI */}
        <div className="px-4 py-4 rounded-3xl bg-white/5 border border-white/10 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Active Core</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{uptime}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="flex flex-col space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-primary/5 transition-colors">
                <div className="flex items-center space-x-1">
                   <Cpu className="w-2.5 h-2.5 text-primary group-hover:animate-spin" />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">AI Node</span>
                </div>
                <span className="text-[9px] font-bold text-white">Synchronized</span>
             </div>
             <div className="flex flex-col space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-amber-500/5 transition-colors">
                <div className="flex items-center space-x-1">
                   <Database className="w-2.5 h-2.5 text-amber-500 group-hover:scale-110 transition-transform" />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Vault</span>
                </div>
                <span className="text-[9px] font-bold text-white">Distressed</span>
             </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center w-full px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 group overflow-hidden relative",
            activeTab === 'profile' 
              ? "bg-white/10 text-white shadow-[0_0_25px_rgba(255,255,255,0.1)] border border-white/20" 
              : "text-slate-400 hover:text-white hover:bg-white/10"
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
              filter: "drop-shadow(0 0 8px rgba(var(--primary-rgb),0.5))"
            }}
            transition={{ type: "spring", stiffness: 250, damping: 15 }}
            className="mr-3"
          >
            <Settings className={cn(
              "w-5 h-5 transition-colors",
              activeTab === 'profile' ? "text-primary" : "text-slate-500 group-hover:text-slate-200"
            )} />
          </motion.div>
          Settings
        </button>
      </div>
    </div>
  );
}
