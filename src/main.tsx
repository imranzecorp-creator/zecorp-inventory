import React, {StrictMode, Component, ErrorInfo, ReactNode, memo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Critical fix for internal ReferenceError in motion/react v12
(window as any).memo = memo;

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full glass-morphism p-8 rounded-3xl border border-red-500/20 shadow-2xl">
            <h1 className="text-2xl font-black uppercase tracking-tight text-red-500 mb-4">Critical System Error</h1>
            <p className="text-slate-400 mb-6 font-medium">The application failed to initialize properly. Error details below:</p>
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 font-mono text-xs overflow-auto max-h-64 mb-6">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all"
            >
              Restart System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
