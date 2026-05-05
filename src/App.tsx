import React, { useState, useEffect, useMemo } from 'react';
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
  History, 
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
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import type { 
  UserProfile, 
  InventoryItem, 
  StockTransaction, 
  AppNotification,
  Project
} from './types';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import AmbientStorageBox from './components/AmbientStorageBox';
import ToastContainer, { Toast } from './components/ToastContainer';
import Logo from './components/Logo';

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

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        if (e.key === '3') setActiveTab('transactions');
        if (e.key === '4') setActiveTab('social');
        if (e.key === '5') setActiveTab('chat');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (idUser) => {
      if (idUser) {
        const email = idUser.email?.toLowerCase() || '';
        const userRef = doc(db, 'users', idUser.uid);
        
        // Listen to the user document for real-time profile updates (like approval)
        profileUnsub = onSnapshot(userRef, async (docSnap) => {
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
              await updateDoc(userRef, { role: 'admin', isApproved: true });
            }

            // Update emailVerified in DB if it changed
            if (data.emailVerified !== idUser.emailVerified) {
              await updateDoc(userRef, { emailVerified: idUser.emailVerified });
            }

            // Cross-check with approved_emails whitelist if not admin or approved
            if (userData.role !== 'admin' && !userData.isApproved) {
              const approvedQuery = query(collection(db, 'approved_emails'), where('email', '==', email));
              const approvedSnap = await getDocs(approvedQuery);
              if (!approvedSnap.empty) {
                await updateDoc(userRef, { isApproved: true });
              }
            }
            
            setUser(userData);
            setLoading(false);
          } else {
            // New User flow
            const isAdmin = email === 'imranzecorp@gmail.com';
            let isApproved = isAdmin;
            
            if (!isAdmin) {
              const approvedQuery = query(collection(db, 'approved_emails'), where('email', '==', email));
              const approvedSnap = await getDocs(approvedQuery);
              isApproved = !approvedSnap.empty;
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
            
            await setDoc(userRef, {
              ...newUser,
              createdAt: serverTimestamp()
            });
            // onSnapshot will handle setting the user state once document is created
          }
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

    const itemsQuery = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
    const itemsUnsub = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data({ serverTimestamps: 'estimate' }) 
      } as InventoryItem)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    const projectsQuery = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const projectsUnsub = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data({ serverTimestamps: 'estimate' }) 
      } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const transQuery = query(collection(db, 'transactions_log'), orderBy('date', 'desc'), limit(150));
    const transUnsub = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockTransaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions_log'));

    const clientsQuery = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const clientsUnsub = onSnapshot(clientsQuery, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const notifyQuery = query(
      collection(db, 'notifications'), 
      or(
        where('userId', '==', user.uid), 
        where('isPublic', '==', true)
      ),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const notifyUnsub = onSnapshot(notifyQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);

      // Handle real-time toasts
      if (!isInitialLoad && snapshot.docChanges().length > 0) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newNotify = { id: change.doc.id, ...change.doc.data() } as AppNotification;
            const toast: Toast = {
              id: newNotify.id,
              message: newNotify.message,
              type: newNotify.type
            };
            setToasts(prev => [toast, ...prev].slice(0, 5));
          }
        });
      }
      setIsInitialLoad(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    return () => {
      itemsUnsub();
      projectsUnsub();
      transUnsub();
      clientsUnsub();
      notifyUnsub();
    };
  }, [user]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center space-y-12 bg-slate-950">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ 
             opacity: 1,
             scale: [1, 1.05, 1],
           }}
           transition={{ 
             duration: 2, 
             repeat: Infinity, 
             ease: "easeInOut" 
           }}
        >
          <Logo className="scale-150" />
        </motion.div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 animate-pulse">Initializing System Core</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isApproved = user.isApproved || user.role === 'admin';

  return (
    <div className="flex h-screen overflow-hidden selection:bg-primary/30 selection:text-white bg-[#020617]/90 relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AmbientStorageBox />
      
      {/* Sidebar for Desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={user.role} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          user={user} 
          unreadCount={unreadCount} 
          notifications={notifications} 
          setActiveTab={setActiveTab}
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
        
        {user.isApproved && !user.emailVerified && (
          <div className="bg-rose-500/10 border-y border-rose-500/20 px-4 py-2 flex items-center justify-center space-x-3 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-rose-500 animate-pulse" />
            <p className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-[0.2em]">
              Email Verification Required • System writes are currently blocked by security protocol
            </p>
          </div>
        )}        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <React.Suspense fallback={
              <div className="flex h-full w-full items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            }>
              <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard items={items} transactions={transactions} projects={projects} user={user} />
              )}
              {activeTab === 'inventory' && (
                <InventoryList items={items} clients={clients} user={user} projects={projects} />
              )}
              {activeTab === 'projects' && (
                <Projects projects={projects} inventory={items} clients={clients} user={user} transactions={transactions} />
              )}
              {activeTab === 'transactions' && (
                <TransactionHistory transactions={transactions} />
              )}
              {activeTab === 'social' && (
                <SocialFeed user={user} />
              )}
              {activeTab === 'chat' && (
                <ChatView user={user} />
              )}
              {activeTab === 'admin' && user.role === 'admin' && (
                <AdminPanel user={user} clients={clients} />
              )}
              {activeTab === 'profile' && (
                <ProfileSettings user={user} setUser={setUser} />
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
                          onClick={() => setActiveTab('social')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <ImageIcon className="w-8 h-8 text-indigo-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Social Feed</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('transactions')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <History className="w-8 h-8 text-emerald-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Logs</span>
                        </button>
                        {user.role === 'admin' && (
                          <button 
                            onClick={() => setActiveTab('admin')}
                            className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02] col-span-2"
                          >
                            <ShieldCheck className="w-8 h-8 text-primary" />
                            <span className="text-xs font-black uppercase text-slate-300">Admin Control</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setActiveTab('profile')}
                          className="p-6 glass-morphism rounded-3xl border border-white/5 flex flex-col items-center space-y-3 active:scale-95 transition-all bg-white/[0.02]"
                        >
                          <User className="w-8 h-8 text-blue-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Profile</span>
                        </button>
                        <button 
                          onClick={() => setActiveTab('permissions')}
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
            onClick={() => setActiveTab('dashboard')} 
            icon={LayoutDashboard} 
            label="Dash" 
          />
          <MobileNavButton 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={Package} 
            label="Inventory" 
          />
          <MobileNavButton 
            active={activeTab === 'projects'} 
            onClick={() => setActiveTab('projects')} 
            icon={Zap} 
            label="Projects" 
          />
          <MobileNavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={MessageSquare} 
            label="Chat" 
          />
          <MobileNavButton 
            active={activeTab === 'more'} 
            onClick={() => setActiveTab('more')} 
            icon={MoreVertical} 
            label="More" 
          />
        </nav>
      </div>
    </div>
  );
}

function MobileNavButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[56px] space-y-1 transition-all active:scale-75 relative",
        active ? "text-primary" : "text-slate-500"
      )}
    >
      <motion.div
        initial={false}
        animate={{ 
          scale: active ? 1.1 : 1,
          y: active ? -2 : 0,
        }}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-2xl transition-colors",
          active && "bg-primary/10 shadow-lg shadow-primary/5"
        )}
      >
        <Icon className={cn("w-5 h-5 transition-all", active ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
      </motion.div>
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest transition-opacity duration-300",
        active ? "opacity-100" : "opacity-40"
      )}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="absolute -top-1 w-1 h-1 rounded-full bg-primary"
        />
      )}
    </button>
  );
}
