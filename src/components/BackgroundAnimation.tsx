import React from 'react';
import { motion } from 'motion/react';

const BackgroundAnimation: React.FC = React.memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#020617]">
      {/* Dynamic Multi-Color Mesh Overlay */}
      <motion.div 
        animate={{
          background: [
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
            'radial-gradient(circle at 100% 100%, rgba(217, 70, 239, 0.15) 0%, transparent 60%)',
            'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
          ]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-50"
      />

      {/* Simplified Energetic Orbs */}
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-500/20 rounded-full blur-[100px]"
      />
      
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          x: [0, -60, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-500/15 rounded-full blur-[120px]"
      />

      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          x: [40, -40, 40],
          y: [-20, 20, -20],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[10%] right-[5%] w-[40vw] h-[40vw] bg-emerald-400/15 rounded-full blur-[100px]"
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
