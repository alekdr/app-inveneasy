import React from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'

interface RubberButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const RubberButton: React.FC<RubberButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-colors cursor-pointer select-none focus:outline-none'

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3.5 text-base gap-2.5',
  }[size]

  const variantClasses = {
    primary:
      'bg-violet-600 text-white shadow-md shadow-violet-500/25 hover:bg-violet-700 active:bg-violet-800',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    danger:
      'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400',
    ghost:
      'bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400',
  }[variant]

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
