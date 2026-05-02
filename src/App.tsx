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
  where,
  addDoc,
  increment,
  updateDoc,
  limit,
  or
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
  FileText,
  User,
  Settings,
  Image as ImageIcon,
  Send,
  MoreVertical,
  X,
  Edit,
  Download,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cn, formatDate } from './lib/utils';
import { getAiResponse } from './services/geminiService';
import { exportToPdf, generateInventoryReport } from './services/pdfService';
import type { 
  UserProfile, 
  InventoryItem, 
  StockTransaction, 
  Post, 
  ChatMessage, 
  AppNotification,
  Comment,
  Project
} from './types';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import TransactionHistory from './components/TransactionHistory';
import SocialFeed from './components/SocialFeed';
import ChatView from './components/ChatView';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ProfileSettings from './components/ProfileSettings';
import PermissionList from './components/PermissionList';
import Projects from './components/Projects';
import AmbientStorageBox from './components/AmbientStorageBox';
import ToastContainer, { Toast } from './components/ToastContainer';

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
    const unsubscribe = onAuthStateChanged(auth, async (idUser) => {
      if (idUser) {
        const userDoc = await getDoc(doc(db, 'users', idUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          const newUser: UserProfile = {
            uid: idUser.uid,
            email: idUser.email || '',
            displayName: idUser.displayName || 'User',
            photoURL: idUser.photoURL || '',
            role: idUser.email === 'imranzecorp@gmail.com' ? 'admin' : 'user',
            createdAt: Date.now(),
          };
          await setDoc(doc(db, 'users', idUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user) return;

    const itemsQuery = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
    const itemsUnsub = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    const projectsQuery = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const projectsUnsub = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const transQuery = query(collection(db, 'transactions_log'), orderBy('date', 'desc'), limit(50));
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
      <div className="flex flex-col h-screen w-full items-center justify-center space-y-6">
        <motion.div
           animate={{ 
             rotate: 360,
             scale: [1, 1.2, 1],
           }}
           transition={{ 
             duration: 3, 
             repeat: Infinity, 
             ease: "easeInOut" 
           }}
           className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30"
        >
          <Package className="w-8 h-8 text-primary shadow-2xl" />
        </motion.div>
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            <span className="text-4xl font-black text-white uppercase tracking-tight">ZE</span>
            <span className="text-4xl font-black text-primary uppercase tracking-tight">CORP</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400">Inventory System</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

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
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <Dashboard items={items} transactions={transactions} projects={projects} user={user} />
            )}
            {activeTab === 'inventory' && (
              <InventoryList items={items} clients={clients} user={user} />
            )}
            {activeTab === 'projects' && (
              <Projects projects={projects} inventory={items} clients={clients} user={user} />
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
          </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-morphism border-t border-white/5 px-6 py-3 flex items-center justify-between z-[60] backdrop-blur-2xl bg-slate-900/80">
          <MobileNavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={LayoutDashboard} 
            label="Home" 
          />
          <MobileNavButton 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
            icon={Package} 
            label="Stock" 
          />
          <MobileNavButton 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')} 
            icon={History} 
            label="Logs" 
          />
          <MobileNavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
            icon={MessageSquare} 
            label="Chat" 
          />
          <MobileNavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={User} 
            label="User" 
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
        "flex flex-col items-center justify-center space-y-1 transition-all active:scale-90",
        active ? "text-primary" : "text-slate-500"
      )}
    >
      <motion.div
        animate={{ scale: active ? 1.2 : 1, y: active ? -2 : 0 }}
        className={cn(
          "w-6 h-6 flex items-center justify-center rounded-xl transition-colors",
          active && "bg-primary/20"
        )}
      >
        <Icon className="w-4 h-4" />
      </motion.div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}
