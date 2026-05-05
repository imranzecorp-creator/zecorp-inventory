import React, { useState, memo, useMemo } from 'react';
import { 
  Bell, 
  Search, 
  User as UserIcon, 
  LogOut,
  ChevronDown,
  Mic,
  MicOff,
  Sparkles
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { UserProfile, AppNotification, InventoryItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HeaderProps {
  user: UserProfile;
  unreadCount: number;
  notifications: AppNotification[];
  setActiveTab: (tab: string) => void;
  items: InventoryItem[];
  onGlobalSearch: (term: string) => void;
}

import Logo from './Logo';

import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { VoiceLanguageSelector } from './VoiceLanguageSelector';

export default memo(function Header({ user, unreadCount, notifications, setActiveTab, items, onGlobalSearch }: HeaderProps) {
  const [showNotify, setShowNotify] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  const { isListening, startListening, currentLang, setCurrentLang } = useVoiceSearch((transcript) => {
    setSearchTerm(transcript);
    onGlobalSearch(transcript);
  });

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    const searchLow = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    items.forEach(item => {
      if (item.name.toLowerCase().includes(searchLow)) matches.add(item.name);
      if (item.brand && item.brand.toLowerCase().includes(searchLow)) matches.add(item.brand);
      if (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLow)) matches.add(item.modelNumber);
      if (item.category && item.category.toLowerCase().includes(searchLow)) matches.add(item.category);
    });
    
    return Array.from(matches).slice(0, 8);
  }, [searchTerm, items]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="h-16 glass-morphism border-b border-white/5 px-4 md:px-8 flex items-center justify-between sticky top-0 z-[100]">
      <div className="flex items-center gap-4">
        <Logo variant="full" className="scale-50 origin-left hidden md:flex" />
        <Logo variant="icon" className="md:hidden" />
      </div>

      <div className="flex-1 max-w-xl mx-4">
        <div className="relative group">
          <motion.div
            whileFocus={{ scale: 1.2, color: 'var(--color-primary)' }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center"
          >
            <Search className="text-slate-500 w-4 h-4 transition-colors" />
          </motion.div>
          <input 
            type="text" 
            placeholder="Search items, location..." 
            className="w-full pl-10 pr-20 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-display"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
          />
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
                          onGlobalSearch(suggestion);
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
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <VoiceLanguageSelector 
              currentLang={currentLang} 
              onLangChange={setCurrentLang} 
              className="hidden sm:block"
            />
            <button
              onClick={startListening}
              className={cn(
                "p-1.5 rounded-full transition-all",
                isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/10 text-slate-500"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <div className="hidden lg:flex items-center space-x-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 pointer-events-none">
              <span className="text-[10px] text-slate-500 font-bold tracking-tighter">⌘</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase">K</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotify(!showNotify)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full relative transition-all active:scale-95 group"
          >
            <motion.div
              animate={unreadCount > 0 ? {
                rotate: [0, -10, 10, -10, 10, 0],
              } : {}}
              transition={{ 
                duration: 0.5, 
                repeat: unreadCount > 0 ? Infinity : 0, 
                repeatDelay: 2,
                type: "tween",
                ease: "easeInOut"
              }}
            >
              <Bell className="w-5 h-5 group-hover:text-primary transition-colors" />
            </motion.div>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-slate-900 shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotify && (
              <>
                <div className="fixed inset-0" onClick={() => setShowNotify(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-[90vw] md:w-80 glass-morphism rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-50 origin-top-right backdrop-blur-3xl"
                >
                  <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-3xl">
                    <h3 className="font-display font-bold text-white tracking-tight">Notifications</h3>
                    <button className="text-xs text-primary font-bold hover:text-primary-hover active:scale-95 transition-all">Mark all as read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 text-sm italic">Clean slate! No notifications.</div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => markAsRead(n.id)}
                          className={cn(
                            "p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group relative",
                            !n.read && "bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {n.type === 'AI_PREDICTION' ? (
                              <div className="flex items-center space-x-1.5">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Prediction</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{n.type}</span>
                            )}
                            {!n.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                          <p className="text-sm text-slate-300 leading-snug group-hover:text-white transition-colors">{n.message}</p>
                          <span className="text-[10px] text-slate-500 mt-2 block font-medium uppercase tracking-wider">{formatDate(n.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center space-x-3 p-1 pl-1 pr-3 hover:bg-white/5 rounded-full transition-all group active:scale-95 border border-transparent hover:border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-primary w-4 h-4" />
              )}
            </div>
            <span className="text-sm font-semibold text-slate-200 hidden sm:block group-hover:text-white transition-colors">{user.displayName || 'Account'}</span>
            <motion.div
              animate={{ rotate: showProfile ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-all hidden sm:block" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                <div className="fixed inset-0" onClick={() => setShowProfile(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 md:w-64 glass-morphism rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-50 origin-top-right backdrop-blur-3xl"
                >
                  <div className="p-5 border-b border-white/5 bg-white/[0.03]">
                    <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded-md uppercase tracking-widest border border-primary/20">
                        {user.role}
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <button 
                      onClick={() => { setActiveTab('profile'); setShowProfile(false); }}
                      className="w-full flex items-center space-x-3 p-3 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <UserIcon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                      </motion.div>
                      <span>My Profile</span>
                    </button>
                    <div className="h-px bg-white/5 mx-3 my-1" />
                    <button 
                      onClick={() => signOut(auth)}
                      className="w-full flex items-center space-x-3 p-3 text-sm font-black text-red-500 hover:bg-red-500/20 rounded-2xl transition-all group uppercase tracking-widest relative overflow-hidden"
                    >
                      <motion.div
                        whileHover={{ x: [-2, 2, -2] }}
                        transition={{ duration: 0.2, repeat: Infinity }}
                      >
                        <LogOut className="w-4 h-4" />
                      </motion.div>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
});
