import React, { useState } from 'react';
import { Languages, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VOICE_LANGUAGES, VoiceLanguage } from '../hooks/useVoiceSearch';
import { cn } from '../lib/utils';

interface VoiceLanguageSelectorProps {
  currentLang: VoiceLanguage;
  onLangChange: (lang: VoiceLanguage) => void;
  className?: string;
}

export function VoiceLanguageSelector({ currentLang, onLangChange, className }: VoiceLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLang = VOICE_LANGUAGES.find(l => l.code === currentLang) || VOICE_LANGUAGES[0];

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-bold text-slate-400 uppercase tracking-wider"
      >
        <Languages className="w-3 h-3" />
        <span>{selectedLang.label.slice(0, 3)}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-2 w-32 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden backdrop-blur-xl"
            >
              <div className="p-1">
                {VOICE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLangChange(lang.code);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-[11px] font-medium rounded-lg transition-colors flex items-center justify-between",
                      currentLang === lang.code 
                        ? "bg-primary/20 text-primary" 
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {lang.label}
                    {currentLang === lang.code && (
                      <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
