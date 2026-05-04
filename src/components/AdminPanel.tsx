import React, { useState, useEffect } from 'react';
import PermissionList from './PermissionList';
import { 
  Shield, 
  Users, 
  Activity, 
  Settings, 
  Lock, 
  Mail, 
  Search, 
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronRight,
  Database,
  Edit,
  Building,
  Plus,
  Briefcase,
  Loader2,
  UserCheck,
  UserX,
  MailPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, updateDoc, limit, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile, ApprovedEmail } from '../types';
import { cn, formatDate } from '../lib/utils';

interface AdminPanelProps {
  user: UserProfile;
  clients?: any[];
}

export default function AdminPanel({ user, clients = [] }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState('users');

  const menu = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'approvals', label: 'Email Approvals', icon: UserCheck },
    { id: 'clients', label: 'Client Management', icon: Building },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
    { id: 'settings', label: 'Global Settings', icon: Settings },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ];

  return (
    <div className="flex flex-col space-y-8">
      <div className="bg-gradient-to-r from-primary/20 via-indigo-900/40 to-slate-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden glass-morphism border border-white/10">
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-white">Admin Command Center</h2>
          </div>
          <p className="text-slate-300 max-w-xl text-lg font-medium">Manage system permissions, monitor audits, and configure global inventory rules with real-time analytics.</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 blur-3xl transform translate-x-1/2 translate-y-1/2">
          <div className="w-96 h-96 bg-primary rounded-full" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sub Nav */}
        <div className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 gap-2 custom-scrollbar-hide">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={cn(
                "flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-xs lg:text-sm transition-all duration-300",
                activeSubTab === item.id 
                  ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 lg:w-5 lg:h-5 transition-transform",
                activeSubTab === item.id ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <motion.div 
            key={activeSubTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-morphism p-4 md:p-8 rounded-[32px] border border-white/5 shadow-sm min-h-[500px]"
          >
            {activeSubTab === 'users' && <UserManagement />}
            {activeSubTab === 'approvals' && <ApprovalManagement admin={user} />}
            {activeSubTab === 'clients' && <ClientManagement clients={clients} />}
            {activeSubTab === 'logs' && <SystemLogs />}
            {activeSubTab === 'settings' && <GlobalSettings />}
            {activeSubTab === 'security' && <SecuritySettings />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ClientManagement({ clients }: { clients: any[] }) {
  const [newClient, setNewClient] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'clients'), {
        name: newClient.trim(),
        createdAt: Date.now()
      });
      setNewClient('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clients');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClient = async (id: string) => {
    if (!confirm('Are you sure you want to remove this client option?')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'clients');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Client Catalog</h3>
        <p className="text-xs text-slate-500 font-medium">Manage predefined client options for inventory records.</p>
      </div>

      <form onSubmit={handleAddClient} className="flex gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
        <input 
          type="text" 
          value={newClient}
          onChange={(e) => setNewClient(e.target.value)}
          placeholder="Enter new client name..."
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button 
          type="submit"
          disabled={loading || !newClient.trim()}
          className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center space-x-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Add Client</span>
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-bold text-white">{client.name}</span>
            </div>
            <button 
              type="button"
              onClick={() => handleRemoveClient(client.id)}
              className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl text-slate-600 font-medium">
            No clients defined in the catalog yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalManagement({ admin }: { admin: UserProfile }) {
  const [emails, setEmails] = useState<ApprovedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'approved_emails'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setEmails(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApprovedEmail)));
    });
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setLoading(true);
    try {
      const email = newEmail.trim().toLowerCase();
      await addDoc(collection(db, 'approved_emails'), {
        email,
        addedBy: admin.displayName || admin.email,
        createdAt: serverTimestamp()
      });
      setNewEmail('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'approved_emails');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (id: string) => {
    if (!confirm('Revoke approval for this email address?')) return;
    try {
      await deleteDoc(doc(db, 'approved_emails', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'approved_emails');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Whitelist Management</h3>
        <p className="text-xs text-slate-500 font-medium">Pre-approve email addresses for automatic system access.</p>
      </div>

      <form onSubmit={handleAddEmail} className="flex gap-4 p-6 bg-white/5 rounded-3xl border border-white/5">
        <div className="relative flex-1">
          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="email" 
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="e.g., collaborator@company.com"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            required
          />
        </div>
        <button 
          type="submit"
          disabled={loading || !newEmail.trim()}
          className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-50 transition-all flex items-center space-x-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailPlus className="w-4 h-4" />}
          <span>Approve Email</span>
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emails.map((item) => (
          <div key={item.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-white font-mono">{item.email}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Added by {item.addedBy}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => handleRemoveEmail(item.id)}
              className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {emails.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-[40px] text-slate-600 font-medium flex flex-col items-center">
            <Mail className="w-12 h-12 mb-4 opacity-10" />
            <p>No emails have been pre-approved yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
    });
  }, []);

  const toggleApproval = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isApproved: !user.isApproved
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Registered Users</h3>
        <p className="text-xs text-slate-500 font-medium">Manage existing account permissions and approval status.</p>
      </div>

      <div className="flex items-center bg-white/5 p-2 rounded-2xl border border-white/10 group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="w-4 h-4 text-slate-500 ml-3" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..." 
          className="w-full bg-transparent p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none" 
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.map((u) => (
          <div key={u.uid} className="flex items-center justify-between p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className="relative">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/10 border border-white/5 flex items-center justify-center">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                  </div>
                )}
                {u.role === 'admin' && (
                  <div className="absolute -top-1 -right-1 bg-primary p-0.5 md:p-1 rounded-md md:rounded-lg border-2 border-slate-900">
                    <Shield className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs md:text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <span>{u.displayName || 'Anonymous'}</span>
                  {u.isApproved ? (
                    <span className="text-[7px] md:text-[8px] bg-emerald-500/10 text-emerald-500 px-1 md:px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest leading-none">Approved</span>
                  ) : (
                    <span className="text-[7px] md:text-[8px] bg-amber-500/10 text-amber-500 px-1 md:px-1.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest leading-none">Pending</span>
                  )}
                </p>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium font-mono truncate max-w-[120px] md:max-w-none">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {u.role !== 'admin' && (
                <button 
                  onClick={() => toggleApproval(u)}
                  className={cn(
                    "flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    u.isApproved 
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-lg shadow-emerald-900/20"
                  )}
                >
                  {u.isApproved ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  <span className="hidden xs:inline">{u.isApproved ? 'Revoke' : 'Approve'}</span>
                  <span className="xs:hidden">{u.isApproved ? 'No' : 'Yes'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Logs fetch failed:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-slate-400 font-medium">Loading system audit trail...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Audit Trail</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-lg font-black uppercase tracking-widest">{logs.length} Recent Events</span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start space-x-4 group hover:bg-white/10 transition-all">
            <div className={cn(
              "p-2 rounded-xl shrink-0 mt-1",
              log.action.includes('DELETE') ? "bg-red-500/10 text-red-400" :
              log.action.includes('STOCK') ? "bg-primary/10 text-primary" : "bg-white/10 text-slate-400"
            )}>
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white uppercase tracking-tight">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-slate-500 font-medium">{log.createdAt ? formatDate(log.createdAt.toMillis ? log.createdAt.toMillis() : log.createdAt) : 'Just now'}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed truncate">{log.details}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <Database className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-medium">No activity logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalSettings() {
  return (
    <div className="space-y-8">
      <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Application Configuration</h3>
      <div className="space-y-4">
        <SettingToggle label="Enable Community Feed" description="Allow users to create and comment on posts" checked={true} />
        <SettingToggle label="AI Assistance" description="Enable MasterAI help in chats and inventory" checked={true} />
        <SettingToggle label="System Notifications" description="Push alerts for low stock and transactions" checked={true} />
      </div>
    </div>
  );
}

function SettingToggle({ label, description, checked }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/[0.08] transition-colors">
      <div className="max-w-md">
        <p className="text-sm font-bold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 cursor-pointer ${checked ? 'bg-primary' : 'bg-slate-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-12">
      <div className="p-6 bg-red-400/10 rounded-3xl border border-red-400/20 shadow-lg shadow-red-900/10">
        <div className="flex items-center space-x-3 text-red-400 mb-3 font-bold">
          <Lock className="w-5 h-5" />
          <span className="font-display uppercase tracking-wider">Advanced Access Control</span>
        </div>
        <p className="text-sm text-red-200/70 leading-relaxed">Warning: Changes here effect Firestore Security Rules. Ensure you understand the implications before modifying roles.</p>
      </div>
      
      <PermissionList className="!bg-transparent !p-0 !border-0 !shadow-none" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
         <div className="p-8 border border-white/5 rounded-[40px] glass-morphism shadow-sm flex flex-col items-center text-center group hover:bg-white/5 transition-all">
            <div className="w-16 h-16 rounded-3xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-green-900/10">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h4 className="font-bold text-white">Role Verification</h4>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed px-4">All users must have a verified email to perform stock updates.</p>
         </div>
         <div className="p-8 border border-white/5 rounded-[40px] glass-morphism shadow-sm flex flex-col items-center text-center group hover:bg-white/5 transition-all">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-red-900/10">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h4 className="font-bold text-white">API Access</h4>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed px-4">Direct database access via client-side keys is strictly restricted.</p>
         </div>
      </div>
    </div>
  );
}
