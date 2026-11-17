import React from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

interface SpringCheckProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'md'
}

export const SpringCheck: React.FC<SpringCheckProps> = ({
  checked,
  onChange,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const iconSize = size === 'sm' ? 12 : 15

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={() => onChange(!checked)}
      className={`relative flex items-center justify-center rounded-lg border-2 transition-colors select-none ${sizeClasses} ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-slate-300 bg-transparent hover:border-violet-500 dark:border-slate-600'
      }`}
    >
      <motion.div
        initial={false}
        animate={{ scale: checked ? 1 : 0, rotate: checked ? 0 : -45 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <Check size={iconSize} strokeWidth={3.5} />
      </motion.div>
    </motion.button>
  )
}
