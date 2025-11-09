'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface OrganicCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function OrganicCard({ children, delay = 0, className = '' }: OrganicCardProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 1,
        delay,
      }}
      whileHover={{
        y: -5,
        rotate: 0.5,
        transition: { type: "spring", stiffness: 300 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
