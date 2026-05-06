import React, { useState, memo } from 'react';
import { 
  User, 
  Mail, 
  Camera, 
  Shield, 
  Key, 
  Save, 
  CheckCircle,
  AlertCircle,
  Download,
  Smartphone
} from 'lucide-react';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion } from 'framer-motion';
import { formatDate } from '../lib/utils';
import { usePWA } from '../hooks/usePWA';

interface ProfileSettingsProps {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
}

export default memo(function ProfileSettings({ user, setUser }: ProfileSettingsProps) {
  const [name, setName] = useState(user.displayName || '');
  const [photo, setPhoto] = useState(user.photoURL || '');
  const [email, setEmail] = useState(user.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { installPrompt, isInstalled, installApp } = usePWA();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Update Auth
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photo
      });

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        photoURL: photo
      });

      setUser({ ...user, displayName: name, photoURL: photo });
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <User className="w-10 h-10" />
          </motion.div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
          <p className="text-slate-400">Manage your profile, identity and security preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* General Profile */}
          <div className="glass-morphism p-8 rounded-3xl border border-white/5 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <User className="w-5 h-5 text-primary" />
              </motion.div>
              <span>Public Profile</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                    {photo ? (
                      <img src={photo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-2 glass-morphism rounded-xl shadow-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Picture URL</label>
                  <input 
                    type="text" 
                    value={photo}
                    onChange={(e) => setPhoto(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    value={email}
                    className="w-full px-4 py-3 bg-white/5 border border-transparent rounded-2xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {success && (
                <div className="flex items-center space-x-2 text-green-400 bg-green-500/10 p-4 rounded-2xl border border-green-500/20 animate-slide-in">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </motion.div>
                  <span className="text-sm font-medium">{success}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-slide-in">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95 disabled:opacity-50 group"
                >
                  <motion.div
                    animate={loading ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="flex items-center"
                  >
                    {loading ? <Camera className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  </motion.div>
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </form>
          </div>

          <div className="glass-morphism p-8 rounded-3xl border border-white/5 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2 group">
              <motion.div
                whileHover={{ y: -2, scale: 1.1 }}
              >
                <Key className="w-5 h-5 text-primary" />
              </motion.div>
              <span>Security</span>
            </h3>
            <p className="text-sm text-slate-400">Update your password to keep your account secure. We recommend using a unique password that you don't use elsewhere.</p>
            <button className="px-6 py-3 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
              Reset Password
            </button>
          </div>

          <div className="glass-morphism p-8 rounded-3xl border border-white/5 shadow-sm space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Smartphone className="w-32 h-32" />
             </div>
             
             <h3 className="text-xl font-bold text-white flex items-center space-x-2 group">
              <motion.div
                whileHover={{ scale: 1.2, rotate: 10 }}
              >
                <Download className="w-5 h-5 text-primary" />
              </motion.div>
              <span>App Experience</span>
            </h3>
            
            <p className="text-sm text-slate-400">
              Transform this web application into a high-performance native-like app on your device.
            </p>

            <div className="flex flex-col space-y-4">
              {isInstalled ? (
                <div className="flex items-center space-x-3 text-primary bg-primary/10 p-4 rounded-2xl border border-primary/20">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">Application Installed</span>
                </div>
              ) : installPrompt ? (
                <button 
                  onClick={installApp}
                  className="flex items-center justify-center space-x-3 px-8 py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all active:scale-95 shadow-xl shadow-white/10"
                >
                  <Download className="w-5 h-5" />
                  <span>Install Web App</span>
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 text-xs italic">
                  To install, use your browser's "Add to Home Screen" option if not prompted.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-br from-primary to-indigo-700 p-8 rounded-3xl text-white shadow-xl group">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              whileInView={{ scale: 1, opacity: 0.5 }}
              whileHover={{ opacity: 1, scale: 1.1 }}
            >
              <Shield className="w-12 h-12 mb-4" />
            </motion.div>
            <h4 className="text-xl font-bold">Privacy Control</h4>
            <p className="text-white/80 text-sm mt-2 leading-relaxed">Your profile data is stored securely in our enterprise cloud. You can request data deletion at any time from the administration.</p>
          </div>

          <div className="p-8 glass-morphism rounded-3xl border border-white/5 shadow-sm">
             <h4 className="font-bold text-white mb-4">Account Status</h4>
             <div className="flex items-center space-x-3 mb-6">
               <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
               <span className="text-sm font-bold text-slate-200">Active - {user.role === 'admin' ? 'Administrator' : 'Standard Member'}</span>
             </div>
             <p className="text-xs text-slate-500">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
