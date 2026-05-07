import React from 'react';
import { motion } from 'motion/react';

const BackgroundAnimation: React.FC = React.memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#020617]">
      {/* Dynamic Multi-Color Mesh Overlay */}
      <motion.div 
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 100%, rgba(217, 70, 239, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 100%, rgba(245, 158, 11, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
          ]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-40 mix-blend-plus-lighter"
      />

      {/* Energetic Multi-Color Orbs */}
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
          x: [0, 80, 0],
          y: [0, -50, 0],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[-15%] w-[80vw] h-[80vw] bg-blue-600/40 rounded-full blur-[140px] mix-blend-screen"
      />
      
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.35, 0.65, 0.35],
          x: [0, -100, 0],
          y: [0, 80, 0],
          rotate: [0, -90, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[75vw] h-[75vw] bg-fuchsia-600/35 rounded-full blur-[170px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.8, 1.25, 0.8],
          opacity: [0.3, 0.6, 0.3],
          x: [150, -150, 150],
          y: [-50, 50, -50],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[20%] right-[5%] w-[65vw] h-[65vw] bg-emerald-500/30 rounded-full blur-[130px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
          y: [120, -120, 120],
          x: [-50, 50, -50],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute bottom-[20%] left-[5%] w-[60vw] h-[60vw] bg-violet-600/30 rounded-full blur-[150px] mix-blend-screen"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [0.7, 1.6, 0.7],
          opacity: [0, 0.45, 0],
          x: [100, -100, 100],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[40%] left-[35%] w-[50vw] h-[50vw] bg-amber-500/25 rounded-full blur-[120px] mix-blend-screen"
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
