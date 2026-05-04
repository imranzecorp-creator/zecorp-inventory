import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
}

export default function Logo({ className, variant = 'full' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div className={cn("relative w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden", className)}>
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-red-700 leading-none">Z</span>
          <div className="w-4 h-0.5 bg-white/20 my-0.5" />
          <span className="text-[6px] font-black text-white leading-none">S</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center">
        <span className="text-3xl font-black tracking-tighter text-red-700 uppercase">ZE</span>
        <span className="text-3xl font-black tracking-tighter text-red-700 uppercase">CORP</span>
      </div>
      <div className="w-full h-[1.5px] bg-white/20 mt-1 mb-1" />
      <div className="flex justify-between w-full px-0.5">
        {"SOLUTIONS".split("").map((char, i) => (
          <span key={i} className="text-[9px] font-black text-slate-200 uppercase tracking-widest leading-none">
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
