import React, { useState, useCallback } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Package, 
  Shield, 
  Globe,
  Sparkles,
  RefreshCcw,
  User,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

import Logo from './Logo';
import BackgroundAnimation from './BackgroundAnimation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isReset, setIsReset] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogleLogin = useCallback(async () => {
    setProviderLoading('google');
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setProviderLoading(null);
    }
  }, []);

  const handleMicrosoftLogin = useCallback(async () => {
    setProviderLoading('microsoft');
    setError('');
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('Microsoft sign-in failed. Ensure the provider is enabled in Firebase Console.');
    } finally {
      setProviderLoading(null);
    }
  }, []);

  const handleAppleLogin = useCallback(async () => {
    setProviderLoading('apple');
    setError('');
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError('Apple sign-in failed. Ensure the provider is enabled in Firebase Console.');
    } finally {
      setProviderLoading(null);
    }
  }, []);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isReset) {
        if (!email.trim()) throw new Error('Please enter your email.');
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent. Check your inbox.');
        setIsReset(false);
      } else if (isSignUp) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (!name.trim()) throw new Error('Please enter your full name.');
        
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        // Create user doc
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: email.toLowerCase(),
          displayName: name,
          role: 'user',
          isApproved: false,
          emailVerified: false,
          createdAt: Date.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('auth/invalid-credential')) msg = 'Invalid email or password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'Email already registered.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, isReset, isSignUp, name]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 selection:bg-primary/30 relative overflow-hidden bg-slate-950">
      <BackgroundAnimation />
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 glass-morphism rounded-[40px] overflow-hidden shadow-2xl border border-white/10 relative z-10 min-h-[700px]">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-white/5 relative overflow-hidden ring-1 ring-white/5">
          <div className="relative z-10">
            <Logo className="mb-10 scale-125 origin-left" />
            
            <div className="mt-20 space-y-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-6xl font-display font-bold leading-none tracking-tighter text-white">
                  INTUITIVE<br/>
                  INVENTORY<br/>
                  <span className="text-primary italic">INTELLIGENCE</span>
                </h1>
                <p className="mt-6 text-slate-400 text-lg max-w-sm font-medium">
                  Scale your stock management with AI-powered analytics and real-time collaboration.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FeatureItem icon={Shield} text="Enterprise Security" />
                <FeatureItem icon={Sparkles} text="AI-Driven Insights" />
                <FeatureItem icon={Globe} text="Cloud Sync" />
                <FeatureItem icon={RefreshCcw} text="Real-time Updates" />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center p-3 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
              <Package className="w-full h-full text-white" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Supply Solutions</p>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex items-center justify-center p-8 md:p-16 bg-white/5 backdrop-blur-3xl">
          <div className="w-full max-w-md space-y-8 h-full flex flex-col justify-center">
            <div className="text-center lg:text-left">
              <div className="lg:hidden flex items-center justify-center mb-8">
                 <Logo className="scale-75" />
              </div>
              <h2 className="text-4xl font-display font-bold text-white tracking-tight leading-tight">
                {isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome back'}
              </h2>
              <p className="mt-2 text-slate-400 font-medium">
                {isReset ? 'Enter your email to receive recovery link' : isSignUp ? 'Join the next-gen inventory platform' : 'Login to manage your stock efficiently'}
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleGoogleLogin}
                disabled={!!providerLoading}
                className="w-full flex items-center justify-center space-x-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-xl active:scale-95 duration-300 disabled:opacity-50"
              >
                {providerLoading === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                )}
                <span className="text-sm">{providerLoading === 'google' ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleMicrosoftLogin}
                  disabled={!!providerLoading}
                  className="flex items-center justify-center space-x-2 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-xl active:scale-95 duration-300 disabled:opacity-50"
                >
                  {providerLoading === 'microsoft' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/microsoft.svg" alt="Microsoft" className="w-4 h-4" />
                  )}
                  <span className="text-xs">Outlook</span>
                </button>
                <button 
                  onClick={handleAppleLogin}
                  disabled={!!providerLoading}
                  className="flex items-center justify-center space-x-2 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-xl active:scale-95 duration-300 disabled:opacity-50"
                >
                   {providerLoading === 'apple' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41-84.5-43.2-35.3-2.1-71.1 22.3-89.9 22.3-19.1 0-48.4-21-77.9-20.4-38.5.5-74.8 21.6-94.6 55.6-40.2 68.8-10.2 171.4 28.6 226.7 19 26.6 42.1 56.7 70.8 55.7 27.6-1 38.3-17.5 71.9-17.5 33.4 0 43.1 17.5 72.3 16.9 29.5-.6 50.1-27.1 69-54.3 21.5-31.1 30.6-61.3 30.9-62.8-.7-.3-59.7-22.9-60.6-90.2zM302.5 125.4c16.3-19.8 27.4-47.4 24.3-75.1-23.7 1-52.9 15.6-70 35.5-15.1 17.5-28.5 45.4-25.1 72 26.4 2.1 53.6-12.2 70.8-32.4z"/></svg>
                  )}
                  <span className="text-xs">Apple ID</span>
                </button>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase"><span className="px-4 text-slate-500 font-bold tracking-widest">Or email access</span></div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4 animate-slide-in">
                {isSignUp && (
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-all" />
                    <input 
                      type="text" 
                      required 
                      placeholder="Full Name" 
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/10 focus:border-white/10 transition-all text-sm text-white placeholder:text-slate-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-all" />
                  <input 
                    type="email" 
                    required 
                    placeholder="Email address" 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/10 focus:border-white/10 transition-all text-sm text-white placeholder:text-slate-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {!isReset && (
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-all" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      placeholder="Password" 
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white/10 focus:border-white/10 transition-all text-sm text-white placeholder:text-slate-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs font-medium px-2 bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
                {message && <p className="text-green-400 text-xs font-medium px-2 bg-green-400/10 py-2 rounded-lg border border-green-400/20">{message}</p>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:bg-primary-hover hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="font-display font-bold tracking-tight">{loading ? 'Please wait...' : isReset ? 'Send Recovery Email' : isSignUp ? 'Create Account' : 'Sign In'}</span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            </div>

            <div className="flex flex-col space-y-4 text-center">
              <button 
                onClick={() => { setIsReset(!isReset); setIsSignUp(false); }}
                className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
              >
                {isReset ? 'Back to login' : 'Forgot your password?'}
              </button>
              <p className="text-sm text-slate-400 font-medium">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"} {' '}
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setIsReset(false); }}
                  className="text-primary font-bold hover:text-primary-hover transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Register now'}
                </button>
              </p>
            </div>

            <div className="pt-12 text-center">
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Powered by Gemini AI Intelligence</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: any) {
  return (
    <div className="flex items-center space-x-4">
      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="font-bold text-sm text-slate-300">{text}</span>
    </div>
  );
}
