import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Box } from 'lucide-react';
import { cn } from '../lib/utils';

export default memo(function AmbientStorageBox() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Intense Energetic Orbs - Brighter and More Saturated */}
      <motion.div
        animate={{
          x: [0, 400, 200, 600, 0],
          y: [0, 200, 500, 100, 0],
          scale: [1, 1.5, 0.8, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-60 -left-60 w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full mix-blend-screen"
      />

      <motion.div
        animate={{
          x: [800, 200, 500, 100, 800],
          y: [600, 100, 300, 600, 600],
          scale: [0.8, 1.2, 0.6, 1.1, 0.8],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -bottom-60 -right-60 w-[700px] h-[700px] bg-fuchsia-500/20 blur-[130px] rounded-full mix-blend-plus-lighter"
      />

      <motion.div
        animate={{
          x: [200, 800, 400, 200],
          y: [400, 0, 800, 400],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-300/30 blur-[160px] rounded-full mix-blend-screen"
      />

      <motion.div
        animate={{
          x: [800, 0, 400, 800],
          y: [0, 800, 200, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-1/4 left-1/4 w-[450px] h-[450px] bg-emerald-400/25 blur-[140px] rounded-full mix-blend-screen"
      />

      {/* Floating Energetic Boxes */}
      <MovingBox color="text-blue-400" delay={0} duration={35} size={32} />
      <MovingBox color="text-fuchsia-400" delay={5} duration={45} size={24} />
      <MovingBox color="text-cyan-400" delay={10} duration={40} size={40} />
      <MovingBox color="text-emerald-400" delay={15} duration={50} size={28} />

      {/* Grid Pattern Overlay for Tech Feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px' 
        }}
      ></div>
    </div>
  );
});

const MovingBox = memo(({ color, delay, duration, size }: { color: string, delay: number, duration: number, size: number }) => {
  return (
    <motion.div
      initial={{ 
        x: Math.random() * 1000, 
        y: Math.random() * 800, 
        opacity: 0,
        rotate: 0 
      }}
      animate={{
        x: [
          Math.random() * 1200, 
          Math.random() * 1200, 
          Math.random() * 1200, 
          Math.random() * 1200
        ],
        y: [
          Math.random() * 800, 
          Math.random() * 800, 
          Math.random() * 800, 
          Math.random() * 800
        ],
        opacity: [0, 0.4, 0.4, 0],
        rotate: [0, 180, 360, 540],
        scale: [1, 1.2, 0.8, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear"
      }}
      className="absolute"
    >
      <div className="relative group">
        <Box 
          style={{ width: size, height: size }} 
          className={cn(color, "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]")}
        />
        <div className={cn(
          "absolute inset-0 blur-xl opacity-20 group-hover:opacity-100 transition-opacity rounded-full",
          color.replace('text-', 'bg-')
        )} />
      </div>
    </motion.div>
  );
});
