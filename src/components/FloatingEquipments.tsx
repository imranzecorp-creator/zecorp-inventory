import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame, 
  Thermometer, 
  Waves, 
  RotateCcw, 
  Box, 
  Grid3X3, 
  Zap,
  Wind
} from 'lucide-react';

interface EquipmentItem {
  icon: React.ElementType;
  label: string;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
}

const equipments: EquipmentItem[] = [
  { icon: Thermometer, label: 'REFRIGERATOR', initialX: 10, initialY: 20, duration: 40, delay: 0 },
  { icon: Flame, label: 'OVEN', initialX: 80, initialY: 15, duration: 35, delay: 5 },
  { icon: Waves, label: 'FRYER', initialX: 30, initialY: 85, duration: 45, delay: 2 },
  { icon: RotateCcw, label: 'MIXER', initialX: 70, initialY: 70, duration: 50, delay: 10 },
  { icon: Grid3X3, label: 'COOLER', initialX: 50, initialY: 40, duration: 55, delay: 8 },
  { icon: Zap, label: 'POWER GRID', initialX: 15, initialY: 60, duration: 30, delay: 12 },
  { icon: Wind, label: 'VENTILATION', initialX: 90, initialY: 50, duration: 42, delay: 4 },
];

export const FloatingEquipments: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-20">
      {equipments.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ 
            x: `${item.initialX}vw`, 
            y: `${item.initialY}vh`, 
            opacity: 0,
            rotate: 0 
          }}
          animate={{
            x: [
              `${item.initialX}vw`, 
              `${(item.initialX + 20) % 100}vw`, 
              `${(item.initialX - 10 + 100) % 100}vw`, 
              `${item.initialX}vw`
            ],
            y: [
              `${item.initialY}vh`, 
              `${(item.initialY - 15 + 100) % 100}vh`, 
              `${(item.initialY + 25) % 100}vh`, 
              `${item.initialY}vh`
            ],
            opacity: [0.1, 0.3, 0.1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: "linear"
          }}
          className="absolute flex flex-col items-center group gpu-accelerated"
        >
          <div className="p-4 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-[2px]">
            <item.icon className="w-12 h-12 text-primary/40 stroke-[1]" />
          </div>
          <span className="mt-2 text-[8px] font-black text-primary/20 tracking-[0.3em] uppercase whitespace-nowrap">
            {item.label}
          </span>
          
          {/* Decorative lines */}
          <div className="absolute -inset-2 border border-primary/5 rounded-full animate-ping-slow pointer-events-none" />
        </motion.div>
      ))}
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e910_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e910_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
};
