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
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'admin' | 'user';
}

export default function Sidebar({ activeTab, setActiveTab, role }: SidebarProps) {
  const [uptime, setUptime] = useState('99.9%');
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'social', label: 'Social Feed', icon: ImageIcon },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
  ];

  if (role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <div className="hidden md:flex flex-col w-64 glass-morphism border-r border-white/5 relative z-50">
      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-emerald-500 rounded-xl blur opacity-30 animate-pulse"></div>
              <div className="relative w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10 shadow-2xl">
                <Package className="text-primary w-5 h-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="text-xl font-black tracking-tight text-white uppercase">ZE</span>
                <span className="text-xl font-black tracking-tight text-primary uppercase">CORP</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 -mt-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">Inventory System</span>
            </div>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center w-full px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 group",
              activeTab === item.id 
                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <motion.div
              animate={{ 
                scale: activeTab === item.id ? 1.1 : 1,
                rotate: activeTab === item.id ? [0, -10, 10, 0] : 0 
              }}
              transition={{ duration: 0.3 }}
              className="mr-3"
            >
              <item.icon className={cn(
                "w-5 h-5",
                activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-300"
              )} />
            </motion.div>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto space-y-4">
        {/* System Health Widget - Pro Desktop UI */}
        <div className="px-4 py-4 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</span>
            </div>
            <span className="text-[10px] font-black text-emerald-500">{uptime}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-1">
                   <Cpu className="w-2.5 h-2.5 text-slate-600" />
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Engine</span>
                </div>
                <span className="text-[9px] font-bold text-slate-300">Active</span>
             </div>
             <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-1">
                   <Database className="w-2.5 h-2.5 text-slate-600" />
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Storage</span>
                </div>
                <span className="text-[9px] font-bold text-slate-300 italic">Encrypted</span>
             </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center w-full px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 group",
            activeTab === 'profile' ? "bg-white/10 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mr-3"
          >
            <Settings className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </motion.div>
          Settings
        </button>
      </div>
    </div>
  );
}
