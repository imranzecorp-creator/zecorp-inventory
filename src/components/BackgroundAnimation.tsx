import React, { memo } from 'react';
import { motion } from 'framer-motion';

const BackgroundAnimation: React.FC = memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#020617]">
      {/* High-Energy Color Orbs */}
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[10%] w-[70vw] h-[70vw] bg-cyan-400/30 rounded-full blur-[160px]"
      />
      
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -50, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -bottom-[20%] -right-[10%] w-[65vw] h-[65vw] bg-fuchsia-500/30 rounded-full blur-[180px]"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.8, 1.3, 0.8],
          opacity: [0.1, 0.3, 0.1],
          y: [-100, 100, -100],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[20%] right-[5%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[140px]"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.5, 1.2, 0.5],
          opacity: [0, 0.2, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[30%] left-[10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[120px]"
      />

      {/* Grid Flow */}
      <div 
        className="absolute inset-0 opacity-[0.15]" 
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
        }}
      />

      {/* Floating ZECORP Text - Top */}
      <div className="absolute top-[15%] left-0 w-full opacity-[0.02]">
        <motion.div
          style={{ willChange: 'transform' }}
          animate={{ x: ['-50%', '50%'] }}
          transition={{
            duration: 90,
            repeat: Infinity,
            ease: "linear"
          }}
          className="flex whitespace-nowrap"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="text-[15vw] font-black uppercase tracking-[-0.05em] px-20">
              ZECORP
            </span>
          ))}
        </motion.div>
      </div>

      {/* Floating ZECORP Text - Bottom (Reverse) */}
      <div className="absolute bottom-[15%] left-0 w-full opacity-[0.02]">
        <motion.div
          style={{ willChange: 'transform' }}
          animate={{ x: ['50%', '-50%'] }}
          transition={{
            duration: 110,
            repeat: Infinity,
            ease: "linear"
          }}
          className="flex whitespace-nowrap"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="text-[20vw] font-black uppercase tracking-[-0.05em] px-20">
              ZECORP
            </span>
          ))}
        </motion.div>
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.1]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Scanning Line - Ultra Vibrant */}
      <motion.div
        animate={{ top: ['-10%', '110%'] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-[4px]"
      />
      <motion.div
        animate={{ top: ['-10%', '110%'] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
          delay: 4
        }}
        className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent blur-[2px]"
      />
    </div>
  );
});

export default BackgroundAnimation;
