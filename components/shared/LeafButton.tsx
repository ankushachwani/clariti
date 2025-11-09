'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface LeafButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export default function LeafButton({ 
  children, 
  onClick, 
  disabled = false,
  className = '',
  type = 'button'
}: LeafButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileHover={{ 
        scale: 1.05,
        y: -2,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
      whileTap={{ scale: 0.95 }}
      animate={{
        rotate: [0, 2, -2, 0],
        transition: { 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      {children}
    </motion.button>
  );
}
