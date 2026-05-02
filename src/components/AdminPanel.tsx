import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  user: UserProfile;
  clients?: any[];
}

export default function AdminPanel({ user, clients = [] }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState('users');

  const menu = [
    { id: 'users', label: 'User Management', icon: Users },
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
        <div className="w-full lg:w-64 space-y-2">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300",
                activeSubTab === item.id 
                  ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform",
                activeSubTab === item.id ? "scale-110" : "group-hover:scale-110"
              )} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <motion.div 
            key={activeSubTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-morphism p-8 rounded-3xl border border-white/5 shadow-sm min-h-[500px]"
          >
            {activeSubTab === 'users' && <UserManagement />}
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

function UserManagement() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">Registered Users</h3>
        <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all">
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="flex items-center bg-white/5 p-2 rounded-2xl border border-white/10 group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="w-4 h-4 text-slate-500 ml-3" />
        <input 
          type="text" 
          placeholder="Search by name, email or UID..." 
          className="w-full bg-transparent p-2 text-sm text-white placeholder:text-slate-600 focus:outline-none" 
        />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/5 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">User {i}</p>
                <p className="text-xs text-slate-500 font-medium">user{i}@example.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <button className="p-2 text-slate-400 hover:text-primary hover:bg-white/10 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemLogs() {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-center p-12 glass-morphism rounded-3xl border border-white/5">
      <div className="relative mb-6">
        <Database className="w-20 h-20 text-primary opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
           <Activity className="w-10 h-10 text-primary animate-pulse" />
        </div>
      </div>
      <h3 className="text-xl font-display font-bold text-white tracking-tight">Syncing System Logs</h3>
      <p className="text-sm text-slate-400 max-w-xs mt-3 leading-relaxed">Enterprise transaction logs are being processed and indexed for audit readiness.</p>
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
