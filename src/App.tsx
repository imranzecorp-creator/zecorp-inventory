import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  where,
  addDoc,
  increment,
  updateDoc,
  limit,
  or,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  LayoutDashboard, 
  Package, 
  History as LucideHistory, 
  Users, 
  MessageSquare, 
  Bell, 
  LogOut, 
  Search, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  Zap,
  Image as ImageIcon,
  User,
  Settings,
  MoreVertical,
  Loader2,
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { 
  UserProfile, 
  InventoryItem, 
  StockTransaction, 
  AppNotification,
  Project
} from './types';

import { Skeleton, InventoryRowSkeleton, StatCardSkeleton } from './components/ui/Skeleton';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import AmbientStorageBox from './components/AmbientStorageBox';
import ToastContainer, { Toast } from './components/ToastContainer';
import Logo from './components/Logo';
import BackgroundAnimation from './components/BackgroundAnimation';
import { ZecorpMascot } from './components/ZecorpMascot';
import { FloatingEquipments } from './components/FloatingEquipments';

// Lazy load heavy components
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const InventoryList = React.lazy(() => import('./components/InventoryList'));
const TransactionHistory = React.lazy(() => import('./components/TransactionHistory'));
const SocialFeed = React.lazy(() => import('./components/SocialFeed'));
const ChatView = React.lazy(() => import('./components/ChatView'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const ProfileSettings = React.lazy(() => import('./components/ProfileSettings'));
const PermissionList = React.lazy(() => import('./components/PermissionList'));
const Projects = React.lazy(() => import('./components/Projects'));
const AIReports = React.lazy(() => import('./components/AIReports').then(m => ({ default: m.AIReports })));

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
      // Focus search: CMD+K or CTRL+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('header input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      
      // Quick Switch Tabs: ALT + Number
      if (e.altKey) {
        if (e.key === '1') setActiveTab('dashboard');
        if (e.key === '2') setActiveTab('inventory');
        if (e.key === '3') setActiveTab('projects');
        if (e.key === '4') setActiveTab('transactions');
        if (e.key === '5') setActiveTab('chat');
        if (e.key === '6') setActiveTab('social');
        if (e.key === '7') setActiveTab('intelligence');
      }
    }, [setActiveTab]);

  const loadingMessages = [
    "Establishing Neural Uplink",
    "Synchronizing Inventory Matrix",
    "Optimizing Data Shards",
    "Calibrating System Core",
    "Initializing ZEC-AI Interface"
  ];

  useEffect(() => {
    if (loading) {
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) return 100;
          const jump = Math.random() * 15;
          return Math.min(prev + jump, 100);
        });
      }, 400);

      const messageInterval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 1000);

      return () => {
        clearInterval(progressInterval);
        clearInterval(messageInterval);
      };
    }
  }, [loading]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleGlobalSearch = useCallback((term: string) => {
    setGlobalSearch(term);
    setActiveTab('inventory');
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleMobileTabChange = useCallback((tab: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (idUser) => {
      if (idUser) {
        const email = idUser.email?.toLowerCase() || '';
        const userRef = doc(db, 'users', idUser.uid);
        
        // Listen to the user document for real-time profile updates (like approval)
        profileUnsub = onSnapshot(userRef, async (docSnap) => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const isAdmin = email === 'imranzecorp@gmail.com';
              let userData = {
                 ...data,
                 emailVerified: idUser.emailVerified,
                 isApproved: !!data.isApproved || data.role === 'admin' || isAdmin
              } as UserProfile;
              
              // Auto-promote hardcoded admin
              if (isAdmin && (userData.role !== 'admin' || !userData.isApproved)) {
                try {
                  await updateDoc(userRef, { role: 'admin', isApproved: true });
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${idUser.uid}`);
                }
              }

              // Update emailVerified in DB if it changed
              if (data.emailVerified !== idUser.emailVerified) {
                try {
                  await updateDoc(userRef, { emailVerified: idUser.emailVerified });
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${idUser.uid}`);
                }
              }

              // Cross-check with approved_emails whitelist if not admin or approved
              if (userData.role !== 'admin' && !userData.isApproved) {
                try {
                  const approvedQuery = query(collection(db, 'approved_emails'), where('email', '==', email));
                  const approvedSnap = await getDocs(approvedQuery);
                  if (!approvedSnap.empty) {
                    await updateDoc(userRef, { isApproved: true });
                  }
                } catch (err) {
                  handleFirestoreError(err, OperationType.GET, 'approved_emails');
                }
              }
              
              setUser(userData);
              setLoading(false);
            } else {
              // New User flow
              const isAdmin = email === 'imranzecorp@gmail.com';
              let isApproved = isAdmin;
              
              if (!isAdmin) {
                try {
                  const approvedQuery = query(collection(db, 'approved_emails'), where('email', '==', email));
                  const approvedSnap = await getDocs(approvedQuery);
                  isApproved = !approvedSnap.empty;
                } catch (err) {
                  handleFirestoreError(err, OperationType.GET, 'approved_emails');
                }
              }

              const newUser: UserProfile = {
                uid: idUser.uid,
                email: email,
                displayName: idUser.displayName || 'User',
                photoURL: idUser.photoURL || '',
                role: isAdmin ? 'admin' : 'user',
                isApproved: isApproved,
                emailVerified: idUser.emailVerified,
                createdAt: Date.now(),
              };
              
              try {
                await setDoc(userRef, {
                  ...newUser,
                  createdAt: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${idUser.uid}`);
              }
              
              // Set initial user state to move past loading screen immediately
              setUser(newUser);
              setLoading(false);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${idUser.uid}`);
            setLoading(false);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'users');
          setLoading(false);
        });
      } else {
        if (profileUnsub) profileUnsub();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user) return;

    const itemsQuery = query(collection(db, 'inventory'));
    const itemsUnsub = onSnapshot(itemsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data({ serverTimestamps: 'estimate' }) 
      } as InventoryItem));
      // Sort manually locally to avoid index requirement frustrations and missing field exclusion
      setItems(data.sort((a, b) => {
        const timeA = a.lastUpdated?.toMillis?.() || a.lastUpdated || 0;
        const timeB = b.lastUpdated?.toMillis?.() || b.lastUpdated || 0;
        return timeB - timeA;
      }));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'inventory');
    });

    const projectsQuery = query(collection(db, 'projects'));
    const projectsUnsub = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data({ serverTimestamps: 'estimate' }) 
      } as Project));
      setProjects(data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'projects');
    });

    const transQuery = query(collection(db, 'transactions_log'), limit(300));
    const transUnsub = onSnapshot(transQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction));
      setTransactions(data.sort((a, b) => (b.date || 0) - (a.date || 0)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions_log');
    });

    const clientsQuery = query(collection(db, 'clients'));
    const clientsUnsub = onSnapshot(clientsQuery, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'clients');
    });

    // Simplify notification query to avoid complex OR index issues
    const notifyQuery = query(
      collection(db, 'notifications'),
      limit(50)
    );
    const notifyUnsub = onSnapshot(notifyQuery, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as AppNotification))
        .filter(n => n.isPublic || n.userId === user.uid)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);

      // Handle real-time toasts
      if (!isInitialLoad && snapshot.docChanges().length > 0) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotify = { id: change.doc.id, ...change.doc.data() } as AppNotification;
            // Only toast if relevant to user
            if (newNotify.isPublic || newNotify.userId === user.uid) {
              const toast: Toast = {
                id: newNotify.id,
                message: newNotify.message,
                type: newNotify.type
              };
              setToasts(prev => [toast, ...prev].slice(0, 5));
            }
          }
        });
      }
      setIsInitialLoad(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });

    return () => {
      itemsUnsub();
      projectsUnsub();
      transUnsub();
      clientsUnsub();
      notifyUnsub();
    };
  }, [user]);

  const isApproved = user?.isApproved || user?.role === 'admin';
  const dashboardProps = useMemo(() => user ? ({ items, transactions, projects, user }) : null, [items, transactions, projects, user]);
  const inventoryProps = useMemo(() => user ? ({ items, clients, user, projects }) : null, [items, clients, user, projects]);
  const projectsProps = useMemo(() => user ? ({ projects, inventory: items, clients, user, transactions }) : null, [projects, items, clients, user, transactions]);
  const historyProps = useMemo(() => ({ transactions }), [transactions]);
  const adminProps = useMemo(() => user ? ({ user, clients }) : null, [user, clients]);
  const profileProps = useMemo(() => user ? ({ user, setUser }) : null, [user, setUser]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#020617] relative overflow-hidden touch-none select-none">
        {/* Deep Field Background Layers */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[20%] w-[100%] h-[100%] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1.6, 1.2],
              opacity: [0.2, 0.5, 0.2],
              rotate: [0, -120, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[20%] w-[100%] h-[100%] bg-fuchsia-600/25 rounded-full blur-[150px] mix-blend-screen"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.8, 1],
              opacity: [0.15, 0.4, 0.15],
              x: [-100, 100, -100]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/20 rounded-full blur-[180px] mix-blend-screen"
          />
          
          {/* Scanning Grid Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-150 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-8">
          {/* Logo Assembly */}
          <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className="relative mb-12"
          >
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute inset-[-40px] border border-primary/20 rounded-full border-dashed"
            />
            <motion.div 
              animate={{ 
                rotate: -360,
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-60px] border border-white/5 rounded-full border-dotted"
            />
            <div className="relative p-8 glass-morphism rounded-full border-white/10 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]">
              <Logo className="scale-150 md:scale-[2] relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
              <motion.div 
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
              />
            </div>
          </motion.div>

          <div className="w-full space-y-6">
            <div className="flex items-end justify-between mb-2">
              <div className="flex flex-col">
                <motion.span 
                  className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1"
                >
                  System Protocol
                </motion.span>
                <div className="h-5 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      className="text-xs font-bold text-white uppercase tracking-wider"
                    >
                      {loadingMessages[loadingMessageIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
              <span className="text-xl font-black text-white font-mono tabular-nums">
                {Math.floor(loadingProgress)}%
              </span>
            </div>

            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10 relative">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-1/3 h-full bg-white/30 skew-x-[-20deg] blur-sm pointer-events-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex space-x-1.5">
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scaleY: [1, 2.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1 h-3 bg-primary/60 rounded-full origin-bottom"
                  />
                ))}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Kernel Tier 4</span>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Status: Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Background Assets */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%",
                rotate: Math.random() * 360
              }}
              animate={{ 
                y: [null, (Math.random() - 0.5) * 200 + "px"],
                rotate: [null, Math.random() * 360]
              }}
              transition={{ 
                duration: 10 + Math.random() * 20, 
                repeat: Infinity, 
                ease: "linear"
              }}
              className="absolute"
            >
              <div className="w-24 h-24 border border-white/5 rounded-3xl" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden selection:bg-primary/30 selection:text-white relative bg-[#020617]/50 backdrop-blur-[2px]">
      <BackgroundAnimation />
      <FloatingEquipments />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AmbientStorageBox />
      
      {/* Sidebar for Desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={user!.role} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          user={user!} 
          unreadCount={unreadCount} 
          notifications={notifications} 
          setActiveTab={setActiveTab}
          items={items}
          onGlobalSearch={handleGlobalSearch}
        />
        
        {!isApproved && (
          <div className="bg-amber-500/10 border-y border-amber-500/20 px-4 py-2 flex items-center justify-center space-x-3 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
            <p className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.2em]">
              Guest Mode / Awaiting Admin Verification • Some features are restricted
            </p>
            <button 
              onClick={() => signOut(auth)}
              className="text-[10px] font-black text-white bg-amber-500/20 px-2 py-0.5 rounded hover:bg-amber-500/30 transition-all uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        )}
        
        {user!.isApproved && !user!.emailVerified && (
          <div className="bg-rose-500/10 border-y border-rose-500/20 px-4 py-2 flex items-center justify-center space-x-3 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-rose-500 animate-pulse" />
            <p className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-[0.2em]">
              Email Verification Required • System writes are currently blocked by security protocol
            </p>
          </div>
        )}        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <React.Suspense fallback={
              <div className="space-y-6">
                {activeTab === 'dashboard' ? (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                    {Array(5).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array(10).fill(0).map((_, i) => <InventoryRowSkeleton key={i} />)}
                  </div>
                )}
              </div>
            }>
              <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && dashboardProps && (
                <Dashboard {...dashboardProps} />
              )}
              {activeTab === 'inventory' && inventoryProps && (
                <InventoryList 
                  {...inventoryProps} 
                  initialSearch={globalSearch} 
                  onSearchClear={() => setGlobalSearch('')} 
                />
              )}
              {activeTab === 'projects' && projectsProps && (
                <Projects {...projectsProps} />
              )}
              {activeTab === 'transactions' && historyProps && (
                <TransactionHistory {...historyProps} />
              )}
              {activeTab === 'social' && (
                <SocialFeed user={user!} />
              )}
              {activeTab === 'intelligence' && (
                <AIReports inventory={items} transactions={transactions} />
              )}
              {activeTab === 'chat' && (
                <ChatView user={user!} />
              )}
              {activeTab === 'admin' && user!.role === 'admin' && adminProps && (
                <AdminPanel {...adminProps} />
              )}
              {activeTab === 'profile' && profileProps && (
                <ProfileSettings {...profileProps} />
              )}
              {activeTab === 'permissions' && (
                <PermissionList />
              )}
              {activeTab === 'more' && (
                <div className="md:hidden space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <MoreVertical className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Access Hub</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleMobileTabChange('chat')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02] col-span-2"
                        >
                          <MessageSquare className="w-8 h-8 text-primary" />
                          <span className="text-xs font-black uppercase text-slate-300">Messages</span>
                        </button>
                        <button 
                          onClick={() => handleMobileTabChange('social')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <ImageIcon className="w-8 h-8 text-indigo-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Social Feed</span>
                        </button>
                        <button 
                          onClick={() => handleMobileTabChange('intelligence')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <Sparkles className="w-8 h-8 text-primary" />
                          <span className="text-xs font-black uppercase text-slate-300">Intelligence</span>
                        </button>
                        {user.role === 'admin' && (
                          <button 
                            onClick={() => handleMobileTabChange('admin')}
                            className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02] col-span-2"
                          >
                            <ShieldCheck className="w-8 h-8 text-primary" />
                            <span className="text-xs font-black uppercase text-slate-300">Admin Control</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleMobileTabChange('profile')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <User className="w-8 h-8 text-blue-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Profile</span>
                        </button>
                        <button 
                          onClick={() => handleMobileTabChange('permissions')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <AlertCircle className="w-8 h-8 text-amber-500" />
                          <span className="text-xs font-black uppercase text-slate-300">Access Keys</span>
                        </button>
                    </div>
                    
                    <div className="pt-10 pb-20 text-center">
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">ZECORP OS v4.2.0 • PREVIEW</p>
                    </div>
                </div>
              )}
              </AnimatePresence>
            </React.Suspense>
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-morphism border-t border-white/10 px-2 py-3 pb-safe flex items-center justify-around z-[60] backdrop-blur-2xl bg-slate-900/90 shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
          <MobileNavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => handleMobileTabChange('dashboard')} 
            icon={LayoutDashboard} 
            label="Dash" 
          />
          <MobileNavButton 
            active={activeTab === 'inventory'} 
            onClick={() => handleMobileTabChange('inventory')} 
            icon={Package} 
            label="Inventory" 
          />
          <MobileNavButton 
            active={activeTab === 'projects'} 
            onClick={() => handleMobileTabChange('projects')} 
            icon={Zap} 
            label="Projects" 
          />
          <MobileNavButton 
            active={activeTab === 'transactions'} 
            onClick={() => handleMobileTabChange('transactions')} 
            icon={LucideHistory} 
            label="Logs" 
          />
          <MobileNavButton 
            active={activeTab === 'more' || activeTab === 'chat' || activeTab === 'social' || activeTab === 'intelligence' || activeTab === 'profile' || activeTab === 'permissions' || activeTab === 'admin'} 
            onClick={() => handleMobileTabChange('more')} 
            icon={MoreVertical} 
            label="More" 
          />
        </nav>
      </div>
      <ZecorpMascot userDisplayName={user?.displayName || 'User'} />
    </div>
  );
}

function MobileNavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[64px] space-y-1 transition-all active:scale-90 relative touch-manipulation",
        active ? "text-primary" : "text-slate-500"
      )}
    >
      <motion.div
        initial={false}
        animate={{ 
          scale: active ? 1.15 : 1,
          y: active ? -4 : 0,
        }}
        whileTap={{ scale: 0.85 }}
        className={cn(
          "w-11 h-11 flex items-center justify-center rounded-2xl transition-all",
          active ? "bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] border border-primary/20" : "hover:bg-white/5"
        )}
      >
        <Icon className={cn("w-5 h-5 transition-all", active ? "stroke-[2.5px] scale-110" : "stroke-[1.5px]")} />
      </motion.div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest transition-all duration-300",
        active ? "opacity-100 translate-y-0 text-primary" : "opacity-40 translate-y-1"
      )}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
        />
      )}
    </button>
  );
}
