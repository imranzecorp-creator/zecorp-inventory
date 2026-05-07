import React from 'react';
import { motion } from 'motion/react';

const BackgroundAnimation: React.FC = React.memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#020617]">
      {/* Dynamic Multi-Color Mesh Overlay */}
      <motion.div 
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.25) 0%, transparent 60%)',
            'radial-gradient(circle at 100% 100%, rgba(217, 70, 239, 0.25) 0%, transparent 60%)',
            'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.25) 0%, transparent 60%)',
            'radial-gradient(circle at 0% 100%, rgba(249, 115, 22, 0.25) 0%, transparent 60%)',
            'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.2) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.25) 0%, transparent 60%)',
          ]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-50 mix-blend-plus-lighter"
      />

      {/* Energetic Multi-Color Orbs */}
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.5, 0.8, 0.5],
          x: [0, 100, 0],
          y: [0, -70, 0],
          rotate: [0, 180, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-20%] w-[90vw] h-[90vw] bg-blue-500/40 rounded-full blur-[150px] mix-blend-screen"
      />
      
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.4, 0.7, 0.4],
          x: [0, -120, 0],
          y: [0, 100, 0],
          rotate: [0, -180, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-25%] right-[-15%] w-[85vw] h-[85vw] bg-fuchsia-500/35 rounded-full blur-[180px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.8, 1.35, 0.8],
          opacity: [0.35, 0.65, 0.35],
          x: [180, -180, 180],
          y: [-70, 70, -70],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[15%] right-[0%] w-[70vw] h-[70vw] bg-emerald-400/30 rounded-full blur-[140px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.6, 1],
          opacity: [0.25, 0.55, 0.25],
          y: [150, -150, 150],
          x: [-70, 70, -70],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[15%] left-[0%] w-[65vw] h-[65vw] bg-violet-500/30 rounded-full blur-[160px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.7, 1.8, 0.7],
          opacity: [0, 0.5, 0],
          x: [120, -120, 120],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[35%] left-[30%] w-[55vw] h-[55vw] bg-orange-500/25 rounded-full blur-[130px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.6, 1.4, 0.6],
          opacity: [0, 0.4, 0],
          y: [-150, 150, -150],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[10%] left-[10%] w-[45vw] h-[45vw] bg-cyan-400/25 rounded-full blur-[100px] mix-blend-screen"
      />

      {/* Dynamic Grid Flow */}
      <div 
        className="absolute inset-0 opacity-[0.05]" 
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Floating ZECORP Text - Ultra Subtle */}
      <div className="absolute inset-0 opacity-[0.01] pointer-events-none">
        <motion.div
          animate={{ x: ['-20%', '20%'] }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="text-[40vw] font-black uppercase tracking-tighter"
        >
          ZECORP
        </motion.div>
      </div>
      
      {/* Scanning Line - Ultra Subtle */}
      <motion.div
        animate={{ top: ['-10%', '110%'] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
      />
    </div>
  );
});

export default BackgroundAnimation;
