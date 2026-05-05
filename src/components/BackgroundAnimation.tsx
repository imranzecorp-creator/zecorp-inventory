import React, { memo } from 'react';
import { motion } from 'framer-motion';

const BackgroundAnimation: React.FC = memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#0f172a]">
      {/* Dynamic Gradient Orbs */}
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px]"
      />
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -80, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[120px]"
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
      
      {/* Scanning Line */}
      <motion.div
        animate={{ top: ['-10%', '110%'] }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-[2px]"
      />
    </div>
  );
});

export default BackgroundAnimation;
