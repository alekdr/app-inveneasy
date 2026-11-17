import React from 'react'
import { motion, type HTMLMotionProps } from 'motion/react'

interface TiltCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  glowColor?: string
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
      whileTap={{ scale: 0.98 }}
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-violet-500/5 dark:border-slate-800/80 dark:bg-slate-900/80 ${className}`}
      {...props}
    >
      {/* Luz ambiente de fondo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-violet-500/15" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
